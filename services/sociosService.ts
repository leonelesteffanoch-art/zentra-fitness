import { supabase } from '@/lib/supabase';
import type {
  Socio,
  SocioEstado,
  Plan,
  MembresiaEstado,
  PagoInput,
} from '@/types';

const LIMITE_LISTADO = 20;

const COLUMNAS_ESTADO =
  'socio_id, gym_id, dni, nombres, apellidos, foto_url, telefono, membresia_id, plan, fecha_inicio, fecha_fin, dias_restantes, saldo_pendiente, semaforo';

/** Quita caracteres que rompen el filtro .or() de PostgREST y los comodines LIKE. */
function sanitizar(term: string): string {
  return term.replace(/[%_,()*\\]/g, ' ').trim();
}

export type FiltroEstadoSocio = 'todos' | 'activos' | 'por_vencer' | 'vencidos' | 'morosos';

/**
 * Busca socios por DNI (solo dígitos) o por nombre/apellido.
 * 1 sola consulta, máximo 20 filas. Devuelve el estado con semáforo.
 */
export async function buscarSocios(
  gymId: string,
  termino: string,
  filtro: FiltroEstadoSocio = 'todos'
): Promise<SocioEstado[]> {
  const t = sanitizar(termino);
  if (t.length < 2) return [];

  let query = supabase
    .from('v_socio_estado')
    .select(COLUMNAS_ESTADO)
    .eq('gym_id', gymId)
    .limit(LIMITE_LISTADO);

  if (filtro === 'activos') query = query.eq('semaforo', 'VERDE');
  else if (filtro === 'por_vencer') query = query.gte('dias_restantes', 0).lte('dias_restantes', 3);
  else if (filtro === 'vencidos') query = query.eq('semaforo', 'ROJO');
  else if (filtro === 'morosos') query = query.gt('saldo_pendiente', 0);

  if (/^\d+$/.test(t)) {
    query = query.like('dni', `${t}%`);
  } else {
    const p = t.replace(/\s+/g, '%');
    query = query.or(`nombres.ilike.%${p}%,apellidos.ilike.%${p}%`);
  }

  const { data, error } = await query.order('apellidos');
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as SocioEstado[];
}

/** Listado paginado de socios con su estado y semáforo actual. */
export async function listarSociosEstado(
  gymId: string,
  pagina = 0,
  filtro: FiltroEstadoSocio = 'todos'
): Promise<SocioEstado[]> {
  const desde = pagina * LIMITE_LISTADO;
  let query = supabase
    .from('v_socio_estado')
    .select(COLUMNAS_ESTADO)
    .eq('gym_id', gymId);

  if (filtro === 'activos') query = query.eq('semaforo', 'VERDE');
  else if (filtro === 'por_vencer') query = query.gte('dias_restantes', 0).lte('dias_restantes', 3);
  else if (filtro === 'vencidos') query = query.eq('semaforo', 'ROJO');
  else if (filtro === 'morosos') query = query.gt('saldo_pendiente', 0);

  const { data, error } = await query
    .order('apellidos')
    .range(desde, desde + LIMITE_LISTADO - 1);
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as SocioEstado[];
}

/** Obtiene el estado actual de un socio específico por su ID. */
export async function obtenerSocioEstadoPorId(socioId: string): Promise<SocioEstado | null> {
  const { data, error } = await supabase
    .from('v_socio_estado')
    .select(COLUMNAS_ESTADO)
    .eq('socio_id', socioId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as unknown as SocioEstado) ?? null;
}

export interface ResumenPadronSocios {
  total: number;
  activos: number;
  porVencer: number;
  vencidos: number;
  morosos: number;
  deudaTotal: number;
}

/** Resumen global del padrón de socios para los indicadores gráficos de la vista Socios. */
export async function obtenerResumenPadron(gymId: string): Promise<ResumenPadronSocios> {
  const { data, error } = await supabase
    .from('v_socio_estado')
    .select('semaforo, dias_restantes, saldo_pendiente')
    .eq('gym_id', gymId);
  if (error) throw new Error(error.message);

  const filas = (data ?? []) as Array<{
    semaforo: 'VERDE' | 'AMBAR' | 'ROJO';
    dias_restantes: number | null;
    saldo_pendiente: number;
  }>;

  let activos = 0;
  let porVencer = 0;
  let vencidos = 0;
  let morosos = 0;
  let deudaTotal = 0;

  for (const f of filas) {
    if (f.semaforo === 'VERDE') activos += 1;
    else if (f.semaforo === 'ROJO') vencidos += 1;

    if (f.dias_restantes !== null && f.dias_restantes >= 0 && f.dias_restantes <= 3) {
      porVencer += 1;
    }
    const saldo = Number(f.saldo_pendiente ?? 0);
    if (saldo > 0) {
      morosos += 1;
      deudaTotal += saldo;
    }
  }

  return {
    total: filas.length,
    activos,
    porVencer,
    vencidos,
    morosos,
    deudaTotal: Number(deudaTotal.toFixed(2)),
  };
}

/** Listado paginado de socios (admin / pantalla Socios). */
export async function listarSocios(gymId: string, pagina = 0): Promise<Socio[]> {
  const desde = pagina * LIMITE_LISTADO;
  const { data, error } = await supabase
    .from('socios')
    .select('id, gym_id, dni, nombres, apellidos, telefono, email, foto_url, activo, created_at')
    .eq('gym_id', gymId)
    .order('created_at', { ascending: false })
    .range(desde, desde + LIMITE_LISTADO - 1);
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as Socio[];
}

export type NuevoSocio = Pick<Socio, 'dni' | 'nombres' | 'apellidos'> &
  Partial<Pick<Socio, 'telefono' | 'email' | 'fecha_nacimiento' | 'foto_url' | 'observaciones'>>;

export async function crearSocio(gymId: string, createdBy: string, socio: NuevoSocio) {
  const { data, error } = await supabase
    .from('socios')
    .insert({ ...socio, gym_id: gymId, created_by: createdBy })
    .select('id, dni, nombres, apellidos')
    .single();
  if (error) {
    if (error.code === '23505') throw new Error('Ya existe un socio con ese DNI');
    throw new Error(error.message);
  }
  return data;
}

export async function actualizarSocio(
  socioId: string,
  cambios: Partial<Omit<Socio, 'id' | 'gym_id' | 'created_at' | 'created_by'>>
) {
  const { error } = await supabase.from('socios').update(cambios).eq('id', socioId);
  if (error) throw new Error(error.message);
}

// ---------- Planes y membresías ----------

export async function listarPlanes(gymId: string, incluirInactivos = false): Promise<Plan[]> {
  let query = supabase
    .from('planes')
    .select('id, gym_id, nombre, descripcion, duracion_dias, precio, permite_congelar, max_dias_congelar, visible_landing, activo')
    .eq('gym_id', gymId)
    .order('duracion_dias')
    .limit(LIMITE_LISTADO);
  if (!incluirInactivos) query = query.eq('activo', true);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as Plan[];
}

export type DatosPlan = Pick<
  Plan,
  'nombre' | 'duracion_dias' | 'precio' | 'permite_congelar' | 'visible_landing' | 'activo'
> &
  Partial<Pick<Plan, 'descripcion' | 'max_dias_congelar'>>;

export async function crearPlan(gymId: string, plan: DatosPlan) {
  const { error } = await supabase.from('planes').insert({ ...plan, gym_id: gymId });
  if (error) throw new Error(error.message);
}

export async function actualizarPlan(planId: string, cambios: Partial<DatosPlan>) {
  const { error } = await supabase.from('planes').update(cambios).eq('id', planId);
  if (error) throw new Error(error.message);
}

/** Elimina un plan. Si tiene membresías históricas asociadas, se archiva (activo = false) para no romper integridad. */
export async function eliminarPlan(
  planId: string
): Promise<{ eliminado: boolean; archivado: boolean }> {
  const { error } = await supabase.from('planes').delete().eq('id', planId);
  if (!error) {
    return { eliminado: true, archivado: false };
  }
  const { error: updErr } = await supabase
    .from('planes')
    .update({ activo: false, visible_landing: false })
    .eq('id', planId);
  if (updErr) throw new Error(updErr.message);
  return { eliminado: false, archivado: true };
}

/** Historial de membresías de un socio (con pagado y saldo). */
export async function membresiasDeSocio(socioId: string): Promise<MembresiaEstado[]> {
  const { data, error } = await supabase
    .from('v_membresias_estado')
    .select('membresia_id, gym_id, socio_id, plan_id, plan, fecha_inicio, fecha_fin, dias_congelados, precio_total, estado, monto_pagado, saldo_pendiente, dias_restantes')
    .eq('socio_id', socioId)
    .order('fecha_fin', { ascending: false })
    .limit(LIMITE_LISTADO);
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as MembresiaEstado[];
}

/** Vende o renueva una membresía. Pagos parciales o mixtos; [] = todo a deuda. */
export async function registrarMembresia(
  socioId: string,
  planId: string,
  fechaInicio: string,
  pagos: PagoInput[] = []
): Promise<string> {
  const { data, error } = await supabase.rpc('registrar_membresia', {
    p_socio_id: socioId,
    p_plan_id: planId,
    p_fecha_inicio: fechaInicio,
    p_pagos: pagos,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

/** Abona a la deuda de una membresía (pago a cuenta). */
export async function abonarMembresia(membresiaId: string, pagos: PagoInput[]) {
  const { error } = await supabase.rpc('abonar_membresia', {
    p_membresia_id: membresiaId,
    p_pagos: pagos,
  });
  if (error) throw new Error(error.message);
}

/** Congela días: se suman a fecha_fin. Devuelve la nueva fecha_fin. */
export async function congelarMembresia(membresiaId: string, dias: number): Promise<string> {
  const { data, error } = await supabase.rpc('congelar_membresia', {
    p_membresia_id: membresiaId,
    p_dias: dias,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

export async function anularMembresia(membresiaId: string, motivo: string) {
  const { error } = await supabase.rpc('anular_membresia', {
    p_id: membresiaId,
    p_motivo: motivo,
  });
  if (error) throw new Error(error.message);
}
