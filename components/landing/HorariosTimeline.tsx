'use client';

import { useSyncExternalStore } from 'react';
import { Clock } from 'lucide-react';
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
  entrenador: 'bg-ok/90 hover:bg-ok transition-colors',
  libre: 'bg-zinc-700/80 hover:bg-zinc-600 transition-colors',
  pase: 'bg-warn/90 hover:bg-warn transition-colors',
};

const PUNTO: Record<TipoBloque, string> = {
  entrenador: 'bg-ok',
  libre: 'bg-zinc-400',
  pase: 'bg-warn',
};

const SPAN = EJE_FIN - EJE_INICIO;
const pct = (min: number) => ((min - EJE_INICIO) / SPAN) * 100;
const TICKS = [6, 8, 10, 12, 14, 16, 18, 20, 22].map((hh) => hh * 60);

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
    <div className="space-y-6">
      {/* Badge dinámico en vivo */}
      <div className="flex flex-wrap items-center justify-between gap-4" aria-live="polite">
        {estado ? (
          <span className="anim-swap inline-flex min-h-11 items-center gap-3 rounded-full border border-line bg-surface-2 px-5 py-2 text-sm font-semibold text-bone shadow-md">
            <span className="relative flex h-3 w-3">
              {estado.abierto && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ok/60 motion-reduce:hidden" />
              )}
              <span
                className={`relative inline-flex h-3 w-3 rounded-full ${
                  estado.abierto ? 'bg-ok' : 'bg-muted'
                }`}
              />
            </span>
            <span>{estado.texto}</span>
          </span>
        ) : (
          <span className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-surface-2 px-4 py-2 text-xs text-muted">
            <Clock size={15} strokeWidth={1.5} className="text-muted" />
            Horario continuo semanal
          </span>
        )}

        {/* Leyenda rápida */}
        <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-muted">
          {(Object.keys(ETIQUETA_TIPO) as TipoBloque[]).map((t) => (
            <li key={t} className="inline-flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${PUNTO[t]}`} aria-hidden="true" />
              <span className="text-bone/85">{ETIQUETA_TIPO[t]}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Contenedor principal enriquecido con tarjetas por bloque */}
      <div className="space-y-4">
        {HORARIOS.map((dia) => {
          const esHoy = dia.id === hoyId;
          return (
            <div
              key={dia.id}
              className={`rounded-2xl border p-5 sm:p-6 transition-all duration-200 ${
                esHoy
                  ? 'border-brand/70 bg-surface shadow-[0_0_40px_-15px_rgba(255,194,26,0.15)] ring-1 ring-brand/30'
                  : 'border-line/80 bg-surface/70 hover:border-line'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
                <div className="flex items-center gap-3">
                  <h3 className="font-[family-name:var(--font-archivo)] text-lg sm:text-xl font-bold tracking-tight text-bone">
                    {dia.etiqueta}
                  </h3>
                  {esHoy && (
                    <span className="rounded-full bg-brand px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-brand-ink">
                      HOY
                    </span>
                  )}
                </div>
                <span className="text-xs text-muted">
                  {dia.bloques.length === 1
                    ? '1 turno'
                    : `${dia.bloques.length} bloques disponibles`}
                </span>
              </div>

              {/* Barra visual interactiva */}
              <div className="relative h-7 sm:h-8 rounded-lg bg-ink/90 p-1 border border-line/50 overflow-hidden">
                {/* Guías de horas de fondo */}
                {TICKS.map((t) => (
                  <span
                    key={t}
                    aria-hidden="true"
                    className="absolute inset-y-0 w-px bg-line/40 pointer-events-none"
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
                      className={`group absolute inset-y-1 rounded-sm cursor-pointer ${COLOR[b.tipo]}`}
                      style={{
                        left: `${pct(b.desde)}%`,
                        width: `${pct(b.hasta) - pct(b.desde)}%`,
                      }}
                    >
                      <span
                        role="tooltip"
                        className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md border border-line bg-ink px-3 py-1.5 text-xs font-semibold text-bone opacity-0 shadow-2xl transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 tabular-nums"
                      >
                        {rango} · {ETIQUETA_TIPO[b.tipo]}
                      </span>
                    </span>
                  );
                })}

                {/* Marcador en vivo "ahora" */}
                {esHoy && ahoraVisible && minuto !== null && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-y-0 z-10 w-0.5 bg-bone shadow-[0_0_8px_#ffffff]"
                    style={{ left: `${pct(minuto)}%` }}
                  >
                    <span className="absolute -top-1 left-1/2 -translate-x-1/2 rounded-full bg-bone px-1 text-[9px] font-black uppercase text-ink">
                      ahora
                    </span>
                  </span>
                )}
              </div>

              {/* Chips descriptivos con horarios detallados bajo la barra */}
              <div className="mt-4 flex flex-wrap gap-2.5 pt-2">
                {dia.bloques.map((b) => (
                  <div
                    key={b.desde}
                    className="inline-flex items-center gap-2 rounded-lg border border-line/70 bg-ink/60 px-3 py-1.5 text-xs text-bone"
                  >
                    <span className={`h-2 w-2 rounded-full ${PUNTO[b.tipo]}`} aria-hidden="true" />
                    <span className="font-semibold tabular-nums text-bone">
                      {formatoHora(b.desde)} – {formatoHora(b.hasta)}
                    </span>
                    <span className="text-muted">· {ETIQUETA_TIPO[b.tipo]}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
