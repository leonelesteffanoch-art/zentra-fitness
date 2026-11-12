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
  const asistioAyer = asistencias.some((a) => a.fecha === ayer);
  const asistioHoy = diasSemana.find((d) => d.esHoy)?.asistio ?? false;

  return (
    <div className="space-y-2.5 bg-ink/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted">
          <CalendarDays size={14} strokeWidth={1.5} />
          <span>Calendario de asistencia semanal</span>
        </div>

        <div className="flex items-center gap-2 text-xs">
          {planNombre && (
            <span className="rounded-xs bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-muted">
              {esInterdiario ? 'Plan Interdiario' : 'Plan Diario'}
            </span>
          )}
          <span className="font-mono text-xs font-semibold text-bone">
            {totalDiasSemana} / {esInterdiario ? '3' : '6'} días esta sem.
          </span>
        </div>
      </div>

      {/* Grilla semanal Lun -> Sáb */}
      <div className="grid grid-cols-6 gap-1.5 text-center">
        {diasSemana.map((d) => (
          <div
            key={d.fecha}
            className={`flex flex-col items-center justify-between rounded-xs border px-1 py-2 transition-colors ${
              d.asistio
                ? 'border-ok/50 bg-ok/15 text-ok'
                : d.esHoy
                ? 'border-bone/50 bg-surface-2 text-bone'
                : 'border-line/60 bg-surface text-muted'
            }`}
          >
            <span className="text-[10px] font-medium uppercase">{d.etiqueta}</span>
            <span className="mt-0.5 font-mono text-xs font-bold">{d.numDia}</span>
            <div className="mt-1 flex h-4 items-center justify-center">
              {d.asistio ? (
                <span className="inline-flex items-center gap-0.5 font-mono text-[10px] font-semibold">
                  <Check size={11} strokeWidth={2} />
                  {d.horaTexto && <span className="hidden sm:inline">{d.horaTexto}</span>}
                </span>
              ) : d.esHoy ? (
                <span className="text-[9px] text-muted">Hoy</span>
              ) : (
                <span className="text-[10px] text-line">·</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Aviso preventivo para planes interdiarios */}
      {esInterdiario && (asistioAyer || totalDiasSemana >= 3) && !asistioHoy && (
        <p className="flex items-center gap-2 border-l-2 border-warn bg-warn/10 px-2.5 py-1.5 text-xs text-warn">
          <AlertTriangle size={14} strokeWidth={1.5} className="shrink-0" />
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
