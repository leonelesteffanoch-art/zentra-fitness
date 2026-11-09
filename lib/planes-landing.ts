export interface PlanLandingItem {
  id: string;
  nombre: string;
  descripcion: string | null;
  duracion_dias: number;
  precio: number;
}

export type Modalidad = 'diario' | 'interdiario';

/** Formatea montos sin decimales innecesarios: 80 → "S/ 80", 66.5 → "S/ 66.50". */
export function formatoPrecioLanding(n: number): string {
  const redondeado = Math.round(n * 100) / 100;
  return Number.isInteger(redondeado) ? `S/ ${redondeado}` : `S/ ${redondeado.toFixed(2)}`;
}

/** Solo el número, para mostrar el "S/" aparte en superíndice. */
export function montoSinMoneda(n: number): string {
  const redondeado = Math.round(n * 100) / 100;
  return Number.isInteger(redondeado) ? String(redondeado) : redondeado.toFixed(2);
}

/**
 * Busca el plan por duración y modalidad. Evita que "interdiario" coincida con "diario"
 * (antes el toggle Diario mostraba los precios del Interdiario por ese motivo).
 */
export function buscarPlanPorModalidad(
  planes: PlanLandingItem[],
  duracionDias: number,
  modalidad: Modalidad
): PlanLandingItem | undefined {
  return planes.find((p) => {
    if (p.duracion_dias !== duracionDias) return false;
    const nombre = p.nombre.toLowerCase();
    if (modalidad === 'interdiario') return nombre.includes('interdiario');
    return nombre.includes('diario') && !nombre.includes('interdiario');
  });
}

const PRECIOS_RESPALDO: Record<Modalidad, Record<30 | 60 | 90, number>> = {
  diario: { 30: 80, 60: 140, 90: 200 },
  interdiario: { 30: 60, 60: 100, 90: 150 },
};

export function precioPlan(
  planes: PlanLandingItem[],
  dias: 30 | 60 | 90,
  modalidad: Modalidad
): number {
  return buscarPlanPorModalidad(planes, dias, modalidad)?.precio ?? PRECIOS_RESPALDO[modalidad][dias];
}

export function precioPase(planes: PlanLandingItem[], dias: 1 | 7): number {
  return planes.find((p) => p.duracion_dias === dias)?.precio ?? (dias === 1 ? 10 : 25);
}
