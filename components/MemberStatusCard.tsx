'use client';

import { CircleDollarSign, LogIn, RefreshCw } from 'lucide-react';
import { soles } from '@/lib/formato';
import type { Semaforo, SocioEstado } from '@/types';

interface Props {
  socio: SocioEstado;
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

export function MemberStatusCard({
  socio,
  registrando,
  yaIngreso,
  onCheckIn,
  onRenovar,
  onCobrarSaldo,
}: Props) {
  const est = BADGE_SEMAFORO[socio.semaforo];
  const { titular, detalles } = describir(socio);
  const puedeEntrar = socio.semaforo !== 'ROJO';

  return (
    <article
      aria-live="polite"
      className={`bg-surface p-6 sm:p-8 ${est.acento}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className={`inline-block rounded-xs px-2.5 py-1 text-xs font-semibold ${est.badge}`}>
            {est.etiqueta}
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-bone tabular-nums sm:text-4xl">
            {titular}
          </h2>
          {detalles.length > 0 && (
            <p className="mt-2 text-sm text-muted tabular-nums">
              {detalles.join(' · ')}
            </p>
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

      <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-line/70 pt-5">
        {puedeEntrar && (
          <button
            onClick={onCheckIn}
            disabled={registrando || yaIngreso}
            className="btn btn-primary !min-h-11 !px-6"
          >
            <LogIn size={17} strokeWidth={1.5} />
            {yaIngreso ? 'Ingreso registrado' : 'Registrar ingreso'}
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
