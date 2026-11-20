'use client';

import {
  AlertTriangle,
  CircleDollarSign,
  Clock,
  Edit3,
  LogIn,
  MessageCircle,
  Phone,
  RefreshCw,
  X,
} from 'lucide-react';
import { WeeklyAttendanceCalendar } from '@/components/WeeklyAttendanceCalendar';
import { estadoDatosSocio, formatearNombreSocio, hoyLima, soles } from '@/lib/formato';
import type { Asistencia, Semaforo, SocioEstado } from '@/types';

interface Props {
  socio: SocioEstado;
  asistencias?: Asistencia[];
  registrando: boolean;
  yaIngreso: boolean;
  onCheckIn: () => void;
  onRenovar: () => void;
  onCobrarSaldo: () => void;
  onEditarDatos?: () => void;
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
  onEditarDatos,
  onLimpiar,
}: Props) {
  const est = BADGE_SEMAFORO[socio.semaforo];
  const { titular, detalles } = describir(socio);
  const puedeEntrar = socio.semaforo !== 'ROJO';
  const datosPendientes = estadoDatosSocio(socio);

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
      className={`panel-card panel-fade-in space-y-4 p-4 sm:p-6 ${est.acento}`}
    >
      {/* Fila 1: Identidad del socio + acciones inmediatas para recepción */}
      <div className="flex flex-col justify-between gap-4 border-b border-line/70 pb-4 lg:flex-row lg:items-center">
        <div className="flex min-w-0 items-start gap-3.5 sm:items-center">
          <div
            aria-hidden="true"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-brand/15 font-display text-lg font-bold tracking-wider text-brand ring-1 ring-brand/30"
          >
            {iniciales || 'S'}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-lg font-bold leading-tight text-bone sm:text-xl">
                {formatearNombreSocio(socio)}
              </h2>
              <span
                className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[11px] font-semibold ${est.badge}`}
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

            <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted">
              <span className="font-mono font-semibold text-bone">DNI {socio.dni}</span>
              {datosPendientes.dniProvisional && (
                <span className="rounded bg-warn/15 px-1.5 py-0.5 text-[10px] font-semibold text-warn ring-1 ring-warn/30">
                  Provisional
                </span>
              )}
              <span aria-hidden="true">·</span>
              {socio.telefono ? (
                <span className="inline-flex items-center gap-1 font-mono">
                  <Phone size={11} /> {socio.telefono}
                </span>
              ) : (
                onEditarDatos && (
                  <button
                    type="button"
                    onClick={onEditarDatos}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-brand hover:underline"
                  >
                    + Teléfono
                  </button>
                )
              )}
            </div>
          </div>
        </div>

        {/* Acciones directas arriba para operar en 1 segundo */}
        <div className="flex flex-wrap items-center gap-2 lg:shrink-0">
          {puedeEntrar && (
            <button
              onClick={onCheckIn}
              disabled={registrando || yaAsistioHoy}
              className="btn btn-primary !min-h-10 !px-5 text-sm"
            >
              <LogIn size={16} strokeWidth={1.75} />
              {yaAsistioHoy ? 'Ingreso ya registrado' : 'Registrar ingreso'}
            </button>
          )}

          <button
            onClick={onRenovar}
            className={`btn !min-h-10 text-xs sm:text-sm ${
              socio.semaforo === 'ROJO' ? 'btn-primary !px-5' : 'btn-secondary'
            }`}
          >
            <RefreshCw size={15} strokeWidth={1.75} />
            Renovar membresía
          </button>

          {socio.saldo_pendiente > 0 && (
            <button onClick={onCobrarSaldo} className="btn btn-ghost !min-h-10 text-xs tabular-nums">
              <CircleDollarSign size={15} strokeWidth={1.75} />
              Cobrar ({soles(socio.saldo_pendiente)})
            </button>
          )}

          {onEditarDatos && (
            <button
              type="button"
              onClick={onEditarDatos}
              className={`btn !min-h-10 text-xs ${
                datosPendientes.incompleto
                  ? 'btn-secondary !border-warn/60 text-warn hover:!border-warn'
                  : 'btn-ghost'
              }`}
            >
              <Edit3 size={15} strokeWidth={1.75} />
              {datosPendientes.incompleto ? 'Completar datos' : 'Editar datos'}
            </button>
          )}

          {onLimpiar && (
            <button
              type="button"
              onClick={onLimpiar}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-line/70 bg-surface-2/80 text-muted transition-colors hover:border-bone/40 hover:text-bone"
              aria-label="Cerrar ficha del socio"
              title="Cerrar ficha (Esc)"
            >
              <X size={15} strokeWidth={1.75} />
            </button>
          )}
        </div>
      </div>

      {/* Fila 2: Alertas operativas puntuales (solo aparecen cuando aplican) */}
      {(datosPendientes.incompleto ||
        socio.saldo_pendiente > 0 ||
        estaInactivo ||
        (puedeEntrar && ingresoPrevioHoy)) && (
        <div className="space-y-2.5">
          {onEditarDatos && datosPendientes.incompleto && (
            <div className="flex flex-col items-start justify-between gap-2.5 rounded-xs border-l-4 border-warn bg-warn/15 px-3.5 py-2.5 sm:flex-row sm:items-center">
              <div>
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-warn sm:text-sm">
                  <AlertTriangle size={15} strokeWidth={2} />
                  DATOS PENDIENTES DE COMPLETAR
                </span>
                <p className="mt-0.5 text-xs leading-relaxed text-bone">
                  Falta:{' '}
                  {[
                    datosPendientes.dniProvisional ? 'DNI real' : null,
                    datosPendientes.nombrePendiente ? 'nombre o apellido completo' : null,
                    datosPendientes.sinTelefono ? 'teléfono' : null,
                  ]
                    .filter(Boolean)
                    .join(', ')}
                  . Pídelo ahora que ingresó y actualízalo aquí mismo.
                </p>
              </div>
              <button
                type="button"
                onClick={onEditarDatos}
                className="btn btn-primary shrink-0 !min-h-8 !px-3 text-xs"
              >
                <Edit3 size={13} strokeWidth={1.75} />
                Completar datos ahora
              </button>
            </div>
          )}

          {socio.saldo_pendiente > 0 && (
            <div className="flex flex-col items-start justify-between gap-2.5 rounded-xs border-l-4 border-bad bg-bad/15 px-3.5 py-2.5 sm:flex-row sm:items-center">
              <div>
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-bad sm:text-sm">
                  <AlertTriangle size={15} strokeWidth={2} />
                  SOCIO MOROSO · SALDO PENDIENTE
                </span>
                <p className="mt-0.5 text-xs leading-relaxed text-bone">
                  Debe <strong className="font-bold text-bad tabular-nums">{soles(socio.saldo_pendiente)}</strong> del plan {socio.plan}.
                  {diasAtraso > 0 && ` Atraso de ${diasAtraso} ${diasAtraso === 1 ? 'día' : 'días'} desde su inicio (${socio.fecha_inicio}).`}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
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

          {estaInactivo && (
            <div className="flex flex-col items-start justify-between gap-2.5 rounded-xs border-l-4 border-warn bg-warn/15 px-3.5 py-2.5 sm:flex-row sm:items-center">
              <div>
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-warn sm:text-sm">
                  <Clock size={15} strokeWidth={2} />
                  ALERTA DE ABANDONO · {diasSinVenir} DÍAS SIN ENTRENAR
                </span>
                <p className="mt-0.5 text-xs leading-relaxed text-bone">
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
                  className="btn btn-secondary shrink-0 !min-h-8 !px-3 text-xs"
                >
                  <MessageCircle size={14} className="text-ok" />
                  Motivar por WhatsApp
                </a>
              )}
            </div>
          )}

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
        </div>
      )}

      {/* Fila 3: Grilla de 2 columnas -> Vigencia/Ciclo a la izquierda + Constancia semanal a la derecha */}
      <div className="grid items-stretch gap-4 lg:grid-cols-12">
        <div className="flex h-full flex-col justify-between gap-4 rounded-md border border-line/80 bg-ink/60 p-4 lg:col-span-5">
          <div className="flex items-center gap-4">
            <div className="relative flex h-16 w-16 shrink-0 items-center justify-center">
              <svg className="h-16 w-16 -rotate-90" viewBox="0 0 72 72" aria-hidden="true">
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
                <span className="font-mono text-base font-bold leading-none text-bone tabular-nums">
                  {socio.dias_restantes === null
                    ? '—'
                    : socio.dias_restantes < 0
                    ? Math.abs(socio.dias_restantes)
                    : socio.dias_restantes}
                </span>
                <span className="mt-0.5 text-[8px] font-semibold uppercase tracking-wider text-muted">
                  {socio.dias_restantes !== null && socio.dias_restantes < 0 ? 'venc.' : 'días'}
                </span>
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="font-display text-2xl leading-none tracking-wide text-bone tabular-nums sm:text-3xl">
                {titular.toUpperCase()}
              </h3>
              {detalles.length > 0 && (
                <p className="mt-1.5 truncate text-xs font-medium text-muted tabular-nums sm:text-sm">
                  {detalles.join(' · ')}
                </p>
              )}
            </div>
          </div>

          {socio.fecha_inicio && socio.fecha_fin && (
            <div className="rounded-md border border-line/60 bg-ink/50 px-3.5 py-2.5">
              <div className="flex items-center justify-between gap-2 text-[11px] text-muted">
                <span>
                  Inicio: <strong className="font-mono text-bone">{socio.fecha_inicio}</strong>
                </span>
                <span className="font-mono font-semibold text-bone">{pctRestante}% disp.</span>
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
        </div>

        <div className="lg:col-span-7">
          <WeeklyAttendanceCalendar asistencias={asistencias} planNombre={socio.plan} />
        </div>
      </div>
    </article>
  );
}
