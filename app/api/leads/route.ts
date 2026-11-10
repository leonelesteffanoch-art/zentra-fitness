import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export type EstadoLead = 'NUEVO' | 'CONTACTADO' | 'AGENDADO' | 'INSCRITO' | 'DESCARTADO';

export interface LeadInteresado {
  id: string;
  nombre: string;
  telefono: string;
  objetivo: string;
  horario: string;
  creado_at: string;
  contactado: boolean;
  contactado_at?: string | null;
  estado?: EstadoLead;
  notas?: string;
}

const VENTANA_MS = 60_000;
const MAX_LEADS_MIN = 5;
const registroIp = new Map<string, { conteo: number; expira: number }>();

function permitirIp(ip: string): boolean {
  const ahora = Date.now();
  const actual = registroIp.get(ip);
  if (!actual || ahora > actual.expira) {
    registroIp.set(ip, { conteo: 1, expira: ahora + VENTANA_MS });
    return true;
  }
  if (actual.conteo >= MAX_LEADS_MIN) return false;
  actual.conteo += 1;
  return true;
}

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Configuración de servidor incompleta');
  return createClient(url, key, { auth: { persistSession: false } });
}

async function verificarStaff(req: NextRequest) {
  const authHeader = req.headers.get('authorization') ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token) return null;

  const client = getServiceClient();
  const { data: userRes } = await client.auth.getUser(token);
  if (!userRes?.user) return null;

  const { data: perfil } = await client
    .from('perfiles')
    .select('id, gym_id, nombre, rol, activo')
    .eq('id', userRes.user.id)
    .eq('activo', true)
    .maybeSingle();

  if (!perfil) return null;
  return { client, perfil };
}

/** POST /api/leads -> Guarda un cliente interesado desde el formulario de la Landing. */
export async function POST(req: NextRequest) {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'local';

  if (!permitirIp(ip)) {
    return NextResponse.json(
      { error: 'Demasiados envíos seguidos. Intenta en un minuto.' },
      { status: 429 }
    );
  }

  let body: {
    nombre?: unknown;
    telefono?: unknown;
    objetivo?: unknown;
    horario?: unknown;
    empresa?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
  }

  if (typeof body.empresa === 'string' && body.empresa.trim() !== '') {
    return NextResponse.json({ ok: true });
  }

  const nombre = typeof body.nombre === 'string' ? body.nombre.trim() : '';
  const telefono = typeof body.telefono === 'string' ? body.telefono.trim() : '';
  const objetivo = typeof body.objetivo === 'string' ? body.objetivo.trim() : '';
  const horario = typeof body.horario === 'string' ? body.horario.trim() : '';

  if (nombre.length < 2 || telefono.length < 6 || !objetivo || !horario) {
    return NextResponse.json(
      { error: 'Completa tu nombre, teléfono/WhatsApp, plan de interés y horario.' },
      { status: 400 }
    );
  }

  try {
    const client = getServiceClient();
    const { data: gym } = await client
      .from('gyms')
      .select('id, redes')
      .eq('activo', true)
      .limit(1)
      .maybeSingle();

    if (gym?.id) {
      const nuevoLead: LeadInteresado = {
        id: crypto.randomUUID(),
        nombre,
        telefono,
        objetivo,
        horario,
        creado_at: new Date().toISOString(),
        contactado: false,
        contactado_at: null,
      };

      const redesObj =
        gym.redes && typeof gym.redes === 'object' && !Array.isArray(gym.redes)
          ? (gym.redes as Record<string, unknown>)
          : {};
      const leadsPrevios = Array.isArray(redesObj.leads)
        ? (redesObj.leads as LeadInteresado[])
        : [];

      await client
        .from('gyms')
        .update({
          redes: {
            ...redesObj,
            leads: [nuevoLead, ...leadsPrevios].slice(0, 200),
          },
        })
        .eq('id', gym.id);
    }
  } catch {
    // Fallback silencioso para no bloquear al visitante
  }

  return NextResponse.json({ ok: true });
}

/** GET /api/leads -> Lista los clientes interesados inscritos en la Landing (para Recepción/Admin). */
export async function GET(req: NextRequest) {
  try {
    const verif = await verificarStaff(req);
    if (!verif) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const { client, perfil } = verif;

    const { data: gym } = await client
      .from('gyms')
      .select('redes')
      .eq('id', perfil.gym_id)
      .maybeSingle();

    const redesObj =
      gym?.redes && typeof gym.redes === 'object' && !Array.isArray(gym.redes)
        ? (gym.redes as Record<string, unknown>)
        : {};
    const leads = Array.isArray(redesObj.leads) ? (redesObj.leads as LeadInteresado[]) : [];

    return NextResponse.json({ leads });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error al obtener interesados' },
      { status: 500 }
    );
  }
}

/** PATCH /api/leads -> Marca un interesado como contactado (o pendiente) o lo descarta. */
export async function PATCH(req: NextRequest) {
  try {
    const verif = await verificarStaff(req);
    if (!verif) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const { client, perfil } = verif;

    const body = (await req.json()) as {
      id?: string;
      contactado?: boolean;
      eliminar?: boolean;
      estado?: EstadoLead;
      notas?: string;
    };

    const targetId = (body.id ?? '').trim();
    if (!targetId) {
      return NextResponse.json({ error: 'Falta ID del registro' }, { status: 400 });
    }

    const { data: gym } = await client
      .from('gyms')
      .select('redes')
      .eq('id', perfil.gym_id)
      .maybeSingle();

    const redesObj =
      gym?.redes && typeof gym.redes === 'object' && !Array.isArray(gym.redes)
        ? (gym.redes as Record<string, unknown>)
        : {};
    const leadsPrevios = Array.isArray(redesObj.leads)
      ? (redesObj.leads as LeadInteresado[])
      : [];

    const leadsActualizados = body.eliminar
      ? leadsPrevios.filter((l) => l.id !== targetId)
      : leadsPrevios.map((l) => {
          if (l.id !== targetId) return l;

          const nuevoEstado = body.estado ?? l.estado ?? (l.contactado ? 'CONTACTADO' : 'NUEVO');
          const esContactado =
            typeof body.contactado === 'boolean'
              ? body.contactado
              : nuevoEstado !== 'NUEVO';

          return {
            ...l,
            contactado: esContactado,
            contactado_at: esContactado ? (l.contactado_at || new Date().toISOString()) : null,
            estado: nuevoEstado,
            notas: typeof body.notas === 'string' ? body.notas.trim() : (l.notas ?? ''),
          };
        });

    const { error: updErr } = await client
      .from('gyms')
      .update({
        redes: {
          ...redesObj,
          leads: leadsActualizados,
        },
      })
      .eq('id', perfil.gym_id);

    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, leads: leadsActualizados });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error al actualizar estado' },
      { status: 500 }
    );
  }
}
