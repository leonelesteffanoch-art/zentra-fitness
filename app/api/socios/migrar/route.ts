import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function crearServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error('Falta configurar SUPABASE_SERVICE_ROLE_KEY en el servidor.');
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function verificarStaff(req: NextRequest) {
  const authHeader = req.headers.get('authorization') ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token) return { error: 'No autenticado', status: 401 as const };

  const client = crearServiceClient();
  const { data: userRes, error: authErr } = await client.auth.getUser(token);
  if (authErr || !userRes?.user) {
    return { error: 'Sesión inválida o expirada', status: 401 as const };
  }

  const { data: perfil } = await client
    .from('perfiles')
    .select('id, gym_id, nombre, rol, activo')
    .eq('id', userRes.user.id)
    .eq('activo', true)
    .maybeSingle();

  if (!perfil) {
    return { error: 'Personal no autorizado', status: 403 as const };
  }

  return { client, perfil };
}

function esFechaISO(v: unknown): v is string {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

interface RegistroLoteInput {
  dni?: unknown;
  nombres?: unknown;
  apellidos?: unknown;
  telefono?: unknown;
  planId?: unknown;
  fechaInicio?: unknown;
  fechaFin?: unknown;
  saldoPendiente?: unknown;
}

/**
 * POST /api/socios/migrar
 * Registra membresías históricas o importadas desde Excel sin alterar la caja chica del turno actual.
 * El precio_total se registra igual al saldoPendiente (0 si ya fue cancelado antes de usar Zentra).
 */
export async function POST(req: NextRequest) {
  try {
    const verif = await verificarStaff(req);
    if ('error' in verif) {
      return NextResponse.json({ error: verif.error }, { status: verif.status });
    }
    const { client, perfil } = verif;

    const body = (await req.json()) as {
      modo?: 'individual' | 'lote';
      socioId?: string;
      planId?: string;
      fechaInicio?: string;
      fechaFin?: string;
      saldoPendiente?: number;
      registros?: RegistroLoteInput[];
    };

    // Cargar planes válidos del gimnasio una sola vez
    const { data: planesGym, error: planesErr } = await client
      .from('planes')
      .select('id')
      .eq('gym_id', perfil.gym_id);

    if (planesErr) {
      return NextResponse.json({ error: planesErr.message }, { status: 400 });
    }
    const planesValidos = new Set((planesGym ?? []).map((p) => p.id as string));

    // --- MODO 1: Asignación individual desde QuickPaymentModal ---
    if (body.modo === 'individual') {
      const { socioId, planId, fechaInicio, fechaFin } = body;
      const saldo = Math.max(0, Math.round((Number(body.saldoPendiente) || 0) * 100) / 100);

      if (!socioId || !planId || !planesValidos.has(planId)) {
        return NextResponse.json({ error: 'Socio o plan inválido' }, { status: 400 });
      }
      if (!esFechaISO(fechaInicio) || !esFechaISO(fechaFin) || fechaFin < fechaInicio) {
        return NextResponse.json(
          { error: 'Las fechas de inicio y fin no son válidas' },
          { status: 400 }
        );
      }

      const { data: socio } = await client
        .from('socios')
        .select('id')
        .eq('id', socioId)
        .eq('gym_id', perfil.gym_id)
        .maybeSingle();

      if (!socio) {
        return NextResponse.json({ error: 'Socio no encontrado en este gimnasio' }, { status: 404 });
      }

      const { data: insertada, error: memErr } = await client
        .from('membresias')
        .insert({
          gym_id: perfil.gym_id,
          socio_id: socioId,
          plan_id: planId,
          fecha_inicio: fechaInicio,
          fecha_fin: fechaFin,
          precio_total: saldo,
          estado: 'ACTIVO',
          created_by: perfil.id,
        })
        .select('id')
        .single();

      if (memErr) {
        return NextResponse.json({ error: memErr.message }, { status: 400 });
      }

      return NextResponse.json({ ok: true, membresiaId: insertada.id });
    }

    // --- MODO 2: Importación en lote desde Excel ---
    if (!Array.isArray(body.registros) || body.registros.length === 0) {
      return NextResponse.json(
        { error: 'No se recibieron registros para importar' },
        { status: 400 }
      );
    }

    if (body.registros.length > 500) {
      return NextResponse.json(
        { error: 'Máximo 500 registros por lote. Divide el archivo en partes más pequeñas.' },
        { status: 400 }
      );
    }

    const errores: string[] = [];
    const limpios: Array<{
      fila: number;
      dni: string;
      nombres: string;
      apellidos: string;
      telefono: string | null;
      planId: string;
      fechaInicio: string;
      fechaFin: string;
      saldo: number;
    }> = [];

    body.registros.forEach((raw, idx) => {
      const fila = idx + 1;
      const dni = typeof raw.dni === 'string' ? raw.dni.replace(/\D/g, '') : '';
      const nombres = typeof raw.nombres === 'string' ? raw.nombres.trim() : '';
      const apellidos = typeof raw.apellidos === 'string' ? raw.apellidos.trim() : '';
      const telefono =
        typeof raw.telefono === 'string' && raw.telefono.trim() ? raw.telefono.trim() : null;
      const planId = typeof raw.planId === 'string' ? raw.planId : '';
      const fechaInicio = raw.fechaInicio;
      const fechaFin = raw.fechaFin;
      const saldo = Math.max(0, Math.round((Number(raw.saldoPendiente) || 0) * 100) / 100);

      if (!/^\d{7,12}$/.test(dni)) {
        errores.push(`Fila ${fila}: DNI inválido (${String(raw.dni ?? '')})`);
        return;
      }
      if (!nombres || !apellidos) {
        errores.push(`Fila ${fila} (DNI ${dni}): faltan nombres o apellidos`);
        return;
      }
      if (!planesValidos.has(planId)) {
        errores.push(`Fila ${fila} (DNI ${dni}): plan no válido`);
        return;
      }
      if (!esFechaISO(fechaInicio) || !esFechaISO(fechaFin) || fechaFin < fechaInicio) {
        errores.push(`Fila ${fila} (DNI ${dni}): fechas inválidas (${String(fechaInicio)} - ${String(fechaFin)})`);
        return;
      }

      limpios.push({
        fila,
        dni,
        nombres,
        apellidos,
        telefono,
        planId,
        fechaInicio,
        fechaFin,
        saldo,
      });
    });

    if (limpios.length === 0) {
      return NextResponse.json(
        { error: errores[0] ?? 'No hay filas válidas para importar', errores },
        { status: 400 }
      );
    }

    // Buscar socios existentes por DNI en el gym
    const dnisUnicos = Array.from(new Set(limpios.map((r) => r.dni)));
    const { data: existentes } = await client
      .from('socios')
      .select('id, dni, telefono, activo')
      .eq('gym_id', perfil.gym_id)
      .in('dni', dnisUnicos);

    const mapaSocios = new Map<string, { id: string; telefono: string | null; activo: boolean }>();
    for (const s of existentes ?? []) {
      mapaSocios.set(s.dni as string, {
        id: s.id as string,
        telefono: (s.telefono as string | null) ?? null,
        activo: Boolean(s.activo),
      });
    }

    let sociosCreados = 0;
    let sociosExistentes = 0;

    // Insertar nuevos socios faltantes (deduplicados por DNI dentro del mismo Excel)
    const nuevosPorInsertar: Array<{
      gym_id: string;
      dni: string;
      nombres: string;
      apellidos: string;
      telefono: string | null;
      activo: boolean;
      created_by: string;
    }> = [];
    const dnisEnCola = new Set<string>();

    for (const r of limpios) {
      if (!mapaSocios.has(r.dni) && !dnisEnCola.has(r.dni)) {
        dnisEnCola.add(r.dni);
        nuevosPorInsertar.push({
          gym_id: perfil.gym_id,
          dni: r.dni,
          nombres: r.nombres,
          apellidos: r.apellidos,
          telefono: r.telefono,
          activo: true,
          created_by: perfil.id,
        });
      }
    }

    if (nuevosPorInsertar.length > 0) {
      const { data: insertados, error: insSocErr } = await client
        .from('socios')
        .insert(nuevosPorInsertar)
        .select('id, dni, telefono, activo');

      if (insSocErr) {
        return NextResponse.json({ error: insSocErr.message }, { status: 400 });
      }
      for (const s of insertados ?? []) {
        sociosCreados += 1;
        mapaSocios.set(s.dni as string, {
          id: s.id as string,
          telefono: (s.telefono as string | null) ?? null,
          activo: Boolean(s.activo),
        });
      }
    }

    // Contar existentes y reactivar / completar teléfono si faltaba
    const socioIdsParaMembresias = Array.from(mapaSocios.values()).map((s) => s.id);
    const { data: memsExistentes } = await client
      .from('membresias')
      .select('socio_id, plan_id, fecha_inicio, fecha_fin')
      .eq('gym_id', perfil.gym_id)
      .eq('estado', 'ACTIVO')
      .in('socio_id', socioIdsParaMembresias);

    const firmaMem = (sId: string, pId: string, ini: string, fin: string) =>
      `${sId}|${pId}|${ini}|${fin}`;
    const firmasExistentes = new Set(
      (memsExistentes ?? []).map((m) =>
        firmaMem(
          m.socio_id as string,
          m.plan_id as string,
          m.fecha_inicio as string,
          m.fecha_fin as string
        )
      )
    );

    const existentesVistos = new Set<string>();
    const membresiasAInsertar: Array<{
      gym_id: string;
      socio_id: string;
      plan_id: string;
      fecha_inicio: string;
      fecha_fin: string;
      precio_total: number;
      estado: 'ACTIVO';
      created_by: string;
    }> = [];
    let membresiasOmitidas = 0;

    for (const r of limpios) {
      const soc = mapaSocios.get(r.dni);
      if (!soc) continue;

      if (!dnisEnCola.has(r.dni) && !existentesVistos.has(r.dni)) {
        existentesVistos.add(r.dni);
        sociosExistentes += 1;
        if (!soc.activo || (!soc.telefono && r.telefono)) {
          await client
            .from('socios')
            .update({
              activo: true,
              telefono: soc.telefono ?? r.telefono,
            })
            .eq('id', soc.id);
        }
      }

      const firma = firmaMem(soc.id, r.planId, r.fechaInicio, r.fechaFin);
      if (firmasExistentes.has(firma)) {
        membresiasOmitidas += 1;
        continue;
      }
      firmasExistentes.add(firma);

      membresiasAInsertar.push({
        gym_id: perfil.gym_id,
        socio_id: soc.id,
        plan_id: r.planId,
        fecha_inicio: r.fechaInicio,
        fecha_fin: r.fechaFin,
        precio_total: r.saldo,
        estado: 'ACTIVO',
        created_by: perfil.id,
      });
    }

    if (membresiasAInsertar.length > 0) {
      const { error: memInsErr } = await client.from('membresias').insert(membresiasAInsertar);
      if (memInsErr) {
        return NextResponse.json({ error: memInsErr.message }, { status: 400 });
      }
    }

    return NextResponse.json({
      ok: true,
      sociosCreados,
      sociosExistentes,
      membresiasCreadas: membresiasAInsertar.length,
      membresiasOmitidas,
      errores,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error interno al migrar socios' },
      { status: 500 }
    );
  }
}
