import { supabase } from '@/lib/supabase';
import type { Asistencia, SocioEstado } from '@/types';

/**
 * Check-in (1 por socio y día). Devuelve el estado con semáforo
 * calculado en la BD en el mismo momento del registro.
 */
export async function registrarAsistencia(socioId: string): Promise<SocioEstado> {
  const { data, error } = await supabase.rpc('registrar_asistencia', { p_socio_id: socioId });
  if (error) throw new Error(error.message);
  return data as SocioEstado;
}

/** Cantidad de asistencias del mes actual (consulta de solo conteo, sin filas). */
export async function contarAsistenciasMes(socioId: string): Promise<number> {
  const inicio = new Date();
  inicio.setDate(1);
  const desde = inicio.toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
  const { count, error } = await supabase
    .from('asistencias')
    .select('id', { count: 'exact', head: true })
    .eq('socio_id', socioId)
    .gte('fecha', desde);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

/** Últimas asistencias de un socio (máx. 20). */
export async function ultimasAsistencias(socioId: string): Promise<Asistencia[]> {
  const { data, error } = await supabase
    .from('asistencias')
    .select('id, fecha, hora, semaforo')
    .eq('socio_id', socioId)
    .order('fecha', { ascending: false })
    .limit(20);
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as Asistencia[];
}

export interface AsistenciaHoyDetalle {
  id: string;
  socio_id: string;
  fecha: string;
  hora: string;
  semaforo: 'VERDE' | 'AMBAR' | 'ROJO';
  socios: {
    dni: string;
    nombres: string;
    apellidos: string;
  } | null;
}

/** Asistencias de hoy del gimnasio (máx. 50), para el panel de recepción. */
export async function asistenciasDeHoy(gymId: string): Promise<Asistencia[]> {
  const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
  const { data, error } = await supabase
    .from('asistencias')
    .select('id, socio_id, fecha, hora, semaforo')
    .eq('gym_id', gymId)
    .eq('fecha', hoy)
    .order('hora', { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as Asistencia[];
}

/** Asistencias de hoy con datos del socio para el feed en vivo de recepción. */
export async function asistenciasDeHoyDetalladas(gymId: string): Promise<AsistenciaHoyDetalle[]> {
  const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
  const { data, error } = await supabase
    .from('asistencias')
    .select('id, socio_id, fecha, hora, semaforo, socios(dni, nombres, apellidos)')
    .eq('gym_id', gymId)
    .eq('fecha', hoy)
    .order('hora', { ascending: false })
    .limit(40);
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as AsistenciaHoyDetalle[];
}
