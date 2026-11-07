import { supabase } from '@/lib/supabase';
import type {
  TurnoCaja,
  TurnoNombre,
  ResumenTurno,
  CierreTurnoResultado,
  MovimientoCaja,
  MovimientoExport,
  Producto,
  PagoInput,
  ItemVentaInput,
  ResumenPeriodoFila,
} from '@/types';

const LIMITE_MOVIMIENTOS = 50;

// ---------- Turnos ----------

/** Turno ABIERTO actual del gimnasio (null si no hay). */
export async function turnoAbierto(gymId: string): Promise<TurnoCaja | null> {
  const { data, error } = await supabase
    .from('turnos_caja')
    .select('id, gym_id, turno, fecha, estado, abierto_por, abierto_at, fondo_inicial')
    .eq('gym_id', gymId)
    .eq('estado', 'ABIERTO')
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as unknown as TurnoCaja | null;
}

export async function abrirTurno(turno: TurnoNombre, fondoInicial: number): Promise<string> {
  const { data, error } = await supabase.rpc('abrir_turno', {
    p_turno: turno,
    p_fondo_inicial: fondoInicial,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

/** Arqueo teórico y totales por método, calculados en la BD. */
export async function resumenTurno(turnoId: string): Promise<ResumenTurno> {
  const { data, error } = await supabase.rpc('resumen_turno', { p_turno_id: turnoId });
  if (error) throw new Error(error.message);
  if (!data) throw new Error('Turno no encontrado o sin permiso');
  return data as ResumenTurno;
}

/** Cierra el turno con el efectivo real contado por el recepcionista. */
export async function cerrarTurno(
  turnoId: string,
  efectivoReal: number,
  observaciones?: string
): Promise<CierreTurnoResultado> {
  const { data, error } = await supabase.rpc('cerrar_turno', {
    p_turno_id: turnoId,
    p_efectivo_real: efectivoReal,
    p_obs: observaciones ?? null,
  });
  if (error) throw new Error(error.message);
  return data as CierreTurnoResultado;
}

// ---------- Movimientos ----------

/** Últimos movimientos de un turno (máx. 50). */
export async function movimientosDeTurno(turnoId: string): Promise<MovimientoCaja[]> {
  const { data, error } = await supabase
    .from('movimientos_caja')
    .select('id, tipo, categoria, concepto, monto, metodo, socio_id, cliente_nombre, fecha_hora, estado, motivo_anulacion')
    .eq('turno_id', turnoId)
    .order('fecha_hora', { ascending: false })
    .limit(LIMITE_MOVIMIENTOS);
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as MovimientoCaja[];
}

/** Egreso / gasto de caja chica. */
export async function registrarEgreso(
  concepto: string,
  monto: number,
  metodo: PagoInput['metodo'] = 'Efectivo'
): Promise<string> {
  const { data, error } = await supabase.rpc('registrar_egreso', {
    p_concepto: concepto,
    p_monto: monto,
    p_metodo: metodo,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

/** Soft delete: el movimiento pasa a ANULADO con motivo y responsable. */
export async function anularMovimiento(movimientoId: string, motivo: string) {
  const { error } = await supabase.rpc('anular_movimiento', {
    p_id: movimientoId,
    p_motivo: motivo,
  });
  if (error) throw new Error(error.message);
}

// ---------- POS ----------

export async function listarProductos(gymId: string, incluirInactivos = false): Promise<Producto[]> {
  let query = supabase
    .from('productos')
    .select('id, gym_id, nombre, categoria, precio, stock, es_servicio, activo')
    .eq('gym_id', gymId)
    .order('categoria')
    .order('nombre')
    .limit(100);
  if (!incluirInactivos) query = query.eq('activo', true);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as Producto[];
}

export type DatosProducto = Pick<
  Producto,
  'nombre' | 'categoria' | 'precio' | 'stock' | 'es_servicio' | 'activo'
>;

export async function crearProducto(gymId: string, prod: DatosProducto) {
  const { error } = await supabase.from('productos').insert({ ...prod, gym_id: gymId });
  if (error) throw new Error(error.message);
}

export async function actualizarProducto(productoId: string, cambios: Partial<DatosProducto>) {
  const { error } = await supabase.from('productos').update(cambios).eq('id', productoId);
  if (error) throw new Error(error.message);
}

/** Venta rápida de mostrador. Los pagos deben sumar el total. Socio opcional. */
export async function registrarVenta(
  items: ItemVentaInput[],
  pagos: PagoInput[],
  opciones: { socioId?: string; cliente?: string } = {}
): Promise<string> {
  const { data, error } = await supabase.rpc('registrar_venta', {
    p_items: items,
    p_pagos: pagos,
    p_socio_id: opciones.socioId ?? null,
    p_cliente: opciones.cliente ?? null,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

export async function anularVenta(ventaGrupoId: string, motivo: string) {
  const { error } = await supabase.rpc('anular_venta', {
    p_venta_grupo_id: ventaGrupoId,
    p_motivo: motivo,
  });
  if (error) throw new Error(error.message);
}

/** Historial de turnos de caja para auditoría del dueño (máx. 20). */
export async function listarTurnosHistorial(gymId: string): Promise<TurnoCaja[]> {
  const { data, error } = await supabase
    .from('turnos_caja')
    .select('id, gym_id, turno, fecha, estado, abierto_at, fondo_inicial, cerrado_at, efectivo_esperado, efectivo_real, diferencia, observaciones')
    .eq('gym_id', gymId)
    .order('abierto_at', { ascending: false })
    .limit(20);
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as TurnoCaja[];
}

/** Totales por fecha/turno/tipo/método calculados en la BD (solo admin). */
export async function resumenPeriodo(desde: string, hasta: string): Promise<ResumenPeriodoFila[]> {
  const { data, error } = await supabase.rpc('resumen_periodo', {
    p_desde: desde,
    p_hasta: hasta,
  });
  if (error) throw new Error(error.message);
  return (data ?? []) as ResumenPeriodoFila[];
}

/** Filas en formato contable para exportar a .xlsx (paginadas, máx. 1000). */
export async function movimientosParaExport(
  gymId: string,
  desde: string,
  hasta: string,
  pagina = 0
): Promise<MovimientoExport[]> {
  const tam = 1000;
  const { data, error } = await supabase
    .from('v_movimientos_export')
    .select('movimiento_id, "Fecha", "Hora", "Turno", "Tipo", "Concepto", "Monto", "Método", "Socio/Cliente", "Responsable", categoria, estado')
    .eq('gym_id', gymId)
    .eq('estado', 'ACTIVO')
    .gte('Fecha', desde)
    .lte('Fecha', hasta)
    .order('Fecha')
    .order('Hora')
    .range(pagina * tam, pagina * tam + tam - 1);
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as MovimientoExport[];
}
