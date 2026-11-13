'use client';

import { useMemo, useState } from 'react';
import { Ban, Check, Filter, Search, Wallet, X } from 'lucide-react';
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
 * Arqueo en vivo compacto con barra gráfica de distribución por medio de pago.
 */
export function CashSummaryStrip({ turno, resumen }: SummaryProps) {
  const totalIng = Math.max(0, resumen.total_ingresos);
  const pctEfec = totalIng > 0 ? Math.round((resumen.ingresos_efectivo / totalIng) * 100) : 0;
  const pctYape = totalIng > 0 ? Math.round((resumen.ingresos_yape / totalIng) * 100) : 0;
  const pctPlin = totalIng > 0 ? Math.round((resumen.ingresos_plin / totalIng) * 100) : 0;
  const pctTarj = totalIng > 0 ? Math.max(0, 100 - pctEfec - pctYape - pctPlin) : 0;

  return (
    <section aria-label="Arqueo de turno" className="panel-card space-y-4 p-5">
      <div className="flex items-center justify-between border-b border-line/70 pb-3">
        <div className="flex items-center gap-2">
          <Wallet size={16} className="text-brand" strokeWidth={1.75} />
          <h2 className="section-title text-base">Arqueo · Turno {turno.turno}</h2>
        </div>
        <span className="rounded bg-surface-2 px-2 py-0.5 font-mono text-xs text-muted">
          {turno.fecha}
        </span>
      </div>

      {/* Protagonista: Efectivo en caja */}
      <div className="rounded-md border border-brand/25 bg-gradient-to-br from-surface-2 to-ink p-4">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
            Efectivo esperado en cajón
          </p>
          <span className="rounded bg-brand/15 px-1.5 py-0.5 font-mono text-[10px] font-bold text-brand">
            EN VIVO
          </span>
        </div>
        <p className="mt-1 font-mono text-3xl font-bold text-brand tabular-nums">
          {soles(resumen.efectivo_esperado)}
        </p>
        <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-line/70 pt-3 text-xs tabular-nums">
          <div>
            <dt className="text-[11px] text-muted">Fondo inicial</dt>
            <dd className="mt-0.5 font-mono font-semibold text-bone">
              {soles(resumen.fondo_inicial)}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] text-muted">+ Ingresos efec.</dt>
            <dd className="mt-0.5 font-mono font-semibold text-ok">
              {soles(resumen.ingresos_efectivo)}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] text-muted">− Egresos efec.</dt>
            <dd className="mt-0.5 font-mono font-semibold text-bad">
              {soles(resumen.egresos_efectivo)}
            </dd>
          </div>
        </dl>
      </div>

      {/* Barra gráfica de distribución de medios de cobro */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[11px] text-muted">
          <span className="font-semibold uppercase tracking-wider">Mix de medios de pago</span>
          <span className="font-mono text-bone">{soles(resumen.total_ingresos)} vendidos</span>
        </div>

        <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-surface-2">
          {totalIng === 0 ? (
            <div className="h-full w-full bg-line/40" />
          ) : (
            <>
              {pctEfec > 0 && (
                <div
                  className="bar-fill h-full bg-ok"
                  style={{ width: `${pctEfec}%` }}
                  title={`Efectivo: ${pctEfec}%`}
                />
              )}
              {pctYape > 0 && (
                <div
                  className="bar-fill h-full bg-purple-500"
                  style={{ width: `${pctYape}%` }}
                  title={`Yape: ${pctYape}%`}
                />
              )}
              {pctPlin > 0 && (
                <div
                  className="bar-fill h-full bg-cyan-400"
                  style={{ width: `${pctPlin}%` }}
                  title={`Plin: ${pctPlin}%`}
                />
              )}
              {pctTarj > 0 && (
                <div
                  className="bar-fill h-full bg-amber-400"
                  style={{ width: `${pctTarj}%` }}
                  title={`Tarjeta: ${pctTarj}%`}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* Desglose secundario: otros medios + totales */}
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 pt-1 text-xs tabular-nums">
        <div className="flex items-center justify-between rounded bg-surface-2/50 px-2.5 py-1.5">
          <dt className="flex items-center gap-1.5 text-muted">
            <span className="h-2 w-2 rounded-full bg-ok" /> Efectivo
          </dt>
          <dd className="font-mono font-semibold text-bone">{soles(resumen.ingresos_efectivo)}</dd>
        </div>
        <div className="flex items-center justify-between rounded bg-surface-2/50 px-2.5 py-1.5">
          <dt className="flex items-center gap-1.5 text-muted">
            <span className="h-2 w-2 rounded-full bg-purple-500" /> Yape
          </dt>
          <dd className="font-mono font-semibold text-bone">{soles(resumen.ingresos_yape)}</dd>
        </div>
        <div className="flex items-center justify-between rounded bg-surface-2/50 px-2.5 py-1.5">
          <dt className="flex items-center gap-1.5 text-muted">
            <span className="h-2 w-2 rounded-full bg-cyan-400" /> Plin
          </dt>
          <dd className="font-mono font-semibold text-bone">{soles(resumen.ingresos_plin)}</dd>
        </div>
        <div className="flex items-center justify-between rounded bg-surface-2/50 px-2.5 py-1.5">
          <dt className="flex items-center gap-1.5 text-muted">
            <span className="h-2 w-2 rounded-full bg-amber-400" /> Tarjeta
          </dt>
          <dd className="font-mono font-semibold text-bone">{soles(resumen.ingresos_tarjeta)}</dd>
        </div>
        <div className="col-span-2 flex items-center justify-between border-t border-line/60 pt-2 text-xs">
          <dt className="text-muted">Total egresos del turno</dt>
          <dd className="font-mono font-semibold text-bad">− {soles(resumen.total_egresos)}</dd>
        </div>
        <div className="col-span-2 flex items-baseline justify-between rounded bg-ink/60 px-3 py-2 text-sm">
          <dt className="font-medium text-muted">Total bruto vendido</dt>
          <dd className="font-mono text-base font-bold text-bone">{soles(resumen.total_ingresos)}</dd>
        </div>
      </dl>
    </section>
  );
}

type FiltroMov = 'todos' | 'ingresos' | 'egresos' | 'efectivo' | 'digital';

/**
 * Tabla de movimientos del turno con filtros rápidos y anulación (soft delete).
 */
export function CashClosureTable({ movimientos, onAnular }: TableProps) {
  const [anulandoId, setAnulandoId] = useState<string | null>(null);
  const [motivo, setMotivo] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [filtro, setFiltro] = useState<FiltroMov>('todos');
  const [busqueda, setBusqueda] = useState('');

  const movimientosFiltrados = useMemo(() => {
    return movimientos.filter((m) => {
      if (filtro === 'ingresos' && m.tipo !== 'INGRESO') return false;
      if (filtro === 'egresos' && m.tipo !== 'EGRESO') return false;
      if (filtro === 'efectivo' && m.metodo !== 'Efectivo') return false;
      if (filtro === 'digital' && m.metodo === 'Efectivo') return false;
      if (busqueda.trim()) {
        const q = busqueda.trim().toLowerCase();
        const coincideConcepto = m.concepto.toLowerCase().includes(q);
        const coincideCliente = (m.cliente_nombre ?? '').toLowerCase().includes(q);
        if (!coincideConcepto && !coincideCliente) return false;
      }
      return true;
    });
  }, [movimientos, filtro, busqueda]);

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
    <section aria-label="Movimientos del turno" className="panel-card space-y-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="section-title text-lg">Movimientos del turno</h2>
          <p className="text-xs text-muted tabular-nums">
            Mostrando {movimientosFiltrados.length} de {movimientos.length} operaciones registradas
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Filtrar concepto o cliente..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="field !min-h-8 !w-48 !pl-8 !pr-6 !text-xs"
            />
            {busqueda && (
              <button
                type="button"
                onClick={() => setBusqueda('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-bone"
              >
                <X size={12} />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1 rounded-md border border-line bg-ink/60 p-1">
            <Filter size={12} className="ml-1.5 mr-1 text-muted" />
            {(
              [
                { id: 'todos', label: 'Todos' },
                { id: 'ingresos', label: 'Ingresos' },
                { id: 'egresos', label: 'Egresos' },
                { id: 'efectivo', label: 'Efectivo' },
                { id: 'digital', label: 'Digital' },
              ] as { id: FiltroMov; label: string }[]
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFiltro(f.id)}
                className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                  filtro === f.id
                    ? 'bg-brand text-ink font-semibold'
                    : 'text-muted hover:text-bone'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {movimientosFiltrados.length === 0 ? (
        <p className="rounded-md border border-line/60 bg-ink/40 px-4 py-8 text-center text-sm text-muted">
          {movimientos.length === 0
            ? 'Aún no hay cobros ni egresos en este turno.'
            : 'Ningún movimiento coincide con el filtro seleccionado.'}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-line bg-ink/40">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="border-b border-line bg-surface-2/80 text-xs font-semibold uppercase tracking-wider text-muted">
              <tr>
                <th className="px-4 py-2.5">Hora</th>
                <th className="px-4 py-2.5">Tipo</th>
                <th className="px-4 py-2.5">Concepto</th>
                <th className="px-4 py-2.5">Método</th>
                <th className="px-4 py-2.5 text-right">Monto</th>
                <th className="px-4 py-2.5 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/70">
              {movimientosFiltrados.map((m) => {
                const anulado = m.estado === 'ANULADO';
                const pidiendoMotivo = anulandoId === m.id;
                return (
                  <tr
                    key={m.id}
                    className={
                      anulado
                        ? 'bg-surface/30 text-muted line-through'
                        : 'bg-surface/80 transition-colors hover:bg-surface-2/50'
                    }
                  >
                    <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-muted">
                      {horaLima(m.fecha_hora)}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${
                          m.tipo === 'INGRESO'
                            ? 'bg-ok/15 text-ok ring-1 ring-ok/30'
                            : 'bg-bad/15 text-bad ring-1 ring-bad/30'
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
                    <td className="px-4 py-2.5">
                      <span className="rounded bg-surface-2 px-2 py-0.5 font-mono text-xs text-bone">
                        {m.metodo}
                      </span>
                    </td>
                    <td
                      className={`whitespace-nowrap px-4 py-2.5 text-right font-mono font-bold tabular-nums ${
                        m.tipo === 'EGRESO' ? 'text-bad' : 'text-bone'
                      }`}
                    >
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
                            <Check size={14} strokeWidth={1.75} />
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
                            <X size={14} strokeWidth={1.75} />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setAnulandoId(m.id);
                            setMotivo('');
                          }}
                          className="inline-flex items-center gap-1 text-xs font-medium text-muted transition-colors hover:text-bad"
                        >
                          <Ban size={13} strokeWidth={1.75} />
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
