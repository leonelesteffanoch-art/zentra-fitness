'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Check, Loader2, X } from 'lucide-react';
import { Portal } from '@/components/Portal';
import {
  editarMembresia,
  listarPlanes,
  obtenerMembresiaEstadoPorId,
} from '@/services/sociosService';
import { diffDiasISO, formatearFechaDMY, soles, sumarDias } from '@/lib/formato';
import type { MembresiaEstado, Plan } from '@/types';

interface Props {
  gymId: string;
  socioNombre: string;
  membresiaId: string;
  membresiaInicial?: MembresiaEstado | null;
  onClose: () => void;
  onSaved: (mensaje: string) => void;
}

export function EditMembershipModal({
  gymId,
  socioNombre,
  membresiaId,
  membresiaInicial,
  onClose,
  onSaved,
}: Props) {
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [planId, setPlanId] = useState(membresiaInicial?.plan_id ?? '');
  const [fechaInicio, setFechaInicio] = useState(membresiaInicial?.fecha_inicio ?? '');
  const [fechaFin, setFechaFin] = useState(membresiaInicial?.fecha_fin ?? '');
  const [saldoPendiente, setSaldoPendiente] = useState(
    membresiaInicial ? String(membresiaInicial.saldo_pendiente) : '0'
  );
  const [montoPagado, setMontoPagado] = useState(membresiaInicial?.monto_pagado ?? 0);

  const [cargando, setCargando] = useState(!membresiaInicial);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    let cancelado = false;
    Promise.all([
      listarPlanes(gymId),
      membresiaInicial
        ? Promise.resolve(membresiaInicial)
        : obtenerMembresiaEstadoPorId(membresiaId),
    ])
      .then(([listaPlanes, mem]) => {
        if (cancelado) return;
        setPlanes(listaPlanes);
        if (mem) {
          setPlanId(mem.plan_id);
          setFechaInicio(mem.fecha_inicio);
          setFechaFin(mem.fecha_fin);
          setSaldoPendiente(String(mem.saldo_pendiente));
          setMontoPagado(Number(mem.monto_pagado ?? 0));
        } else {
          setError('No se encontró la membresía para editar');
        }
      })
      .catch((err: Error) => {
        if (!cancelado) setError(err.message);
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [gymId, membresiaId, membresiaInicial]);

  const planSeleccionado = planes.find((p) => p.id === planId) ?? null;
  const diasVigencia = fechaFin ? diffDiasISO(fechaFin) : null;
  const diferenciaPlan =
    planSeleccionado && planSeleccionado.precio > montoPagado
      ? Math.round((planSeleccionado.precio - montoPagado) * 100) / 100
      : null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!planId) {
      setError('Selecciona un plan');
      return;
    }
    if (!fechaInicio || !fechaFin) {
      setError('Completa las fechas de inicio y vencimiento');
      return;
    }
    if (fechaFin < fechaInicio) {
      setError('La fecha de vencimiento no puede ser anterior al inicio');
      return;
    }

    const saldoNum = Math.round((Number(saldoPendiente) || 0) * 100) / 100;
    if (saldoNum < 0) {
      setError('El saldo pendiente no puede ser negativo');
      return;
    }

    setGuardando(true);
    try {
      await editarMembresia({
        membresiaId,
        planId,
        fechaInicio,
        fechaFin,
        saldoPendiente: saldoNum,
      });
      onSaved('Membresía actualizada correctamente.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar la membresía');
      setGuardando(false);
    }
  }

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-xs sm:items-center sm:p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="editar-membresia-titulo"
          className="modal-animate max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-lg border border-line bg-surface"
        >
          <header className="flex items-start justify-between border-b border-line/80 px-5 py-4">
            <div>
              <p className="text-xs text-muted">{socioNombre}</p>
              <h2 id="editar-membresia-titulo" className="section-title mt-0.5 text-xl">
                Editar plan y vigencia
              </h2>
            </div>
            <button onClick={onClose} className="btn btn-ghost !min-h-8 !px-2" aria-label="Cerrar">
              <X size={18} strokeWidth={1.5} />
            </button>
          </header>

          <form onSubmit={handleSubmit} className="space-y-4 p-5">
            {cargando ? (
              <div className="flex items-center gap-2 py-8 text-sm text-muted">
                <Loader2 size={18} className="animate-spin" /> Cargando datos de la membresía...
              </div>
            ) : (
              <>
                <fieldset>
                  <legend className="label">Plan asignado</legend>
                  <div className="grid grid-cols-2 gap-1.5">
                    {planes.map((p) => {
                      const activo = planId === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setPlanId(p.id);
                            if (fechaInicio) {
                              setFechaFin(sumarDias(fechaInicio, p.duracion_dias));
                            }
                          }}
                          aria-pressed={activo}
                          className={`rounded-md px-3 py-2 text-left transition-colors ${
                            activo
                              ? 'bg-surface-2 ring-1 ring-brand'
                              : 'bg-surface-2/60 hover:bg-surface-2'
                          }`}
                        >
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="truncate text-xs font-semibold text-bone sm:text-sm">
                              {p.nombre}
                            </span>
                            <span className="shrink-0 text-xs font-bold text-bone tabular-nums sm:text-sm">
                              {soles(p.precio)}
                            </span>
                          </div>
                          <span className="block text-[11px] text-muted">
                            {p.duracion_dias === 1 ? '1 día' : `${p.duracion_dias} días`}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </fieldset>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="edit-mem-inicio" className="label">
                      Fecha de inicio
                    </label>
                    <input
                      id="edit-mem-inicio"
                      type="date"
                      required
                      value={fechaInicio}
                      onChange={(e) => {
                        const nuevaIni = e.target.value;
                        setFechaInicio(nuevaIni);
                        if (planSeleccionado && nuevaIni) {
                          setFechaFin(sumarDias(nuevaIni, planSeleccionado.duracion_dias));
                        }
                      }}
                      className="field font-mono"
                    />
                  </div>
                  <div>
                    <label htmlFor="edit-mem-fin" className="label">
                      Fecha de vencimiento
                    </label>
                    <input
                      id="edit-mem-fin"
                      type="date"
                      required
                      value={fechaFin}
                      onChange={(e) => setFechaFin(e.target.value)}
                      className="field font-mono"
                    />
                    {fechaFin && diasVigencia !== null && (
                      <p className="mt-1 text-[11px] text-muted">
                        Vence el <strong className="text-bone">{formatearFechaDMY(fechaFin)}</strong>{' '}
                        <span
                          className={
                            diasVigencia < 0
                              ? 'text-bad'
                              : diasVigencia <= 3
                              ? 'text-warn'
                              : 'text-ok'
                          }
                        >
                          (
                          {diasVigencia > 0
                            ? `quedan ${diasVigencia}d`
                            : diasVigencia === 0
                            ? 'vence hoy'
                            : `venció hace ${Math.abs(diasVigencia)}d`}
                          )
                        </span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2.5 rounded-md border border-line/80 bg-surface-2/50 p-3.5">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div className="w-44">
                      <label htmlFor="edit-mem-saldo" className="label">
                        Saldo pendiente (S/)
                      </label>
                      <input
                        id="edit-mem-saldo"
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.50"
                        value={saldoPendiente}
                        onChange={(e) => setSaldoPendiente(e.target.value)}
                        className="field tabular-nums"
                      />
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSaldoPendiente('0')}
                        className="btn btn-secondary !min-h-9 text-xs"
                      >
                        S/ 0 (sin deuda)
                      </button>
                      {diferenciaPlan !== null && (
                        <button
                          type="button"
                          onClick={() => setSaldoPendiente(diferenciaPlan.toFixed(2))}
                          className="btn btn-secondary !min-h-9 text-xs"
                        >
                          Diferencia ({soles(diferenciaPlan)})
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-[11px] text-muted">
                    {montoPagado > 0 ? (
                      <>
                        Ya tiene <strong className="text-ok">{soles(montoPagado)}</strong> registrado
                        en caja.{' '}
                      </>
                    ) : null}
                    Los cobros ya registrados en caja no se modifican; solo se ajusta el plan, las
                    fechas y el saldo pendiente.
                  </p>
                </div>
              </>
            )}

            {error && (
              <p role="alert" className="rounded-md border-l-2 border-bad bg-bad/10 px-3 py-2 text-xs text-bad">
                {error}
              </p>
            )}

            <footer className="flex justify-end gap-2 border-t border-line/80 pt-3.5">
              <button type="button" onClick={onClose} className="btn btn-ghost">
                Cancelar
              </button>
              <button
                type="submit"
                disabled={cargando || guardando}
                className="btn btn-primary !px-6"
              >
                {guardando ? (
                  <Loader2 size={16} strokeWidth={1.5} className="animate-spin" />
                ) : (
                  <Check size={16} strokeWidth={1.75} />
                )}
                Guardar cambios
              </button>
            </footer>
          </form>
        </div>
      </div>
    </Portal>
  );
}
