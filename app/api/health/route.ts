import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * Keep-Alive para el plan gratuito de Supabase.
 * Hace una consulta mínima (1 fila, 1 columna) cada 3 días desde el Cron de Vercel.
 */
export async function GET() {
  const { data, error } = await supabase
    .from('gyms')
    .select('id')
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    gym: Boolean(data?.id),
    timestamp: new Date().toISOString(),
  });
}
