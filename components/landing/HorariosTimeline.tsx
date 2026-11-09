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
  entrenador: 'bg-emerald-500',
  libre: 'bg-zinc-600',
  pase: 'bg-amber-500',
};

const PUNTO: Record<TipoBloque, string> = {
  entrenador: 'bg-emerald-400',
  libre: 'bg-zinc-400',
  pase: 'bg-amber-400',
};

const SPAN = EJE_FIN - EJE_INICIO;
const pct = (min: number) => ((min - EJE_INICIO) / SPAN) * 100;

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
    <div className="space-y-6">
      {/* Badge en vivo y leyenda superior minimalista */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line/60 pb-5">
        <div>
          {estado ? (
            <div className="inline-flex items-center gap-2.5 rounded-full border border-line bg-surface px-4 py-1.5 text-xs sm:text-sm font-semibold text-bone shadow-sm">
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
              <span>{estado.texto}</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-1.5 text-xs text-muted">
              <Clock size={14} className="text-muted" />
              <span>Horarios semanales</span>
            </div>
          )}
        </div>

        {/* Leyenda limpia de 3 colores */}
        <div className="flex flex-wrap items-center gap-4 text-xs font-medium">
          <span className="inline-flex items-center gap-1.5 text-bone">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span>Con entrenador</span>
          </span>
          <span className="inline-flex items-center gap-1.5 text-muted">
            <span className="h-2 w-2 rounded-full bg-zinc-500" />
            <span>Sala libre</span>
          </span>
          <span className="inline-flex items-center gap-1.5 text-amber-400">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            <span>Pase por día (S/ 10)</span>
          </span>
        </div>
      </div>

      {/* 3 filas minimalistas y claras */}
      <div className="space-y-4">
        {HORARIOS.map((dia) => {
          const esHoy = dia.id === hoyId;
          return (
            <div
              key={dia.id}
              className={`rounded-2xl border p-5 sm:p-6 transition-colors duration-200 ${
                esHoy
                  ? 'border-brand/70 bg-surface shadow-sm ring-1 ring-brand/30'
                  : 'border-line/70 bg-surface/60'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3">
                <div className="flex items-center gap-2.5">
                  <h3 className="font-[family-name:var(--font-archivo)] text-lg sm:text-xl font-bold tracking-tight text-bone">
                    {dia.etiqueta}
                  </h3>
                  {esHoy && (
                    <span className="rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-ink">
                      HOY
                    </span>
                  )}
                </div>
              </div>

              {/* Barra fina minimalista de tiempo */}
              <div className="relative my-2.5 h-2 w-full rounded-full bg-ink/90 overflow-hidden">
                {dia.bloques.map((b) => (
                  <span
                    key={b.desde}
                    className={`absolute inset-y-0 ${COLOR[b.tipo]}`}
                    style={{
                      left: `${pct(b.desde)}%`,
                      width: `${pct(b.hasta) - pct(b.desde)}%`,
                    }}
                  />
                ))}

                {/* Aguja de tiempo en vivo */}
                {esHoy && ahoraVisible && minuto !== null && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-y-0 z-10 w-1 bg-white shadow-[0_0_6px_#fff]"
                    style={{ left: `${pct(minuto)}%` }}
                  />
                )}
              </div>

              {/* Turnos limpios */}
              <div className="mt-3.5 flex flex-wrap gap-2">
                {dia.bloques.map((b) => (
                  <div
                    key={b.desde}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-line/60 bg-ink/70 px-3 py-1.5 text-xs text-bone"
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${PUNTO[b.tipo]}`} />
                    <span className="font-semibold tabular-nums">
                      {formatoHora(b.desde)} – {formatoHora(b.hasta)}
                    </span>
                    <span className="text-muted/80">· {ETIQUETA_TIPO[b.tipo]}</span>
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
