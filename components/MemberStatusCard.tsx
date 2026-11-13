'use client';

import {
  AlertTriangle,
  CircleDollarSign,
  Clock,
  LogIn,
  MessageCircle,
  Phone,
  RefreshCw,
  X,
} from 'lucide-react';
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
  onLimpiar?: () => void;
}

const BADGE_SEMAFORO: Record<
  Semaforo,
  { badge: string; acento: string; etiqueta: string; strokeColor: string; barColor: string }
> = {
  VERDE: {
    badge: 'bg-ok/15 text-ok ring-1 ring-ok/30',
    acento: 'border-l-4 border-l-ok',
    etiqueta: 'Membresía activa',
    strokeColor: '#22c55e',
    barColor: 'bg-ok',
  },
  AMBAR: {
    badge: 'bg-warn/15 text-warn ring-1 ring-warn/30',
    acento: 'border-l-4 border-l-warn',
    etiqueta: 'Por vencer / Atención',
    strokeColor: '#f59e0b',
    barColor: 'bg-warn',
  },
  ROJO: {
    badge: 'bg-bad/15 text-bad ring-1 ring-bad/30',
    acento: 'border-l-4 border-l-bad',
    etiqueta: 'Membresía vencida',
    strokeColor: '#ef4444',
    barColor: 'bg-bad',
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
  onLimpiar,
}: Props) {
  const est = BADGE_SEMAFORO[socio.semaforo];
  const { titular, detalles } = describir(socio);
  const puedeEntrar = socio.semaforo !== 'ROJO';

  const hoy = hoyLima();
  const ingresoPrevioHoy = asistencias.find((a) => a.fecha === hoy);
  const horaPrevioHoy = formatearHoraCorta(ingresoPrevioHoy?.hora);
  const yaAsistioHoy = Boolean(ingresoPrevioHoy || yaIngreso);

  // Cálculo de progreso de membresía (barra y anillo SVG)
  const duracionTotalDias =
    socio.fecha_inicio && socio.fecha_fin
      ? Math.max(
          1,
          Math.round(
            (new Date(socio.fecha_fin).getTime() - new Date(socio.fecha_inicio).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        )
      : 30;
  const diasRestantesPositivos = Math.max(0, socio.dias_restantes ?? 0);
  const pctRestante =
    socio.semaforo === 'ROJO'
      ? 0
      : Math.min(100, Math.max(4, Math.round((diasRestantesPositivos / duracionTotalDias) * 100)));

  const radioSvg = 30;
  const circunferencia = 2 * Math.PI * radioSvg;
  const dashOffset = circunferencia - (pctRestante / 100) * circunferencia;

  const iniciales = `${socio.nombres?.[0] ?? ''}${socio.apellidos?.[0] ?? ''}`.toUpperCase();

  // Cálculo de días de atraso en deuda
  const diasAtraso =
    socio.saldo_pendiente > 0 && socio.fecha_inicio
      ? Math.max(
          0,
          Math.floor(
            (new Date(hoy).getTime() - new Date(socio.fecha_inicio).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        )
      : 0;

  // Detección de inactividad (7-10+ días sin venir estando activo)
  const ultimaAsistencia = asistencias.length > 0 ? asistencias[0].fecha : null;
  const fechaReferencia = ultimaAsistencia ?? socio.fecha_inicio;
  const diasSinVenir =
    puedeEntrar && fechaReferencia
      ? Math.max(
          0,
          Math.floor(
            (new Date(hoy).getTime() - new Date(fechaReferencia).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        )
      : 0;
  const estaInactivo = puedeEntrar && diasSinVenir >= 7;

  return (
    <article
      aria-live="polite"
      className={`panel-card panel-fade-in relative space-y-5 p-5 sm:p-7 ${est.acento}`}
    >
      {onLimpiar && (
        <button
          type="button"
          onClick={onLimpiar}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-md border border-line/70 bg-surface-2/80 text-muted transition-colors hover:border-bone/40 hover:text-bone"
          aria-label="Cerrar ficha del socio"
          title="Cerrar ficha (Esc)"
        >
          <X size={15} strokeWidth={1.75} />
        </button>
      )}

      <div className="flex flex-col justify-between gap-5 pr-8 sm:flex-row sm:items-center">
        {/* Columna izquierda: Anillo gráfico + Estado principal */}
        <div className="flex items-center gap-4 sm:gap-5">
          <div className="relative flex h-20 w-20 shrink-0 items-center justify-center">
            <svg className="h-20 w-20 -rotate-90" viewBox="0 0 72 72" aria-hidden="true">
              <circle
                cx="36"
                cy="36"
                r={radioSvg}
                fill="none"
                stroke="#1c1c21"
                strokeWidth="6"
              />
              <circle
                cx="36"
                cy="36"
                r={radioSvg}
                fill="none"
                stroke={est.strokeColor}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={circunferencia}
                strokeDashoffset={dashOffset}
                className="transition-all duration-700 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="font-mono text-lg font-bold leading-none text-bone tabular-nums">
                {socio.dias_restantes === null
                  ? '—'
                  : socio.dias_restantes < 0
                  ? Math.abs(socio.dias_restantes)
                  : socio.dias_restantes}
              </span>
              <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-wider text-muted">
                {socio.dias_restantes !== null && socio.dias_restantes < 0 ? 'venc.' : 'días'}
              </span>
            </div>
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded px-2.5 py-0.5 text-xs font-semibold ${est.badge}`}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: est.strokeColor }}
                />
                {est.etiqueta}
              </span>
              {yaAsistioHoy && (
                <span className="inline-flex items-center gap-1 rounded bg-ok/15 px-2 py-0.5 text-[11px] font-semibold text-ok ring-1 ring-ok/30">
                  ✓ Asistió hoy {horaPrevioHoy && `(${horaPrevioHoy})`}
                </span>
              )}
            </div>

            <h2 className="mt-2 font-display text-3xl tracking-wide text-bone tabular-nums sm:text-4xl">
              {titular.toUpperCase()}
            </h2>
            {detalles.length > 0 && (
              <p className="mt-1 text-sm font-medium text-muted tabular-nums">
                {detalles.join(' · ')}
              </p>
            )}
          </div>
        </div>

        {/* Columna derecha: Identidad del socio */}
        <div className="flex items-center gap-3.5 rounded-md border border-line/70 bg-ink/50 p-3.5 sm:text-right">
          <div
            aria-hidden="true"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-brand/15 font-display text-lg font-bold tracking-wider text-brand ring-1 ring-brand/30 sm:order-2"
          >
            {iniciales || 'S'}
          </div>
          <div className="min-w-0 flex-1 sm:order-1">
            <p className="truncate text-base font-bold text-bone sm:text-lg">
              {socio.apellidos}, {socio.nombres}
            </p>
            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted sm:justify-end">
              <span className="font-mono font-semibold text-bone">DNI {socio.dni}</span>
              {socio.telefono && (
                <span className="inline-flex items-center gap-1 font-mono">
                  · <Phone size={11} /> {socio.telefono}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Barra gráfica de ciclo de membresía */}
      {socio.fecha_inicio && socio.fecha_fin && (
        <div className="rounded-md border border-line/60 bg-ink/40 px-4 py-3">
          <div className="flex items-center justify-between text-[11px] text-muted">
            <span>
              Inicio: <strong className="font-mono text-bone">{socio.fecha_inicio}</strong>
            </span>
            <span className="font-mono font-semibold text-bone">{pctRestante}% disponible</span>
            <span>
              Vence: <strong className="font-mono text-bone">{socio.fecha_fin}</strong>
            </span>
          </div>
          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-surface-2">
            <div
              className={`bar-fill h-full rounded-full ${est.barColor}`}
              style={{ width: `${pctRestante}%` }}
            />
          </div>
        </div>
      )}

      {/* Calendario semanal de asistencias (Lun a Sáb) */}
      <WeeklyAttendanceCalendar asistencias={asistencias} planNombre={socio.plan} />

      {/* Alerta de Moroso / Saldo Pendiente */}
      {socio.saldo_pendiente > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-l-4 border-bad bg-bad/15 p-4 rounded-xs">
          <div>
            <span className="inline-flex items-center gap-1.5 font-bold text-bad text-sm">
              <AlertTriangle size={16} strokeWidth={2} />
              SOCIO MOROSO · SALDO PENDIENTE
            </span>
            <p className="mt-1 text-xs text-bone leading-relaxed">
              Debe <strong className="text-bad tabular-nums font-bold">{soles(socio.saldo_pendiente)}</strong> del plan {socio.plan}.
              {diasAtraso > 0 && ` Atraso de ${diasAtraso} ${diasAtraso === 1 ? 'día' : 'días'} desde su inicio (${socio.fecha_inicio}).`}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onCobrarSaldo}
              className="btn btn-primary !min-h-8 !px-3 text-xs !bg-bad hover:!bg-bad/90"
            >
              <CircleDollarSign size={14} />
              Cobrar deuda
            </button>
            {socio.telefono && (
              <a
                href={`https://wa.me/51${socio.telefono.replace(/\D/g, '')}?text=${encodeURIComponent(
                  `Hola ${socio.nombres}, te saludamos de Zentra Fitness. Te recordamos cordialmente que mantienes un saldo pendiente de ${soles(
                    socio.saldo_pendiente
                  )} de tu membresía. Puedes cancelarlo en tu próximo ingreso o vía Yape/Plin. ¡Muchas gracias!`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary !min-h-8 !px-2.5 text-xs text-ok hover:text-ok"
                title="Enviar recordatorio por WhatsApp"
              >
                <MessageCircle size={14} />
                Recordar
              </a>
            )}
          </div>
        </div>
      )}

      {/* Alerta de Socio Inactivo (7+ días sin venir con membresía activa) */}
      {estaInactivo && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-l-4 border-warn bg-warn/15 p-4 rounded-xs">
          <div>
            <span className="inline-flex items-center gap-1.5 font-bold text-warn text-sm">
              <Clock size={16} strokeWidth={2} />
              ALERTA DE ABANDONO · {diasSinVenir} DÍAS SIN ENTRENAR
            </span>
            <p className="mt-1 text-xs text-bone leading-relaxed">
              {ultimaAsistencia
                ? `Su última visita registrada fue el ${ultimaAsistencia}.`
                : `Inició su membresía el ${socio.fecha_inicio} pero aún no registra check-in.`}
              {' '}Contáctalo para motivarlo antes de que pierda la constancia y no renueve.
            </p>
          </div>
          {socio.telefono && (
            <a
              href={`https://wa.me/51${socio.telefono.replace(/\D/g, '')}?text=${encodeURIComponent(
                `¡Hola ${socio.nombres}! Te extrañamos en Zentra Fitness 💪 Notamos que llevas ${diasSinVenir} días sin venir a entrenar. Recuerda que tu membresía ${
                  socio.plan ? `(${socio.plan})` : ''
                } sigue activa y la constancia es la clave para tus resultados. ¿Tienes algún horario disponible esta semana para retomar? ¡Te esperamos en la sala!`
              )}`}
              target="_blank"
              rel="noreferrer"
              className="btn btn-secondary !min-h-8 !px-3 text-xs shrink-0"
            >
              <MessageCircle size={14} className="text-ok" />
              Motivar por WhatsApp
            </a>
          )}
        </div>
      )}

      {/* Aviso si ya ingresó hoy */}
      {puedeEntrar && ingresoPrevioHoy && (
        <div className="flex items-start gap-2.5 border-l-2 border-warn bg-warn/10 px-3.5 py-2.5 text-xs text-warn">
          <AlertTriangle size={15} strokeWidth={1.5} className="mt-0.5 shrink-0" />
          <p>
            <strong>Ya registró su ingreso de hoy{horaPrevioHoy ? ` a las ${horaPrevioHoy}` : ''}.</strong>{' '}
            Ningún plan incluye doble ingreso en el mismo día. Para un segundo ingreso corresponde abonar un{' '}
            <strong>Pase por día (S/ 10)</strong> en mostrador.
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 border-t border-line/70 pt-5">
        {puedeEntrar && (
          <button
            onClick={onCheckIn}
            disabled={registrando || yaAsistioHoy}
            className="btn btn-primary !min-h-11 !px-6"
          >
            <LogIn size={17} strokeWidth={1.75} />
            {yaAsistioHoy ? 'Ingreso de hoy ya registrado' : 'Registrar ingreso'}
          </button>
        )}

        <button
          onClick={onRenovar}
          className={`btn !min-h-11 ${
            socio.semaforo === 'ROJO' ? 'btn-primary !px-6' : 'btn-secondary'
          }`}
        >
          <RefreshCw size={17} strokeWidth={1.75} />
          Renovar membresía
        </button>

        {socio.saldo_pendiente > 0 && (
          <button onClick={onCobrarSaldo} className="btn btn-ghost !min-h-11 tabular-nums">
            <CircleDollarSign size={17} strokeWidth={1.75} />
            Cobrar saldo ({soles(socio.saldo_pendiente)})
          </button>
        )}
      </div>
    </article>
  );
}
