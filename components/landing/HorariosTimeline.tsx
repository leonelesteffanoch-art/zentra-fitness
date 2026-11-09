'use client';

import { useSyncExternalStore } from 'react';
import {
  Calendar,
  Clock,
  Moon,
  Sun,
  Sunrise,
} from 'lucide-react';
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
  entrenador:
    'bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 shadow-[0_0_12px_rgba(34,197,94,0.35)]',
  libre:
    'bg-gradient-to-r from-zinc-700 to-zinc-600 hover:from-zinc-600 hover:to-zinc-500',
  pase:
    'bg-gradient-to-r from-amber-500 to-orange-400 hover:from-amber-400 hover:to-orange-300 shadow-[0_0_12px_rgba(245,158,11,0.35)]',
};

const SPAN = EJE_FIN - EJE_INICIO;
const pct = (min: number) => ((min - EJE_INICIO) / SPAN) * 100;
const TICKS = [6, 8, 10, 12, 14, 16, 18, 20, 22].map((hh) => hh * 60);
const tickLabel = (m: number) => {
  const hh = m / 60;
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${h12} ${hh >= 12 ? 'pm' : 'am'}`;
};

function getTurnoIcon(desde: number) {
  if (desde < 12 * 60) return <Sunrise size={13} className="text-emerald-400" />;
  if (desde < 16 * 60) return <Sun size={13} className="text-zinc-400" />;
  return <Moon size={13} className="text-emerald-400" />;
}

/** Minuto actual en America/Lima (se actualiza cada 30 s sin desajustes de hidratación). */
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
    <div className="space-y-8">
      {/* Barra superior: Badge dinámico en vivo + Resumen semanal */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line/70 pb-6">
        <div>
          {estado ? (
            <div className="anim-swap inline-flex items-center gap-3 rounded-full border border-line bg-surface px-5 py-2 text-sm font-semibold text-bone shadow-lg">
              <span className="relative flex h-3 w-3">
                {estado.abierto && (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ok/60 motion-reduce:hidden" />
                )}
                <span
                  className={`relative inline-flex h-3 w-3 rounded-full ${
                    estado.abierto ? 'bg-ok shadow-[0_0_8px_#22c55e]' : 'bg-muted'
                  }`}
                />
              </span>
              <span className="tracking-tight">{estado.texto}</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-xs font-semibold text-muted">
              <Clock size={15} className="text-muted" />
              <span>Horario semanal continuo</span>
            </div>
          )}
        </div>

        {/* Leyenda interactiva con colores y brillo */}
        <ul className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-medium">
          <li className="inline-flex items-center gap-2 text-bone">
            <span className="h-2.5 w-2.5 rounded-full bg-ok shadow-[0_0_8px_#22c55e]" />
            <span>Con entrenador</span>
          </li>
          <li className="inline-flex items-center gap-2 text-muted">
            <span className="h-2.5 w-2.5 rounded-full bg-zinc-500" />
            <span>Sala libre</span>
          </li>
          <li className="inline-flex items-center gap-2 text-warn">
            <span className="h-2.5 w-2.5 rounded-full bg-warn shadow-[0_0_8px_#f59e0b]" />
            <span>Pase por día (S/ 10)</span>
          </li>
        </ul>
      </div>

      {/* Tarjetas de horarios de los 3 bloques semanales */}
      <div className="space-y-5">
        {HORARIOS.map((dia) => {
          const esHoy = dia.id === hoyId;
          return (
            <div
              key={dia.id}
              className={`rounded-3xl border p-6 sm:p-7 transition-all duration-300 ${
                esHoy
                  ? 'border-brand/80 bg-surface shadow-[0_15px_40px_-15px_rgba(255,194,26,0.18)] ring-1 ring-brand/40'
                  : 'border-line/80 bg-surface/80 hover:border-line'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3 pb-5">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl border ${
                      esHoy
                        ? 'border-brand/60 bg-brand/10 text-brand'
                        : 'border-line bg-ink text-muted'
                    }`}
                  >
                    <Calendar size={18} strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="font-[family-name:var(--font-archivo)] text-xl sm:text-2xl font-black italic tracking-wide text-bone">
                      {dia.etiqueta}
                    </h3>
                    <p className="text-xs text-muted">
                      {dia.id === 'lv'
                        ? 'Supervisión en mañana y tarde/noche · Mediodía libre'
                        : dia.id === 'sab'
                        ? 'Entrenamiento de fin de semana con entrenador'
                        : 'Apertura dominical con pase suelto en recepción'}
                    </p>
                  </div>
                </div>

                {esHoy && (
                  <span className="rounded-full bg-brand px-3 py-1 text-xs font-black uppercase tracking-wider text-brand-ink shadow-md">
                    HOY
                  </span>
                )}
              </div>

              {/* Barra de progreso / Línea de tiempo visual con horas */}
              <div className="relative mt-2">
                {/* Eje de horas visible */}
                <div className="relative mb-2 hidden h-4 text-[10px] font-medium text-muted/70 sm:block" aria-hidden="true">
                  {TICKS.map((t) => (
                    <span
                      key={t}
                      className="absolute -translate-x-1/2 tabular-nums"
                      style={{ left: `${pct(t)}%` }}
                    >
                      {tickLabel(t)}
                    </span>
                  ))}
                </div>

                {/* Barra interactiva con brillo y profundidad */}
                <div className="relative h-9 sm:h-10 rounded-xl bg-ink p-1 border border-line/70 overflow-hidden shadow-inner">
                  {/* Guías de fondo */}
                  {TICKS.map((t) => (
                    <span
                      key={t}
                      aria-hidden="true"
                      className="absolute inset-y-0 w-px bg-line/30 pointer-events-none"
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
                        className={`group absolute inset-y-1 rounded-lg cursor-pointer transition-all ${COLOR[b.tipo]}`}
                        style={{
                          left: `${pct(b.desde)}%`,
                          width: `${pct(b.hasta) - pct(b.desde)}%`,
                        }}
                      >
                        <span
                          role="tooltip"
                          className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-line bg-ink px-3.5 py-1.5 text-xs font-bold text-bone opacity-0 shadow-2xl transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 tabular-nums"
                        >
                          {rango} · {ETIQUETA_TIPO[b.tipo]}
                        </span>
                      </span>
                    );
                  })}

                  {/* Aguja de tiempo en vivo "ahora" */}
                  {esHoy && ahoraVisible && minuto !== null && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-y-0 z-20 w-0.5 bg-white shadow-[0_0_12px_#ffffff]"
                      style={{ left: `${pct(minuto)}%` }}
                    >
                      <span className="absolute -top-1 left-1/2 -translate-x-1/2 rounded-full bg-white px-1.5 py-0.2 text-[9px] font-black uppercase text-ink shadow-md">
                        ahora
                      </span>
                    </span>
                  )}
                </div>
              </div>

              {/* Turnos en badges destacados */}
              <div className="mt-5 flex flex-wrap gap-2.5 pt-1">
                {dia.bloques.map((b) => (
                  <div
                    key={b.desde}
                    className="inline-flex items-center gap-2 rounded-xl border border-line/80 bg-ink/75 px-3.5 py-2 text-xs text-bone shadow-sm"
                  >
                    {getTurnoIcon(b.desde)}
                    <span className="font-bold tabular-nums text-white">
                      {formatoHora(b.desde)} – {formatoHora(b.hasta)}
                    </span>
                    <span className="text-muted/90 font-medium">· {ETIQUETA_TIPO[b.tipo]}</span>
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
