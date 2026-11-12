'use client';

import {
  AlertTriangle,
  CircleDollarSign,
  Clock,
  LogIn,
  MessageCircle,
  RefreshCw,
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
  const yaAsistioHoy = Boolean(ingresoPrevioHoy || yaIngreso);

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
            <LogIn size={17} strokeWidth={1.5} />
            {yaAsistioHoy ? 'Ingreso de hoy ya registrado' : 'Registrar ingreso'}
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
