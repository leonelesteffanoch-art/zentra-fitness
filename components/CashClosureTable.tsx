'use client';

import { useState } from 'react';
import { Ban, Check, X } from 'lucide-react';
import { soles } from '@/lib/formato';
import type { MovimientoCaja, ResumenTurno, TurnoCaja } from '@/types';

interface SummaryProps {
  turno: TurnoCaja;
  resumen: ResumenTurno;
}

interface TableProps {
  movimientos: MovimientoCaja[];
  onAnular: (id: string, motivo: string) => Promise<void>;
}

function horaLima(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-PE', {
    timeZone: 'America/Lima',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Arqueo en vivo compacto: "Efectivo en caja" destacado como foco único,
 * y los otros 7 indicadores como desglose secundario.
 */
export function CashSummaryStrip({ turno, resumen }: SummaryProps) {
  return (
    <section aria-label="Arqueo de turno" className="space-y-4 bg-surface p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="section-title text-lg">Arqueo · Turno {turno.turno}</h2>
        <span className="font-mono text-xs text-muted">{turno.fecha}</span>
      </div>

      {/* Protagonista: Efectivo en caja */}
      <div className="bg-surface-2 p-4">
        <p className="text-xs font-medium text-muted">Efectivo esperado en caja</p>
        <p className="mt-1 text-3xl font-bold text-brand tabular-nums">
          {soles(resumen.efectivo_esperado)}
        </p>
        <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-line/70 pt-3 text-xs tabular-nums">
          <div>
            <dt className="text-muted">Fondo inicial</dt>
            <dd className="mt-0.5 font-semibold text-bone">{soles(resumen.fondo_inicial)}</dd>
          </div>
          <div>
            <dt className="text-muted">+ Ingresos efec.</dt>
            <dd className="mt-0.5 font-semibold text-ok">{soles(resumen.ingresos_efectivo)}</dd>
          </div>
          <div>
            <dt className="text-muted">− Egresos efec.</dt>
            <dd className="mt-0.5 font-semibold text-bad">{soles(resumen.egresos_efectivo)}</dd>
          </div>
        </dl>
      </div>

      {/* Desglose secundario: otros medios + totales */}
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 pt-1 text-xs tabular-nums">
        <div className="flex items-baseline justify-between border-b border-line/60 pb-1.5">
          <dt className="text-muted">Yape</dt>
          <dd className="font-medium text-bone">{soles(resumen.ingresos_yape)}</dd>
        </div>
        <div className="flex items-baseline justify-between border-b border-line/60 pb-1.5">
          <dt className="text-muted">Plin</dt>
          <dd className="font-medium text-bone">{soles(resumen.ingresos_plin)}</dd>
        </div>
        <div className="flex items-baseline justify-between border-b border-line/60 pb-1.5">
          <dt className="text-muted">Tarjeta</dt>
          <dd className="font-medium text-bone">{soles(resumen.ingresos_tarjeta)}</dd>
        </div>
        <div className="flex items-baseline justify-between border-b border-line/60 pb-1.5">
          <dt className="text-muted">Total egresos</dt>
          <dd className="font-medium text-bad">{soles(resumen.total_egresos)}</dd>
        </div>
        <div className="col-span-2 flex items-baseline justify-between pt-1 text-sm">
          <dt className="font-medium text-muted">Total vendido en el turno</dt>
          <dd className="font-bold text-bone">{soles(resumen.total_ingresos)}</dd>
        </div>
      </dl>
    </section>
  );
}

/**
 * Tabla de movimientos del turno con anulación (soft delete).
 * Prohibido usar DELETE: anular registra motivo y responsable en la BD.
 */
export function CashClosureTable({ movimientos, onAnular }: TableProps) {
  const [anulandoId, setAnulandoId] = useState<string | null>(null);
  const [motivo, setMotivo] = useState('');
  const [procesando, setProcesando] = useState(false);

  async function confirmarAnulacion(id: string) {
    if (!motivo.trim()) return;
    setProcesando(true);
    try {
      await onAnular(id, motivo.trim());
      setAnulandoId(null);
      setMotivo('');
    } finally {
      setProcesando(false);
    }
  }

  return (
    <section aria-label="Movimientos del turno" className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="section-title text-lg">Movimientos del turno</h2>
        <span className="text-xs text-muted tabular-nums">{movimientos.length} registros</span>
      </div>

      {movimientos.length === 0 ? (
        <p className="bg-surface px-4 py-8 text-center text-sm text-muted">
          Aún no hay cobros ni egresos en este turno.
        </p>
      ) : (
        <div className="overflow-x-auto border border-line bg-surface">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="border-b border-line bg-surface-2 text-xs font-medium text-muted">
              <tr>
                <th className="px-4 py-2.5">Hora</th>
                <th className="px-4 py-2.5">Tipo</th>
                <th className="px-4 py-2.5">Concepto</th>
                <th className="px-4 py-2.5">Método</th>
                <th className="px-4 py-2.5 text-right">Monto</th>
                <th className="px-4 py-2.5 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {movimientos.map((m) => {
                const anulado = m.estado === 'ANULADO';
                const pidiendoMotivo = anulandoId === m.id;
                return (
                  <tr
                    key={m.id}
                    className={anulado ? 'bg-surface/40 text-muted line-through' : 'bg-surface'}
                  >
                    <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs">
                      {horaLima(m.fecha_hora)}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-block rounded-xs px-2 py-0.5 text-xs font-semibold ${
                          m.tipo === 'INGRESO'
                            ? 'bg-ok/15 text-ok'
                            : 'bg-bad/15 text-bad'
                        }`}
                      >
                        {m.tipo === 'INGRESO' ? 'Ingreso' : 'Egreso'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="font-medium text-bone">{m.concepto}</span>
                      {m.cliente_nombre && (
                        <span className="ml-2 text-xs text-muted">· {m.cliente_nombre}</span>
                      )}
                      {anulado && m.motivo_anulacion && (
                        <span className="block text-xs not-italic text-bad no-underline">
                          Anulado: {m.motivo_anulacion}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted">{m.metodo}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right font-semibold text-bone tabular-nums">
                      {m.tipo === 'EGRESO' ? '− ' : ''}
                      {soles(m.monto)}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {anulado ? (
                        <span className="text-xs font-medium text-bad no-underline">
                          Anulado
                        </span>
                      ) : pidiendoMotivo ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <input
                            type="text"
                            placeholder="Motivo de anulación"
                            value={motivo}
                            onChange={(e) => setMotivo(e.target.value)}
                            className="field !min-h-8 !w-44 !px-2 text-xs"
                            autoFocus
                          />
                          <button
                            type="button"
                            disabled={procesando || !motivo.trim()}
                            onClick={() => confirmarAnulacion(m.id)}
                            className="btn btn-secondary !min-h-8 !px-2"
                            title="Confirmar anulación"
                          >
                            <Check size={14} strokeWidth={1.5} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setAnulandoId(null);
                              setMotivo('');
                            }}
                            className="btn btn-ghost !min-h-8 !px-2"
                            title="Cancelar"
                          >
                            <X size={14} strokeWidth={1.5} />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setAnulandoId(m.id);
                            setMotivo('');
                          }}
                          className="inline-flex items-center gap-1 text-xs font-medium text-muted hover:text-bad"
                        >
                          <Ban size={13} strokeWidth={1.5} />
                          Anular
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
