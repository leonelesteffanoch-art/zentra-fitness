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

/** Arqueo teórico y totales por método, calculados en la BD (con respaldo local si otro recepcionista abrió el turno). */
export async function resumenTurno(turnoId: string, fondoInicialFallback = 0): Promise<ResumenTurno> {
  const { data, error } = await supabase.rpc('resumen_turno', { p_turno_id: turnoId });
  if (error) throw new Error(error.message);
  if (data) return data as ResumenTurno;

  const { data: movs, error: movErr } = await supabase
    .from('movimientos_caja')
    .select('tipo, monto, metodo, estado')
    .eq('turno_id', turnoId)
    .eq('estado', 'ACTIVO');
  if (movErr) throw new Error(movErr.message);

  let ingresos_efectivo = 0;
  let egresos_efectivo = 0;
  let ingresos_yape = 0;
  let ingresos_plin = 0;
  let ingresos_tarjeta = 0;
  let total_ingresos = 0;
  let total_egresos = 0;

  for (const m of movs ?? []) {
    const monto = Number(m.monto) || 0;
    if (m.tipo === 'INGRESO') {
      total_ingresos += monto;
      if (m.metodo === 'Efectivo') ingresos_efectivo += monto;
      else if (m.metodo === 'Yape') ingresos_yape += monto;
      else if (m.metodo === 'Plin') ingresos_plin += monto;
      else if (m.metodo === 'Tarjeta') ingresos_tarjeta += monto;
    } else if (m.tipo === 'EGRESO') {
      total_egresos += monto;
      if (m.metodo === 'Efectivo') egresos_efectivo += monto;
    }
  }

  return {
    fondo_inicial: fondoInicialFallback,
    ingresos_efectivo,
    egresos_efectivo,
    efectivo_esperado: fondoInicialFallback + ingresos_efectivo - egresos_efectivo,
    ingresos_yape,
    ingresos_plin,
    ingresos_tarjeta,
    total_ingresos,
    total_egresos,
  };
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
    .select('*')
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
> & { costo?: number };

export async function crearProducto(gymId: string, prod: DatosProducto) {
  const { error } = await supabase.from('productos').insert({ ...prod, gym_id: gymId });
  if (error) throw new Error(error.message);
}

export async function actualizarProducto(productoId: string, cambios: Partial<DatosProducto>) {
  const { error } = await supabase.from('productos').update(cambios).eq('id', productoId);
  if (error) throw new Error(error.message);
}

/** Elimina un producto. Si tiene ventas históricas asociadas, se archiva (activo = false) para no romper auditoría. */
export async function eliminarProducto(
  productoId: string
): Promise<{ eliminado: boolean; archivado: boolean }> {
  const { error } = await supabase.from('productos').delete().eq('id', productoId);
  if (!error) {
    return { eliminado: true, archivado: false };
  }
  const { error: updErr } = await supabase
    .from('productos')
    .update({ activo: false })
    .eq('id', productoId);
  if (updErr) throw new Error(updErr.message);
  return { eliminado: false, archivado: true };
}

/** Repone existencias de un producto en el POS y actualiza opcionalmente su costo de compra. */
export async function reponerStock(
  productoId: string,
  cantidadAdicional: number,
  nuevoCosto?: number
): Promise<number> {
  const { data: prod, error: getErr } = await supabase
    .from('productos')
    .select('stock, costo')
    .eq('id', productoId)
    .single();
  if (getErr || !prod) throw new Error('Producto no encontrado');

  const nuevoStock = (prod.stock ?? 0) + cantidadAdicional;
  const updates: Record<string, unknown> = { stock: nuevoStock };
  if (typeof nuevoCosto === 'number' && nuevoCosto >= 0) {
    updates.costo = nuevoCosto;
  }

  const { error } = await supabase.from('productos').update(updates).eq('id', productoId);
  if (error) throw new Error(error.message);
  return nuevoStock;
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

export interface DesglosePlan {
  nombre: string;
  total: number;
  cantidad: number;
}

export interface DesgloseProducto {
  nombre: string;
  total: number;
  unidades: number;
}

export interface ComparativaMeses {
  mesActualTotal: number;
  mesAnteriorTotal: number;
  diferencia: number;
  porcentajeVariacion: number;
  nombreMesActual: string;
  nombreMesAnterior: string;
}

/** Obtiene métricas gerenciales para el dashboard de administración. */
export async function obtenerEstadisticasAdmin(
  gymId: string,
  desde: string,
  hasta: string
): Promise<{
  comparativa: ComparativaMeses;
  planes: DesglosePlan[];
  productos: DesgloseProducto[];
}> {
  const hoy = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const y = hoy.getFullYear();
  const m = hoy.getMonth();

  const inicioMesAct = `${y}-${pad(m + 1)}-01`;
  const finMesAct = `${y}-${pad(m + 1)}-${pad(hoy.getDate())}`;

  const yAnt = m === 0 ? y - 1 : y;
  const mAnt = m === 0 ? 11 : m - 1;
  const inicioMesAnt = `${yAnt}-${pad(mAnt + 1)}-01`;
  const ultimoDiaAnt = new Date(y, m, 0).getDate();
  const finMesAnt = `${yAnt}-${pad(mAnt + 1)}-${pad(ultimoDiaAnt)}`;

  const [resAct, resAnt, { data: movsPlanes }, { data: ventasProd }] = await Promise.all([
    resumenPeriodo(inicioMesAct, finMesAct).catch(() => []),
    resumenPeriodo(inicioMesAnt, finMesAnt).catch(() => []),
    supabase
      .from('movimientos_caja')
      .select('concepto, monto')
      .eq('gym_id', gymId)
      .eq('tipo', 'INGRESO')
      .eq('categoria', 'MEMBRESIA')
      .eq('estado', 'ACTIVO')
      .gte('fecha_hora', `${desde}T00:00:00`)
      .lte('fecha_hora', `${hasta}T23:59:59`),
    supabase
      .from('ventas_productos')
      .select('descripcion, cantidad, total')
      .eq('gym_id', gymId)
      .eq('estado', 'ACTIVO')
      .gte('created_at', `${desde}T00:00:00`)
      .lte('created_at', `${hasta}T23:59:59`),
  ]);

  const totAct = resAct.reduce(
    (acc, r) => (r.tipo === 'INGRESO' ? acc + Number(r.total || 0) : acc),
    0
  );
  const totAnt = resAnt.reduce(
    (acc, r) => (r.tipo === 'INGRESO' ? acc + Number(r.total || 0) : acc),
    0
  );
  const dif = totAct - totAnt;
  const pct =
    totAnt > 0 ? Math.round(((totAct - totAnt) / totAnt) * 100) : totAct > 0 ? 100 : 0;

  const mesesNombres = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Setiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ];
  const comparativa: ComparativaMeses = {
    mesActualTotal: totAct,
    mesAnteriorTotal: totAnt,
    diferencia: dif,
    porcentajeVariacion: pct,
    nombreMesActual: mesesNombres[m],
    nombreMesAnterior: mesesNombres[mAnt],
  };

  const mapaPlanes = new Map<string, { total: number; cantidad: number }>();
  for (const item of movsPlanes ?? []) {
    const nombreLimpio = item.concepto.replace(/^Membresía\s+/i, '').trim();
    const actual = mapaPlanes.get(nombreLimpio) ?? { total: 0, cantidad: 0 };
    mapaPlanes.set(nombreLimpio, {
      total: actual.total + (Number(item.monto) || 0),
      cantidad: actual.cantidad + 1,
    });
  }
  const planesDesglose: DesglosePlan[] = Array.from(mapaPlanes.entries())
    .map(([nombre, d]) => ({ nombre, total: d.total, cantidad: d.cantidad }))
    .sort((a, b) => b.total - a.total);

  const mapaProds = new Map<string, { total: number; unidades: number }>();
  for (const v of ventasProd ?? []) {
    const actual = mapaProds.get(v.descripcion) ?? { total: 0, unidades: 0 };
    mapaProds.set(v.descripcion, {
      total: actual.total + (Number(v.total) || 0),
      unidades: actual.unidades + (v.cantidad || 0),
    });
  }
  const prodsDesglose: DesgloseProducto[] = Array.from(mapaProds.entries())
    .map(([nombre, d]) => ({ nombre, total: d.total, unidades: d.unidades }))
    .sort((a, b) => b.total - a.total);

  return {
    comparativa,
    planes: planesDesglose,
    productos: prodsDesglose,
  };
}
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
