/** Fecha de hoy (YYYY-MM-DD) en la zona horaria del negocio. */
export function hoyLima(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
}

/** Suma días a una fecha YYYY-MM-DD de forma segura sin desfase horario. */
export function sumarDias(fecha: string, dias: number): string {
  const [y, m, d] = fecha.split('-').map(Number);
  if (!y || !m || !d) return fecha;
  const dt = new Date(Date.UTC(y, m - 1, d + dias));
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

/** Diferencia en días exactos (fechaFin - fechaBase) usando fechas YYYY-MM-DD. */
export function diffDiasISO(fechaFin: string, fechaBase: string = hoyLima()): number {
  const [ya, ma, da] = fechaFin.split('-').map(Number);
  const [yb, mb, db] = fechaBase.split('-').map(Number);
  if (!ya || !ma || !da || !yb || !mb || !db) return 0;
  return Math.round((Date.UTC(ya, ma - 1, da) - Date.UTC(yb, mb - 1, db)) / 86_400_000);
}

/** Convierte YYYY-MM-DD (o timestamp ISO) a DD/MM/YYYY para lectura rápida. */
export function formatearFechaDMY(fecha?: string | null): string {
  if (!fecha) return '—';
  const iso = fecha.slice(0, 10);
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return fecha;
  return `${d}/${m}/${y}`;
}

export const soles = (n: number) =>
  `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Detecta DNI provisional (99...) o nombre/apellido marcado como "(Pendiente)" tras migración. */
export function estadoDatosSocio(s: {
  dni: string;
  nombres: string;
  apellidos: string;
  telefono?: string | null;
}) {
  const dniProvisional = /^99\d{7,}$/.test(s.dni.trim());
  const nombrePendiente =
    s.nombres.includes('(Pendiente)') || s.apellidos.includes('(Pendiente)');
  const sinTelefono = !s.telefono?.trim();
  return {
    dniProvisional,
    nombrePendiente,
    sinTelefono,
    incompleto: dniProvisional || nombrePendiente,
  };
}

/** Capitaliza la primera letra de cada palabra (preservando "(Pendiente)"). */
export function capitalizarNombre(texto: string): string {
  const limpio = texto.replace(/\s+/g, ' ').trim();
  if (!limpio) return '';
  if (limpio.toLowerCase() === '(pendiente)') return '(Pendiente)';
  return limpio
    .split(' ')
    .map((p) => {
      if (p.toLowerCase() === '(pendiente)') return '(Pendiente)';
      return p.charAt(0).toLocaleUpperCase('es-PE') + p.slice(1).toLocaleLowerCase('es-PE');
    })
    .join(' ');
}

/** Formatea apellidos y nombres con iniciales en mayúscula y sin coma. */
export function formatearNombreSocio(s: {
  nombres?: string | null;
  apellidos?: string | null;
}): string {
  const ape = capitalizarNombre(s.apellidos ?? '');
  const nom = capitalizarNombre(s.nombres ?? '');
  return [ape, nom].filter(Boolean).join(' ');
}
