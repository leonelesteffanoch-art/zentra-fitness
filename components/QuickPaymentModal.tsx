'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, X } from 'lucide-react';
import { listarPlanes, registrarMembresia, abonarMembresia } from '@/services/sociosService';
import { hoyLima, sumarDias, soles } from '@/lib/formato';
import type { MetodoPago, PagoInput, Plan, SocioEstado } from '@/types';

export type ModoCobro = 'renovar' | 'abonar';

interface Props {
  modo: ModoCobro;
  socio: SocioEstado;
  gymId: string;
  hayTurno: boolean;
  onClose: () => void;
  onDone: (mensaje: string) => void;
}

interface LineaPago {
  metodo: MetodoPago;
  monto: string;
}

const METODOS: MetodoPago[] = ['Efectivo', 'Yape', 'Plin', 'Tarjeta'];

function inicioSugerido(socio: SocioEstado): string {
  if (socio.fecha_fin && socio.dias_restantes !== null && socio.dias_restantes >= 0) {
    return socio.fecha_fin;
  }
  return hoyLima();
}

export function QuickPaymentModal({ modo, socio, gymId, hayTurno, onClose, onDone }: Props) {
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [planId, setPlanId] = useState<string | null>(null);
  const [fechaInicio, setFechaInicio] = useState(inicioSugerido(socio));
  const [lineas, setLineas] = useState<LineaPago[]>([{ metodo: 'Efectivo', monto: '' }]);
  const [cargando, setCargando] = useState(modo === 'renovar');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Regla de negocio: Pagos a cuenta permitidos para antiguos miembros, no para nuevos
  const esSocioNuevo = !socio.membresia_id;

  useEffect(() => {
    if (modo !== 'renovar') return;
    listarPlanes(gymId)
      .then(setPlanes)
      .catch((e: Error) => setError(e.message))
      .finally(() => setCargando(false));
  }, [modo, gymId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const plan = planes.find((p) => p.id === planId) ?? null;
  const total = modo === 'renovar' ? (plan?.precio ?? 0) : socio.saldo_pendiente;
  const pagado = useMemo(
    () => lineas.reduce((s, l) => s + (Number(l.monto) || 0), 0),
    [lineas]
  );
  const pendiente = Math.round((total - pagado) * 100) / 100;

  const motivoBloqueo = (() => {
    if (modo === 'renovar' && !plan) return 'Elige un plan';
    if (pagado > total) return 'El pago supera el total';
    if (modo === 'renovar' && esSocioNuevo && pendiente > 0) {
      return 'Socio nuevo: la primera inscripción debe cancelarse completa (pagos a cuenta solo aplican a miembros antiguos)';
    }
    if (modo === 'abonar' && pagado <= 0) return 'Ingresa el monto a abonar';
    if (pagado > 0 && !hayTurno) return 'Abre un turno de caja para cobrar';
    return null;
  })();

  function pagarTodoCon(metodo: MetodoPago) {
    setLineas([{ metodo, monto: total ? total.toFixed(2) : '' }]);
  }

  function actualizar(i: number, cambio: Partial<LineaPago>) {
    setLineas((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...cambio } : l)));
  }

  async function confirmar() {
    setError(null);
    setEnviando(true);
    const pagos: PagoInput[] = lineas
      .filter((l) => Number(l.monto) > 0)
      .map((l) => ({ metodo: l.metodo, monto: Number(l.monto) }));
    try {
      if (modo === 'renovar' && plan) {
        await registrarMembresia(socio.socio_id, plan.id, fechaInicio, pagos);
        onDone(
          pendiente > 0
            ? `Membresía registrada. Queda a cuenta ${soles(pendiente)}`
            : 'Membresía registrada y pagada'
        );
      } else if (socio.membresia_id) {
        await abonarMembresia(socio.membresia_id, pagos);
        onDone(pendiente > 0 ? `Abono registrado. Resta ${soles(pendiente)}` : 'Deuda saldada');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo registrar el cobro');
      setEnviando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 sm:items-center sm:p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cobro-titulo"
        className="max-h-full w-full max-w-xl overflow-y-auto border border-line bg-surface"
      >
        <header className="flex items-start justify-between border-b border-line/80 p-5">
          <div>
            <p className="text-xs text-muted">
              {socio.apellidos}, {socio.nombres} ·{' '}
              <span className="text-bone">
                {esSocioNuevo ? 'Inscripción de socio nuevo' : 'Socio antiguo'}
              </span>
            </p>
            <h2 id="cobro-titulo" className="section-title mt-0.5 text-xl">
              {modo === 'renovar'
                ? esSocioNuevo
                  ? 'Asignar primer plan'
                  : 'Renovar membresía'
                : 'Cobrar saldo pendiente'}
            </h2>
          </div>
          <button onClick={onClose} className="btn btn-ghost !min-h-9 !px-2" aria-label="Cerrar">
            <X size={18} strokeWidth={1.5} />
          </button>
        </header>

        <div className="space-y-6 p-5">
          {modo === 'renovar' && (
            <>
              <fieldset>
                <legend className="label">Plan</legend>
                {cargando ? (
                  <Loader2 className="animate-spin text-muted" strokeWidth={1.5} />
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {planes.map((p) => {
                      const activo = planId === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setPlanId(p.id);
                            setLineas([{ metodo: 'Efectivo', monto: p.precio.toFixed(2) }]);
                          }}
                          aria-pressed={activo}
                          className={`rounded-xs p-3.5 text-left transition-colors ${
                            activo
                              ? 'bg-surface-2 ring-1 ring-brand'
                              : 'bg-surface-2/60 hover:bg-surface-2'
                          }`}
                        >
                          <div className="flex items-baseline justify-between">
                            <span className="font-semibold text-bone">{p.nombre}</span>
                            <span className="text-base font-bold text-bone tabular-nums">
                              {soles(p.precio)}
                            </span>
                          </div>
                          <span className="mt-0.5 block text-xs text-muted">
                            {p.duracion_dias === 1 ? '1 día' : `${p.duracion_dias} días`}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </fieldset>

              <div>
                <label htmlFor="fecha-inicio" className="label">
                  Fecha de inicio
                </label>
                <input
                  id="fecha-inicio"
                  type="date"
                  value={fechaInicio}
                  min={sumarDias(hoyLima(), -30)}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="field font-mono"
                />
              </div>
            </>
          )}

          <div className="flex items-baseline justify-between border-y border-line/70 py-3">
            <span className="text-sm text-muted">
              {modo === 'renovar' ? 'Total del plan' : 'Saldo pendiente'}
            </span>
            <span className="text-2xl font-bold text-bone tabular-nums">{soles(total)}</span>
          </div>

          <fieldset>
            <legend className="label">Pago rápido completo</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {METODOS.map((m) => (
                <button
                  key={m}
                  type="button"
                  disabled={total <= 0}
                  onClick={() => pagarTodoCon(m)}
                  className="btn btn-secondary !min-h-9"
                >
                  {m}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="label">
              {esSocioNuevo
                ? 'Detalle del pago (efectivo, digital o mixto — sin deuda para nuevos)'
                : 'Detalle del pago (mixto o pago a cuenta para socio antiguo)'}
            </legend>
            {lineas.map((l, i) => (
              <div key={i} className="flex gap-2">
                <select
                  aria-label={`Método de pago ${i + 1}`}
                  value={l.metodo}
                  onChange={(e) => actualizar(i, { metodo: e.target.value as MetodoPago })}
                  className="field !w-36"
                >
                  {METODOS.map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
                <input
                  aria-label={`Monto ${i + 1}`}
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.50"
                  placeholder="0.00"
                  value={l.monto}
                  onChange={(e) => actualizar(i, { monto: e.target.value })}
                  className="field tabular-nums"
                />
                {lineas.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setLineas((ls) => ls.filter((_, idx) => idx !== i))}
                    className="btn btn-ghost !px-3"
                    aria-label="Quitar método"
                  >
                    <X size={16} strokeWidth={1.5} />
                  </button>
                )}
              </div>
            ))}
            {lineas.length < METODOS.length && (
              <button
                type="button"
                onClick={() => {
                  const usados = lineas.map((l) => l.metodo);
                  const libre = METODOS.find((m) => !usados.includes(m)) ?? 'Yape';
                  setLineas((ls) => [
                    ...ls,
                    { metodo: libre, monto: pendiente > 0 ? pendiente.toFixed(2) : '' },
                  ]);
                }}
                className="inline-flex items-center gap-1 text-xs font-medium text-bone hover:underline"
              >
                <Plus size={14} strokeWidth={1.5} /> Agregar otro método
              </button>
            )}
          </fieldset>

          <dl className="flex items-center justify-between bg-surface-2 px-4 py-3 text-sm">
            <div>
              <dt className="text-xs text-muted">Recibido</dt>
              <dd className="text-lg font-semibold text-bone tabular-nums">{soles(pagado)}</dd>
            </div>
            <div className="text-right">
              <dt className="text-xs text-muted">Queda a cuenta</dt>
              <dd
                className={`text-lg font-semibold tabular-nums ${
                  pendiente > 0 ? 'text-warn' : 'text-bone'
                }`}
              >
                {soles(Math.max(pendiente, 0))}
              </dd>
            </div>
          </dl>

          {(error ||
            (motivoBloqueo &&
              ((pagado > 0 && !hayTurno) || (esSocioNuevo && plan && pendiente > 0)))) && (
            <p
              role="alert"
              className="border-l-2 border-bad bg-bad/10 px-3 py-2 text-xs text-bad"
            >
              {error ?? motivoBloqueo}
            </p>
          )}
        </div>

        <footer className="flex flex-col gap-2 border-t border-line/80 p-5 sm:flex-row sm:justify-end">
          <button onClick={onClose} className="btn btn-ghost">
            Cancelar
          </button>
          <button
            onClick={confirmar}
            disabled={enviando || motivoBloqueo !== null}
            title={motivoBloqueo ?? undefined}
            className="btn btn-primary !px-6"
          >
            {enviando && <Loader2 size={16} strokeWidth={1.5} className="animate-spin" />}
            {modo === 'renovar' && pagado === 0 ? 'Registrar a cuenta' : 'Confirmar cobro'}
          </button>
        </footer>
      </div>
    </div>
  );
}
