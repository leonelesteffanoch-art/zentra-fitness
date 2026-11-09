'use client';

import { AlertTriangle, CircleDollarSign, LogIn, RefreshCw } from 'lucide-react';
import { WeeklyAttendanceCalendar } from '@/components/WeeklyAttendanceCalendar';
import { hoyLima, soles } from '@/lib/formato';
import type { Asistencia, Semaforo, SocioEstado } from '@/types';

interface Props {
  socio: SocioEstado;
  asistencias?: Asistencia[];
  registrando: boolean;
  yaIngreso: boolean;
  onCheckIn: () => void;
  onRenovar: () => void;
  onCobrarSaldo: () => void;
}

const BADGE_SEMAFORO: Record<Semaforo, { badge: string; acento: string; etiqueta: string }> = {
  VERDE: {
    badge: 'bg-ok/15 text-ok',
    acento: 'border-l-4 border-l-ok',
    etiqueta: 'Activo',
  },
  AMBAR: {
    badge: 'bg-warn/15 text-warn',
    acento: 'border-l-4 border-l-warn',
    etiqueta: 'Por vencer / Atención',
  },
  ROJO: {
    badge: 'bg-bad/15 text-bad',
    acento: 'border-l-4 border-l-bad',
    etiqueta: 'Vencido',
  },
};

function pluralDias(n: number) {
  return `${n} ${n === 1 ? 'día' : 'días'}`;
}

function describir(s: SocioEstado): { titular: string; detalles: string[] } {
  const detalles: string[] = [];
  const dias = s.dias_restantes;

  if (s.semaforo === 'ROJO') {
    if (dias === null || !s.membresia_id) return { titular: 'Sin membresía vigente', detalles };
    return {
      titular: `Venció hace ${pluralDias(Math.abs(dias))}`,
      detalles: s.plan ? [s.plan] : [],
    };
  }

  const titular = dias === 0 ? 'Vence hoy' : `${pluralDias(dias ?? 0)} restantes`;
  if (s.plan) detalles.push(`Plan ${s.plan}`);
  if (s.saldo_pendiente > 0) detalles.push(`Deuda pendiente: ${soles(s.saldo_pendiente)}`);
  return { titular, detalles };
}

function formatearHoraCorta(isoHora?: string): string {
  if (!isoHora) return '';
  try {
    return new Date(isoHora).toLocaleTimeString('es-PE', {
      timeZone: 'America/Lima',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export function MemberStatusCard({
  socio,
  asistencias = [],
  registrando,
  yaIngreso,
  onCheckIn,
  onRenovar,
  onCobrarSaldo,
}: Props) {
  const est = BADGE_SEMAFORO[socio.semaforo];
  const { titular, detalles } = describir(socio);
  const puedeEntrar = socio.semaforo !== 'ROJO';

  const hoy = hoyLima();
  const ingresoPrevioHoy = asistencias.find((a) => a.fecha === hoy);
  const horaPrevioHoy = formatearHoraCorta(ingresoPrevioHoy?.hora);
  const esInterdiario = Boolean(socio.plan && socio.plan.toLowerCase().includes('interdiario'));

  // Si ya tenía un ingreso hoy antes de abrir la ficha:
  // - Si es plan Diario -> avisar y permitir registrar 2° ingreso
  // - Si es plan Interdiario -> bloquear 2° ingreso en el mismo día
  const bloquearPorInterdiarioHoy = Boolean(ingresoPrevioHoy && esInterdiario);

  return (
    <article aria-live="polite" className={`space-y-5 bg-surface p-6 sm:p-8 ${est.acento}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <span
            className={`inline-block rounded-xs px-2.5 py-1 text-xs font-semibold ${est.badge}`}
          >
            {est.etiqueta}
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-bone tabular-nums sm:text-4xl">
            {titular}
          </h2>
          {detalles.length > 0 && (
            <p className="mt-2 text-sm text-muted tabular-nums">{detalles.join(' · ')}</p>
          )}
        </div>

        <div className="text-left sm:text-right">
          <p className="text-lg font-semibold text-bone">
            {socio.apellidos}, {socio.nombres}
          </p>
          <p className="mt-0.5 font-mono text-xs text-muted">DNI {socio.dni}</p>
          {socio.fecha_fin && (
            <p className="mt-0.5 text-xs text-muted">
              Vence el <span className="font-mono text-bone">{socio.fecha_fin}</span>
            </p>
          )}
        </div>
      </div>

      {/* Calendario semanal de asistencias (Lun a Dom) */}
      <WeeklyAttendanceCalendar asistencias={asistencias} planNombre={socio.plan} />

      {/* Aviso de doble ingreso el mismo día (Cardio mañana / Pesas noche) */}
      {puedeEntrar && ingresoPrevioHoy && !yaIngreso && (
        <div
          className={`flex items-start gap-2.5 border-l-2 px-3.5 py-2.5 text-xs ${
            esInterdiario
              ? 'border-bad bg-bad/10 text-bad'
              : 'border-warn bg-warn/10 text-warn'
          }`}
        >
          <AlertTriangle size={15} strokeWidth={1.5} className="mt-0.5 shrink-0" />
          <div>
            {esInterdiario ? (
              <p>
                <strong>Ya ingresó hoy{horaPrevioHoy ? ` a las ${horaPrevioHoy}` : ''}.</strong>{' '}
                Su plan es <strong>Interdiario</strong> y no permite doble ingreso en el mismo día.
              </p>
            ) : (
              <p>
                <strong>Ya ingresó hoy{horaPrevioHoy ? ` a las ${horaPrevioHoy}` : ''}.</strong>{' '}
                Como cuenta con plan <strong>Diario</strong>, puede registrar un segundo ingreso
                (ej. cardio en la mañana y pesas en la noche).
              </p>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 border-t border-line/70 pt-5">
        {puedeEntrar && (
          <button
            onClick={onCheckIn}
            disabled={registrando || yaIngreso || bloquearPorInterdiarioHoy}
            className="btn btn-primary !min-h-11 !px-6"
          >
            <LogIn size={17} strokeWidth={1.5} />
            {yaIngreso
              ? 'Ingreso registrado'
              : bloquearPorInterdiarioHoy
              ? 'Ya ingresó hoy (Plan Interdiario)'
              : ingresoPrevioHoy
              ? ' ¿Registrar 2° ingreso de hoy?'
              : 'Registrar ingreso'}
          </button>
        )}

        <button
          onClick={onRenovar}
          className={`btn !min-h-11 ${
            socio.semaforo === 'ROJO' ? 'btn-primary !px-6' : 'btn-secondary'
          }`}
        >
          <RefreshCw size={17} strokeWidth={1.5} />
          Renovar membresía
        </button>

        {socio.saldo_pendiente > 0 && (
          <button onClick={onCobrarSaldo} className="btn btn-ghost !min-h-11 tabular-nums">
            <CircleDollarSign size={17} strokeWidth={1.5} />
            Cobrar saldo ({soles(socio.saldo_pendiente)})
          </button>
        )}
      </div>
    </article>
  );
}
