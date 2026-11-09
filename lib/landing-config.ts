/**
 * Configuración única de la landing de Zentra Fitness.
 * Cada dato vive aquí UNA sola vez y lo consumen la línea de tiempo de horarios,
 * el badge "Abierto ahora", el JSON-LD y la sección de contacto.
 */

export const SITE_URL = 'https://zentrafitness.vercel.app';

export const WHATSAPP_NUMERO = '51998180873';
export const WHATSAPP_VISIBLE = '998 180 873';

export const DIRECCION = 'A la espalda de la Loza 4 – Av. Arquitectos, Villa Estela, Ancón';

/**
 * TODO(pin-real): reemplazar ambas URLs por el pin exacto de Google Maps del local
 * cuando el dueño lo comparta (Compartir → Insertar un mapa → copiar el src del iframe).
 * Mientras tanto se usa una búsqueda por nombre.
 */
export const GOOGLE_MAPS_URL =
  'https://www.google.com/maps/search/?api=1&query=Zentra+Fitness+Villa+Estela+Anc%C3%B3n';
export const GOOGLE_MAPS_EMBED_URL =
  'https://www.google.com/maps?q=Zentra+Fitness+Villa+Estela+Anc%C3%B3n&output=embed';

export const REDES = [
  { nombre: 'TikTok', url: 'https://www.tiktok.com/@zentrafitnessperu?_r=1&_t=ZS-9BFZ0vSjjqG' },
  { nombre: 'Facebook', url: 'https://www.facebook.com/share/1E53yWwEMJ/' },
  { nombre: 'Instagram', url: 'https://www.instagram.com/zentrafitnessperu?obrf=cTZmbnVzMWVmem02' },
] as const;

// ---------- Horarios (fuente única) ----------

export type TipoBloque = 'entrenador' | 'libre' | 'pase';

export interface BloqueHorario {
  /** Minutos desde las 00:00 */
  desde: number;
  hasta: number;
  tipo: TipoBloque;
}

export interface DiaHorario {
  id: 'lv' | 'sab' | 'dom';
  etiqueta: string;
  etiquetaLarga: string;
  /** Días JS: 0 = domingo … 6 = sábado */
  dias: number[];
  schemaDays: string[];
  bloques: BloqueHorario[];
}

const h = (hora: number, min = 0) => hora * 60 + min;

export const HORARIOS: DiaHorario[] = [
  {
    id: 'lv',
    etiqueta: 'Lunes a Viernes',
    etiquetaLarga: 'Lunes a Viernes',
    dias: [1, 2, 3, 4, 5],
    schemaDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    bloques: [
      { desde: h(6), hasta: h(11), tipo: 'entrenador' },
      { desde: h(11), hasta: h(16), tipo: 'libre' },
      { desde: h(16), hasta: h(22, 30), tipo: 'entrenador' },
    ],
  },
  {
    id: 'sab',
    etiqueta: 'Sábados',
    etiquetaLarga: 'Sábados',
    dias: [6],
    schemaDays: ['Saturday'],
    bloques: [
      { desde: h(7), hasta: h(11), tipo: 'entrenador' },
      { desde: h(11), hasta: h(16), tipo: 'libre' },
      { desde: h(16), hasta: h(22), tipo: 'entrenador' },
    ],
  },
  {
    id: 'dom',
    etiqueta: 'Domingos',
    etiquetaLarga: 'Domingos',
    dias: [0],
    schemaDays: ['Sunday'],
    bloques: [{ desde: h(9), hasta: h(14), tipo: 'pase' }],
  },
];

export const ETIQUETA_TIPO: Record<TipoBloque, string> = {
  entrenador: 'Con entrenador',
  libre: 'Sala libre',
  pase: 'Solo pase por día (S/ 10)',
};

/** Eje visual de la línea de tiempo: 6:00 am – 10:30 pm */
export const EJE_INICIO = h(6);
export const EJE_FIN = h(22, 30);

/** 600 → "10:00 am" */
export function formatoHora(minutos: number): string {
  const hh = Math.floor(minutos / 60);
  const mm = minutos % 60;
  const sufijo = hh >= 12 ? 'pm' : 'am';
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${h12}:${String(mm).padStart(2, '0')} ${sufijo}`;
}

/** 600 → "10:00" (formato 24 h para schema.org) */
export function formatoHora24(minutos: number): string {
  return `${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`;
}

export function diaHorarioDe(diaSemana: number): DiaHorario | undefined {
  return HORARIOS.find((d) => d.dias.includes(diaSemana));
}

export interface EstadoApertura {
  abierto: boolean;
  texto: string;
  tipo?: TipoBloque;
  diaId?: DiaHorario['id'];
  minutoActual: number;
}

const NOMBRES_DIA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

/** Calcula el estado en vivo a partir de día (0–6) y minuto del día en hora de Lima. */
export function calcularEstado(diaSemana: number, minuto: number): EstadoApertura {
  const hoy = diaHorarioDe(diaSemana);
  const bloque = hoy?.bloques.find((b) => minuto >= b.desde && minuto < b.hasta);

  if (hoy && bloque) {
    const tipoTexto =
      bloque.tipo === 'entrenador'
        ? 'Con entrenador'
        : bloque.tipo === 'libre'
          ? 'Sala libre'
          : 'Solo pase por día';
    return {
      abierto: true,
      texto: `Abierto ahora · ${tipoTexto} · hasta ${formatoHora(bloque.hasta)}`,
      tipo: bloque.tipo,
      diaId: hoy.id,
      minutoActual: minuto,
    };
  }

  // Cerrado: buscar la próxima apertura (hoy más tarde o días siguientes)
  const primeroHoy = hoy?.bloques[0];
  if (hoy && primeroHoy && minuto < primeroHoy.desde) {
    return {
      abierto: false,
      texto: `Cerrado · abre hoy ${formatoHora(primeroHoy.desde)}`,
      diaId: hoy.id,
      minutoActual: minuto,
    };
  }

  for (let i = 1; i <= 7; i++) {
    const dia = (diaSemana + i) % 7;
    const siguiente = diaHorarioDe(dia)?.bloques[0];
    if (siguiente) {
      const cuando = i === 1 ? 'mañana' : `el ${NOMBRES_DIA[dia]}`;
      return {
        abierto: false,
        texto: `Cerrado · abre ${cuando} ${formatoHora(siguiente.desde)}`,
        diaId: hoy?.id,
        minutoActual: minuto,
      };
    }
  }

  return { abierto: false, texto: 'Cerrado', minutoActual: minuto };
}

/** Día de la semana y minuto actual en America/Lima. */
export function ahoraEnLima(fecha: Date): { dia: number; minuto: number } {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Lima',
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(fecha);
  const get = (t: string) => partes.find((p) => p.type === t)?.value ?? '';
  const mapa: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    dia: mapa[get('weekday')] ?? 0,
    minuto: Number(get('hour')) * 60 + Number(get('minute')),
  };
}

/** Bloques de horario para el JSON-LD (rango completo de apertura por día). */
export function horariosSchema() {
  return HORARIOS.map((d) => ({
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: d.schemaDays,
    opens: formatoHora24(d.bloques[0].desde),
    closes: formatoHora24(d.bloques[d.bloques.length - 1].hasta),
  }));
}
