// Tipos que reflejan supabase/schema.sql. Fechas = string ISO; numeric = number.

export type Rol = 'admin' | 'recepcionista';
export type TurnoNombre = 'Mañana' | 'Tarde';
export type EstadoTurno = 'ABIERTO' | 'CERRADO';
export type EstadoRegistro = 'ACTIVO' | 'ANULADO';
export type Semaforo = 'VERDE' | 'AMBAR' | 'ROJO';
export type MetodoPago = 'Efectivo' | 'Yape' | 'Plin' | 'Tarjeta';
export type TipoMovimiento = 'INGRESO' | 'EGRESO';
export type CategoriaMovimiento = 'MEMBRESIA' | 'VENTA_PRODUCTO' | 'GASTO' | 'OTRO';

export interface Gym {
  id: string;
  nombre: string;
  slug: string | null;
  direccion: string | null;
  telefono: string | null;
  whatsapp: string | null;
  email: string | null;
  redes: { instagram?: string; facebook?: string; tiktok?: string };
  descripcion: string | null;
  fotos: string[];
  activo: boolean;
  created_at: string;
}

export interface Perfil {
  id: string;
  gym_id: string;
  nombre: string;
  rol: Rol;
  activo: boolean;
  created_at: string;
}

export interface Socio {
  id: string;
  gym_id: string;
  dni: string;
  nombres: string;
  apellidos: string;
  telefono: string | null;
  email: string | null;
  fecha_nacimiento: string | null;
  foto_url: string | null;
  observaciones: string | null;
  activo: boolean;
  created_by: string | null;
  created_at: string;
}

export interface Plan {
  id: string;
  gym_id: string;
  nombre: string;
  descripcion: string | null;
  duracion_dias: number;
  precio: number;
  permite_congelar: boolean;
  max_dias_congelar: number | null;
  visible_landing: boolean;
  activo: boolean;
  created_at: string;
}

export interface Membresia {
  id: string;
  gym_id: string;
  socio_id: string;
  plan_id: string;
  fecha_inicio: string;
  fecha_fin: string;
  precio_total: number;
  dias_congelados: number;
  estado: EstadoRegistro;
  anulado_por: string | null;
  anulado_at: string | null;
  motivo_anulacion: string | null;
  created_by: string | null;
  created_at: string;
}

/** Pago de membresía: es una fila de movimientos_caja con membresia_id. */
export type MembresiaPago = MovimientoCaja & { membresia_id: string };

export interface Asistencia {
  id: string;
  gym_id: string;
  socio_id: string;
  membresia_id: string | null;
  fecha: string;
  hora: string;
  semaforo: Semaforo;
  registrado_por: string | null;
}

export interface Producto {
  id: string;
  gym_id: string;
  nombre: string;
  categoria: string;
  precio: number;
  costo?: number;
  stock: number;
  es_servicio: boolean;
  activo: boolean;
  created_at: string;
}

export interface VentaProducto {
  id: string;
  gym_id: string;
  turno_id: string;
  venta_grupo_id: string;
  producto_id: string | null;
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  total: number;
  socio_id: string | null;
  cliente_nombre: string | null;
  estado: EstadoRegistro;
  anulado_por: string | null;
  anulado_at: string | null;
  motivo_anulacion: string | null;
  registrado_por: string | null;
  created_at: string;
}

export interface TurnoCaja {
  id: string;
  gym_id: string;
  turno: TurnoNombre;
  fecha: string;
  estado: EstadoTurno;
  abierto_por: string;
  abierto_at: string;
  fondo_inicial: number;
  cerrado_por: string | null;
  cerrado_at: string | null;
  efectivo_esperado: number | null;
  efectivo_real: number | null;
  diferencia: number | null;
  observaciones: string | null;
}

export interface MovimientoCaja {
  id: string;
  gym_id: string;
  turno_id: string;
  tipo: TipoMovimiento;
  categoria: CategoriaMovimiento;
  concepto: string;
  monto: number;
  metodo: MetodoPago;
  socio_id: string | null;
  cliente_nombre: string | null;
  membresia_id: string | null;
  venta_grupo_id: string | null;
  grupo_pago_id: string;
  comprobante_url: string | null;
  fecha_hora: string;
  registrado_por: string;
  estado: EstadoRegistro;
  anulado_por: string | null;
  anulado_at: string | null;
  motivo_anulacion: string | null;
}

// ---------- Vistas ----------

/** v_socio_estado: base del check-in con semáforo. */
export interface SocioEstado {
  socio_id: string;
  gym_id: string;
  dni: string;
  nombres: string;
  apellidos: string;
  foto_url: string | null;
  telefono: string | null;
  membresia_id: string | null;
  plan: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  dias_restantes: number | null;
  saldo_pendiente: number;
  semaforo: Semaforo;
}

/** v_membresias_estado */
export interface MembresiaEstado {
  membresia_id: string;
  gym_id: string;
  socio_id: string;
  plan_id: string;
  plan: string;
  fecha_inicio: string;
  fecha_fin: string;
  dias_congelados: number;
  precio_total: number;
  estado: EstadoRegistro;
  monto_pagado: number;
  saldo_pendiente: number;
  dias_restantes: number;
}

// ---------- Entradas / salidas de RPC ----------

export interface PagoInput {
  metodo: MetodoPago;
  monto: number;
}

export interface ItemVentaInput {
  producto_id: string;
  cantidad: number;
}

export interface ResumenTurno {
  fondo_inicial: number;
  ingresos_efectivo: number;
  egresos_efectivo: number;
  efectivo_esperado: number;
  ingresos_yape: number;
  ingresos_plin: number;
  ingresos_tarjeta: number;
  total_ingresos: number;
  total_egresos: number;
}

export interface CierreTurnoResultado extends ResumenTurno {
  efectivo_real: number;
  diferencia: number;
}

export interface ResumenPeriodoFila {
  fecha: string;
  turno: TurnoNombre;
  tipo: TipoMovimiento;
  metodo: MetodoPago;
  total: number;
  cantidad: number;
}

/** Respuesta pública de consulta_socio (portal /consulta). */
export interface ConsultaSocioResultado {
  nombres: string;
  plan: string | null;
  fecha_fin: string | null;
  dias_restantes: number | null;
  saldo_pendiente: number;
  semaforo: Semaforo;
  asistencias_mes: number;
}

/** Fila de v_movimientos_export (formato contable Excel / Power BI). */
export interface MovimientoExport {
  gym_id: string;
  movimiento_id: string;
  Fecha: string;
  Hora: string;
  Turno: TurnoNombre;
  Tipo: 'Ingreso' | 'Egreso';
  Concepto: string;
  Monto: number;
  Método: MetodoPago;
  'Socio/Cliente': string;
  Responsable: string;
  categoria: CategoriaMovimiento;
  estado: EstadoRegistro;
  turno_id: string;
  socio_id: string | null;
}
