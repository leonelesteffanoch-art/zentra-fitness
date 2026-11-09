'use client';

import { useSyncExternalStore } from 'react';
import {
  EJE_FIN,
  EJE_INICIO,
  ETIQUETA_TIPO,
  HORARIOS,
  ahoraEnLima,
  calcularEstado,
  formatoHora,
  type TipoBloque,
} from '@/lib/landing-config';

const COLOR: Record<TipoBloque, string> = {
  entrenador: 'bg-ok/80',
  libre: 'bg-[#3d3d44]',
  pase: 'bg-warn/85',
};
const PUNTO: Record<TipoBloque, string> = {
  entrenador: 'bg-ok',
  libre: 'bg-[#6b6b73]',
  pase: 'bg-warn',
};

const SPAN = EJE_FIN - EJE_INICIO;
const pct = (min: number) => ((min - EJE_INICIO) / SPAN) * 100;
const TICKS = [6, 8, 10, 12, 14, 16, 18, 20, 22].map((hh) => hh * 60);
const tickLabel = (m: number) => {
  const hh = m / 60;
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${h12} ${hh >= 12 ? 'pm' : 'am'}`;
};

/** Minuto actual (cambia una vez por minuto). null en el servidor → sin errores de hidratación. */
function useMinutoActual(): number | null {
  return useSyncExternalStore(
    (cb) => {
      const id = window.setInterval(cb, 30_000);
      return () => window.clearInterval(id);
    },
    () => Math.floor(Date.now() / 60_000),
    () => null
  );
}

export function HorariosTimeline() {
  const minutoEpoch = useMinutoActual();
  const ahora = minutoEpoch !== null ? ahoraEnLima(new Date(minutoEpoch * 60_000)) : null;
  const estado = ahora ? calcularEstado(ahora.dia, ahora.minuto) : null;
  const hoyId = estado?.diaId;
  const minuto = ahora?.minuto ?? null;
  const ahoraVisible = minuto !== null && minuto >= EJE_INICIO && minuto <= EJE_FIN;

  return (
    <div>
      {/* Badge en vivo (se pinta tras montar) */}
      <div className="mb-6 min-h-10" aria-live="polite">
        {estado && (
          <span className="anim-swap inline-flex min-h-10 items-center gap-2.5 rounded-full border border-line bg-surface px-4 text-sm font-medium text-bone">
            <span className="relative flex h-2.5 w-2.5">
              {estado.abierto && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ok/60 motion-reduce:hidden" />
              )}
              <span
                className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
                  estado.abierto ? 'bg-ok' : 'bg-muted'
                }`}
              />
            </span>
            {estado.texto}
          </span>
        )}
      </div>

      {/* ---------- Desktop / tablet: línea de tiempo ---------- */}
      <div className="hidden border border-line/80 bg-surface p-6 md:block">
        {/* Eje de horas */}
        <div className="grid grid-cols-[88px_1fr] gap-4">
          <span />
          <div className="relative h-5 text-[11px] text-muted" aria-hidden="true">
            {TICKS.map((t) => (
              <span
                key={t}
                className="absolute -translate-x-1/2 whitespace-nowrap tabular-nums"
                style={{ left: `${pct(t)}%` }}
              >
                {tickLabel(t)}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-3 space-y-2.5">
          {HORARIOS.map((dia) => {
            const esHoy = dia.id === hoyId;
            return (
              <div
                key={dia.id}
                role="group"
                aria-label={`${dia.etiquetaLarga}${esHoy ? ' (hoy)' : ''}`}
                className={`grid grid-cols-[88px_1fr] items-center gap-4 rounded-sm px-2 py-2 transition-colors ${
                  esHoy ? 'bg-surface-2 ring-1 ring-line' : ''
                }`}
              >
                <span className="flex items-center gap-2 text-sm font-semibold text-bone">
                  {dia.etiqueta}
                  {esHoy && (
                    <span className="rounded-full bg-bone px-1.5 py-px text-[10px] font-bold uppercase text-ink">
                      Hoy
                    </span>
                  )}
                </span>

                <div className="relative h-10 rounded-sm bg-ink">
                  {/* Guías verticales */}
                  {TICKS.map((t) => (
                    <span
                      key={t}
                      aria-hidden="true"
                      className="absolute inset-y-0 w-px bg-line/50"
                      style={{ left: `${pct(t)}%` }}
                    />
                  ))}

                  {dia.bloques.map((b) => {
                    const rango = `${formatoHora(b.desde)} – ${formatoHora(b.hasta)}`;
                    return (
                      <span
                        key={b.desde}
                        tabIndex={0}
                        aria-label={`${rango}, ${ETIQUETA_TIPO[b.tipo]}`}
                        className={`group absolute inset-y-1 rounded-[2px] outline-offset-2 ${COLOR[b.tipo]}`}
                        style={{ left: `${pct(b.desde)}%`, width: `${pct(b.hasta) - pct(b.desde)}%` }}
                      >
                        <span
                          role="tooltip"
                          className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-sm border border-line bg-ink px-2.5 py-1.5 text-xs text-bone opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 tabular-nums"
                        >
                          {rango} · {ETIQUETA_TIPO[b.tipo]}
                        </span>
                      </span>
                    );
                  })}

                  {esHoy && ahoraVisible && minuto !== null && (
                    <span
                      aria-hidden="true"
                      className="absolute -inset-y-2 z-[5] w-0.5 bg-bone"
                      style={{ left: `${pct(minuto)}%` }}
                    >
                      <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[10px] font-bold uppercase text-bone">
                        ahora
                      </span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ---------- Móvil: una tarjeta por día ---------- */}
      <div className="space-y-3 md:hidden">
        {HORARIOS.map((dia) => {
          const esHoy = dia.id === hoyId;
          return (
            <div
              key={dia.id}
              className={`border bg-surface p-4 ${esHoy ? 'border-muted/60' : 'border-line/80'}`}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-bone">{dia.etiquetaLarga}</h3>
                {esHoy && (
                  <span className="rounded-full bg-bone px-2 py-px text-[10px] font-bold uppercase text-ink">
                    Hoy
                  </span>
                )}
              </div>
              <div className="relative mt-3 h-3 rounded-full bg-ink" aria-hidden="true">
                {dia.bloques.map((b) => (
                  <span
                    key={b.desde}
                    className={`absolute inset-y-0 rounded-full ${COLOR[b.tipo]}`}
                    style={{ left: `${pct(b.desde)}%`, width: `${pct(b.hasta) - pct(b.desde)}%` }}
                  />
                ))}
                {esHoy && ahoraVisible && minuto !== null && (
                  <span
                    className="absolute -inset-y-1.5 w-0.5 bg-bone"
                    style={{ left: `${pct(minuto)}%` }}
                  />
                )}
              </div>
              <ul className="mt-3 space-y-1.5">
                {dia.bloques.map((b) => (
                  <li
                    key={b.desde}
                    className="flex items-center justify-between gap-3 text-xs tabular-nums"
                  >
                    <span className="text-bone">
                      {formatoHora(b.desde)} – {formatoHora(b.hasta)}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-muted">
                      <span className={`h-2 w-2 rounded-full ${PUNTO[b.tipo]}`} aria-hidden="true" />
                      {ETIQUETA_TIPO[b.tipo]}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {/* Leyenda (una sola vez) */}
      <ul className="mt-5 hidden flex-wrap gap-x-6 gap-y-2 text-xs text-muted md:flex" aria-label="Leyenda">
        {(Object.keys(ETIQUETA_TIPO) as TipoBloque[]).map((t) => (
          <li key={t} className="inline-flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${PUNTO[t]}`} aria-hidden="true" />
            {ETIQUETA_TIPO[t]}
          </li>
        ))}
      </ul>
    </div>
  );
}
