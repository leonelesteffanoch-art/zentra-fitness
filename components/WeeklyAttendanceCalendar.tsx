'use client';

import { Check, CalendarDays, AlertTriangle } from 'lucide-react';
import { hoyLima, sumarDias } from '@/lib/formato';
import type { Asistencia } from '@/types';

const NOMBRES_DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function obtenerLunesSemanaActual(fechaHoyStr: string): string {
  const [y, m, d] = fechaHoyStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const diaSemana = dt.getUTCDay(); // 0 = Dom, 1 = Lun ... 6 = Sáb
  const offsetLunes = diaSemana === 0 ? -6 : 1 - diaSemana;
  return sumarDias(fechaHoyStr, offsetLunes);
}

function formatearHoraLima(isoHora: string): string {
  try {
    return new Date(isoHora).toLocaleTimeString('es-PE', {
      timeZone: 'America/Lima',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    return '';
  }
}

interface Props {
  asistencias: Asistencia[];
  planNombre?: string | null;
}

export function WeeklyAttendanceCalendar({ asistencias, planNombre }: Props) {
  const hoy = hoyLima();
  const ayer = sumarDias(hoy, -1);
  const lunes = obtenerLunesSemanaActual(hoy);

  // Construir los 6 días (Lunes a Sábado) de la semana en curso
  const diasSemana = NOMBRES_DIAS.map((etiqueta, idx) => {
    const fecha = sumarDias(lunes, idx);
    const registrosDia = asistencias.filter((a) => a.fecha === fecha);
    const asistio = registrosDia.length > 0;
    const horas = registrosDia.map((r) => formatearHoraLima(r.hora)).filter(Boolean);
    return {
      etiqueta,
      fecha,
      numDia: fecha.slice(8, 10),
      esHoy: fecha === hoy,
      asistio,
      cantidadIngresos: registrosDia.length,
      horaTexto: horas[0] ?? '',
    };
  });

  const totalDiasSemana = diasSemana.filter((d) => d.asistio).length;
  const esInterdiario = Boolean(planNombre && planNombre.toLowerCase().includes('interdiario'));
  const metaSemana = esInterdiario ? 3 : 6;
  const pctSemana = Math.min(100, Math.round((totalDiasSemana / metaSemana) * 100));
  const asistioAyer = asistencias.some((a) => a.fecha === ayer);
  const asistioHoy = diasSemana.find((d) => d.esHoy)?.asistio ?? false;

  return (
    <div className="space-y-3 rounded-md border border-line/80 bg-ink/70 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-medium text-bone">
          <CalendarDays size={15} strokeWidth={1.75} className="text-brand" />
          <span>Constancia semanal (Lun – Sáb)</span>
        </div>

        <div className="flex items-center gap-2 text-xs">
          {planNombre && (
            <span className="rounded border border-line bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-muted">
              {esInterdiario ? 'Modalidad Interdiario' : 'Modalidad Diario'}
            </span>
          )}
          <span className="rounded bg-brand/15 px-2 py-0.5 font-mono text-xs font-bold text-brand tabular-nums">
            {totalDiasSemana}/{metaSemana} días ({pctSemana}%)
          </span>
        </div>
      </div>

      {/* Barra de progreso semanal */}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
        <div
          className={`bar-fill h-full rounded-full ${
            pctSemana >= 100 ? 'bg-ok' : 'bg-brand'
          }`}
          style={{ width: `${pctSemana}%` }}
        />
      </div>

      {/* Grilla semanal Lun -> Sáb */}
      <div className="grid grid-cols-6 gap-2 text-center">
        {diasSemana.map((d) => (
          <div
            key={d.fecha}
            className={`relative flex flex-col items-center justify-between rounded-md border px-1.5 py-2.5 transition-all ${
              d.asistio
                ? 'border-ok/50 bg-ok/15 text-ok shadow-[inset_0_1px_0_0_rgba(34,197,94,0.2)]'
                : d.esHoy
                ? 'border-brand/60 bg-surface-2 text-bone ring-1 ring-brand/25'
                : 'border-line/60 bg-surface/70 text-muted'
            }`}
          >
            {d.esHoy && (
              <span
                aria-hidden="true"
                className={`absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full ${
                  d.asistio ? 'bg-ok' : 'bg-brand animate-pulse'
                }`}
              />
            )}
            <span className="text-[10px] font-semibold uppercase tracking-wider">{d.etiqueta}</span>
            <span className="mt-0.5 font-mono text-sm font-bold tabular-nums">{d.numDia}</span>
            <div className="mt-1.5 flex h-4 items-center justify-center">
              {d.asistio ? (
                <span className="inline-flex items-center gap-0.5 rounded bg-ok/20 px-1.5 py-0.5 font-mono text-[10px] font-bold text-ok">
                  <Check size={10} strokeWidth={2.5} />
                  {d.horaTexto && <span className="hidden sm:inline">{d.horaTexto}</span>}
                </span>
              ) : d.esHoy ? (
                <span className="text-[9px] font-semibold uppercase tracking-wider text-brand">
                  Hoy
                </span>
              ) : (
                <span className="text-[10px] text-line">—</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Aviso preventivo para planes interdiarios */}
      {esInterdiario && (asistioAyer || totalDiasSemana >= 3) && !asistioHoy && (
        <p className="flex items-center gap-2 rounded border-l-2 border-warn bg-warn/10 px-3 py-2 text-xs text-warn">
          <AlertTriangle size={14} strokeWidth={1.75} className="shrink-0" />
          <span>
            {totalDiasSemana >= 3
              ? `Atención: este socio tiene plan Interdiario y ya completó ${totalDiasSemana} asistencias esta semana.`
              : 'Atención: este socio tiene plan Interdiario y registró asistencia ayer.'}
          </span>
        </p>
      )}
    </div>
  );
}
