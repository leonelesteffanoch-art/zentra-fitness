import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { ConsultaSocioResultado } from '@/types';

const VENTANA_MS = 60_000;
const MAX_PETICIONES = 10;
const registroIp = new Map<string, { conteo: number; expira: number }>();

function verificarRateLimit(ip: string): boolean {
  const ahora = Date.now();
  const actual = registroIp.get(ip);
  if (!actual || ahora > actual.expira) {
    registroIp.set(ip, { conteo: 1, expira: ahora + VENTANA_MS });
    return true;
  }
  if (actual.conteo >= MAX_PETICIONES) return false;
  actual.conteo += 1;
  return true;
}

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'local';

  if (!verificarRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Demasiadas consultas seguidas. Espera un minuto e inténtalo de nuevo.' },
      { status: 429 }
    );
  }

  let body: { dni?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 });
  }

  const dni = typeof body.dni === 'string' ? body.dni.trim() : '';
  if (!/^\d{7,12}$/.test(dni)) {
    return NextResponse.json(
      { error: 'Ingresa un número de DNI válido (7 a 12 dígitos)' },
      { status: 400 }
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !serviceKey) {
    return NextResponse.json({ error: 'Error de configuración del servidor' }, { status: 500 });
  }

  const adminClient = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });

  // 1. Obtener el gimnasio principal
  const { data: gym } = await adminClient
    .from('gyms')
    .select('id')
    .eq('activo', true)
    .limit(1)
    .maybeSingle();

  if (!gym?.id) {
    return NextResponse.json({ error: 'Gimnasio no disponible' }, { status: 404 });
  }

  // 2. Intentar primero mediante el RPC consulta_socio (si se usa service_role)
  const { data: rpcData, error: rpcError } = await adminClient.rpc('consulta_socio', {
    p_dni: dni,
    p_gym_id: gym.id,
  });

  if (!rpcError && rpcData) {
    return NextResponse.json(rpcData as ConsultaSocioResultado);
  }

  // 3. Fallback directo sobre v_socio_estado + conteo de asistencias del mes
  const { data: socio } = await adminClient
    .from('v_socio_estado')
    .select('socio_id, nombres, plan, fecha_fin, dias_restantes, saldo_pendiente, semaforo')
    .eq('gym_id', gym.id)
    .eq('dni', dni)
    .maybeSingle();

  if (!socio) {
    return NextResponse.json(
      { error: 'No encontramos una membresía asociada a ese DNI.' },
      { status: 404 }
    );
  }

  const inicioMes = new Date();
  inicioMes.setDate(1);
  const desdeMes = inicioMes.toLocaleDateString('en-CA', { timeZone: 'America/Lima' });

  const { count } = await adminClient
    .from('asistencias')
    .select('id', { count: 'exact', head: true })
    .eq('socio_id', socio.socio_id)
    .gte('fecha', desdeMes);

  const respuesta: ConsultaSocioResultado = {
    nombres: socio.nombres,
    plan: socio.plan,
    fecha_fin: socio.fecha_fin,
    dias_restantes: socio.dias_restantes,
    saldo_pendiente: Number(socio.saldo_pendiente) || 0,
    semaforo: socio.semaforo,
    asistencias_mes: count ?? 0,
  };

  return NextResponse.json(respuesta);
}
