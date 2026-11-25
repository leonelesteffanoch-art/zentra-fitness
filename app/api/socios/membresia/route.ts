import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function crearServiceClient(token?: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const key = serviceKey || anonKey;
  if (!url || !key) {
    throw new Error('Falta configurar las credenciales de Supabase en el servidor.');
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    ...(!serviceKey && token
      ? { global: { headers: { Authorization: `Bearer ${token}` } } }
      : {}),
  });
}

function esFechaISO(v: unknown): v is string {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

/**
 * PATCH /api/socios/membresia
 * Corrige plan, fechas y/o saldo pendiente de una membresía ACTIVA sin modificar los pagos ya registrados en caja.
 */
export async function PATCH(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') ?? '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    if (!token) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const client = crearServiceClient(token);
    const { data: userRes, error: authErr } = await client.auth.getUser(token);
    if (authErr || !userRes?.user) {
      return NextResponse.json({ error: 'Sesión inválida o expirada' }, { status: 401 });
    }

    const { data: perfil } = await client
      .from('perfiles')
      .select('id, gym_id, rol, activo')
      .eq('id', userRes.user.id)
      .eq('activo', true)
      .maybeSingle();

    if (!perfil) {
      return NextResponse.json({ error: 'Personal no autorizado' }, { status: 403 });
    }

    const body = (await req.json()) as {
      membresiaId?: unknown;
      planId?: unknown;
      fechaInicio?: unknown;
      fechaFin?: unknown;
      saldoPendiente?: unknown;
    };

    const membresiaId = typeof body.membresiaId === 'string' ? body.membresiaId.trim() : '';
    const planId = typeof body.planId === 'string' ? body.planId.trim() : '';
    const fechaInicio = body.fechaInicio;
    const fechaFin = body.fechaFin;
    const saldoNum = Number(body.saldoPendiente ?? 0);

    if (!membresiaId || !planId) {
      return NextResponse.json({ error: 'Membresía y plan son obligatorios' }, { status: 400 });
    }
    if (!esFechaISO(fechaInicio) || !esFechaISO(fechaFin) || fechaFin < fechaInicio) {
      return NextResponse.json(
        { error: 'Las fechas de inicio y vencimiento no son válidas' },
        { status: 400 }
      );
    }
    if (!Number.isFinite(saldoNum) || saldoNum < 0) {
      return NextResponse.json(
        { error: 'El saldo pendiente debe ser 0 o un monto positivo' },
        { status: 400 }
      );
    }

    const { data: planValido } = await client
      .from('planes')
      .select('id')
      .eq('id', planId)
      .eq('gym_id', perfil.gym_id)
      .maybeSingle();

    if (!planValido) {
      return NextResponse.json({ error: 'El plan seleccionado no pertenece al gimnasio' }, { status: 400 });
    }

    const { data: actual, error: readErr } = await client
      .from('v_membresias_estado')
      .select('membresia_id, gym_id, estado, monto_pagado')
      .eq('membresia_id', membresiaId)
      .eq('gym_id', perfil.gym_id)
      .maybeSingle();

    if (readErr) {
      return NextResponse.json({ error: readErr.message }, { status: 400 });
    }
    if (!actual) {
      return NextResponse.json({ error: 'Membresía no encontrada en este gimnasio' }, { status: 404 });
    }
    if (actual.estado !== 'ACTIVO') {
      return NextResponse.json(
        { error: 'No se puede editar una membresía anulada' },
        { status: 400 }
      );
    }

    const montoPagado = Math.max(0, Number(actual.monto_pagado ?? 0));
    const saldo = Math.max(0, Math.round(saldoNum * 100) / 100);
    const nuevoPrecioTotal = Math.round((montoPagado + saldo) * 100) / 100;

    const { error: updErr } = await client
      .from('membresias')
      .update({
        plan_id: planId,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        precio_total: nuevoPrecioTotal,
      })
      .eq('id', membresiaId)
      .eq('gym_id', perfil.gym_id)
      .eq('estado', 'ACTIVO');

    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      membresiaId,
      precioTotal: nuevoPrecioTotal,
      saldoPendiente: saldo,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error interno al editar membresía' },
      { status: 500 }
    );
  }
}
