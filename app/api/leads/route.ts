import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
    empresa?: unknown; // Honeypot anti-bots
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
  }

  // Si el honeypot oculto viene lleno, respondemos éxito silencioso
  if (typeof body.empresa === 'string' && body.empresa.trim() !== '') {
    return NextResponse.json({ ok: true });
  }

  const nombre = typeof body.nombre === 'string' ? body.nombre.trim() : '';
  const telefono = typeof body.telefono === 'string' ? body.telefono.trim() : '';
  const objetivo = typeof body.objetivo === 'string' ? body.objetivo.trim() : '';
  const horario = typeof body.horario === 'string' ? body.horario.trim() : '';

  if (nombre.length < 2 || telefono.length < 6 || !objetivo || !horario) {
    return NextResponse.json(
      { error: 'Completa tu nombre, teléfono/WhatsApp, objetivo y horario preferido.' },
      { status: 400 }
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (url && key) {
    const client = createClient(url, key, { auth: { persistSession: false } });
    const { data: gym } = await client
      .from('gyms')
      .select('id')
      .eq('activo', true)
      .limit(1)
      .maybeSingle();

    if (gym?.id) {
      // Si la tabla leads ya fue creada en Supabase, guarda el registro
      await client.from('leads').insert({
        gym_id: gym.id,
        nombre,
        telefono,
        objetivo,
        horario_preferido: horario,
      });
    }
  }

  return NextResponse.json({ ok: true });
}
