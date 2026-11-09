'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  ArrowDownCircle,
  CheckCircle2,
  Loader2,
  Lock,
  Unlock,
  X,
} from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { CashClosureTable, CashSummaryStrip } from '@/components/CashClosureTable';
import { PosPanel } from '@/components/PosPanel';
import {
  abrirTurno,
  anularMovimiento,
  cerrarTurno,
  listarProductos,
  movimientosDeTurno,
  registrarEgreso,
  resumenTurno,
  turnoAbierto,
} from '@/services/cajaService';
import { soles } from '@/lib/formato';
import type {
  CierreTurnoResultado,
  MetodoPago,
  MovimientoCaja,
  Producto,
  ResumenTurno,
  TurnoCaja,
  TurnoNombre,
} from '@/types';

const METODOS: MetodoPago[] = ['Efectivo', 'Yape', 'Plin', 'Tarjeta'];

export default function CajaPage() {
  const { perfil } = useAuth();
  const gymId = perfil?.gym_id;

  const [cargando, setCargando] = useState(true);
  const [turno, setTurno] = useState<TurnoCaja | null>(null);
  const [resumen, setResumen] = useState<ResumenTurno | null>(null);
  const [movimientos, setMovimientos] = useState<MovimientoCaja[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [ultimoCierre, setUltimoCierre] = useState<CierreTurnoResultado | null>(null);
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  // Estado formulario Apertura
  const [turnoNombre, setTurnoNombre] = useState<TurnoNombre>('Mañana');
  const [fondoInicial, setFondoInicial] = useState('0');
  const [abriendo, setAbriendo] = useState(false);

  // Estado modal/drawer Egreso
  const [mostrarEgreso, setMostrarEgreso] = useState(false);
  const [conceptoEgreso, setConceptoEgreso] = useState('');
  const [montoEgreso, setMontoEgreso] = useState('');
  const [metodoEgreso, setMetodoEgreso] = useState<MetodoPago>('Efectivo');
  const [guardandoEgreso, setGuardandoEgreso] = useState(false);

  // Estado modal Cierre
  const [mostrarCierre, setMostrarCierre] = useState(false);
  const [efectivoReal, setEfectivoReal] = useState('');
  const [obsCierre, setObsCierre] = useState('');
  const [cerrando, setCerrando] = useState(false);

  const cargarTodo = useCallback(async () => {
    if (!gymId) return;
    try {
      const [t, prods] = await Promise.all([turnoAbierto(gymId), listarProductos(gymId)]);
      const [res, movs] = t
        ? await Promise.all([resumenTurno(t.id), movimientosDeTurno(t.id)])
        : [null, [] as MovimientoCaja[]];
      setTurno(t);
      setProductos(prods);
      setResumen(res);
      setMovimientos(movs);
    } catch (e) {
      setAviso({
        tipo: 'error',
        texto: e instanceof Error ? e.message : 'No se pudo cargar la caja',
      });
    } finally {
      setCargando(false);
    }
  }, [gymId]);

  useEffect(() => {
    if (!gymId) return;
    let cancelado = false;
    Promise.all([turnoAbierto(gymId), listarProductos(gymId)])
      .then(async ([t, prods]) => {
        const [res, movs] = t
          ? await Promise.all([resumenTurno(t.id), movimientosDeTurno(t.id)])
          : [null, [] as MovimientoCaja[]];
        if (cancelado) return;
        setTurno(t);
        setProductos(prods);
        setResumen(res);
        setMovimientos(movs);
      })
      .catch((e: unknown) => {
        if (!cancelado) {
          setAviso({
            tipo: 'error',
            texto: e instanceof Error ? e.message : 'No se pudo cargar la caja',
          });
        }
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [gymId]);

  async function handleAbrirTurno(e: FormEvent) {
    e.preventDefault();
    setAviso(null);
    setUltimoCierre(null);
    const fondo = Number(fondoInicial);
    if (Number.isNaN(fondo) || fondo < 0) {
      setAviso({ tipo: 'error', texto: 'Ingresa un fondo inicial válido' });
      return;
    }
    setAbriendo(true);
    try {
      await abrirTurno(turnoNombre, fondo);
      setAviso({ tipo: 'ok', texto: `Turno ${turnoNombre} abierto con ${soles(fondo)}` });
      await cargarTodo();
    } catch (err) {
      setAviso({
        tipo: 'error',
        texto: err instanceof Error ? err.message : 'Error al abrir turno',
      });
    } finally {
      setAbriendo(false);
    }
  }

  async function handleRegistrarEgreso(e: FormEvent) {
    e.preventDefault();
    setAviso(null);
    const monto = Number(montoEgreso);
    if (!conceptoEgreso.trim() || Number.isNaN(monto) || monto <= 0) {
      setAviso({ tipo: 'error', texto: 'Completa el concepto y un monto mayor a 0' });
      return;
    }
    setGuardandoEgreso(true);
    try {
      await registrarEgreso(conceptoEgreso.trim(), monto, metodoEgreso);
      setConceptoEgreso('');
      setMontoEgreso('');
      setMostrarEgreso(false);
      setAviso({
        tipo: 'ok',
        texto: `Egreso registrado: ${conceptoEgreso.trim()} (${soles(monto)})`,
      });
      await cargarTodo();
    } catch (err) {
      setAviso({
        tipo: 'error',
        texto: err instanceof Error ? err.message : 'Error al registrar egreso',
      });
    } finally {
      setGuardandoEgreso(false);
    }
  }

  async function handleAnular(id: string, motivo: string) {
    setAviso(null);
    try {
      await anularMovimiento(id, motivo);
      setAviso({ tipo: 'ok', texto: 'Movimiento anulado correctamente' });
      await cargarTodo();
    } catch (err) {
      setAviso({
        tipo: 'error',
        texto: err instanceof Error ? err.message : 'No se pudo anular el movimiento',
      });
    }
  }

  async function handleCerrarTurno(e: FormEvent) {
    e.preventDefault();
    if (!turno) return;
    const real = Number(efectivoReal);
    if (efectivoReal.trim() === '' || Number.isNaN(real) || real < 0) {
      setAviso({ tipo: 'error', texto: 'Ingresa el efectivo real contado en caja' });
      return;
    }
    setCerrando(true);
    setAviso(null);
    try {
      const resultado = await cerrarTurno(turno.id, real, obsCierre.trim() || undefined);
      setUltimoCierre(resultado);
      setMostrarCierre(false);
      setEfectivoReal('');
      setObsCierre('');
      setAviso({ tipo: 'ok', texto: 'Turno cerrado correctamente' });
      await cargarTodo();
    } catch (err) {
      setAviso({
        tipo: 'error',
        texto: err instanceof Error ? err.message : 'No se pudo cerrar el turno',
      });
    } finally {
      setCerrando(false);
    }
  }

  if (cargando) {
    return (
      <div className="flex justify-center py-20 text-muted" role="status">
        <Loader2 className="animate-spin" strokeWidth={1.5} />
        <span className="sr-only">Cargando caja</span>
      </div>
    );
  }

  const diferenciaPrevia =
    resumen && efectivoReal.trim() !== ''
      ? Math.round((Number(efectivoReal) - resumen.efectivo_esperado) * 100) / 100
      : null;

  return (
    <div className="mx-auto max-w-6xl space-y-10">
      {/* Cabecera */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line/80 pb-5">
        <div className="flex flex-wrap items-center gap-4">
          <h1 className="font-display text-4xl sm:text-5xl">Caja y POS</h1>
          {turno && (
            <span className="inline-flex items-center gap-1.5 rounded-xs bg-ok/15 px-2.5 py-1 text-xs font-semibold text-ok">
              <Unlock size={13} strokeWidth={1.5} />
              Turno {turno.turno} abierto
            </span>
          )}
        </div>

        {turno && (
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setMostrarEgreso(true)}
              className="btn btn-secondary"
            >
              <ArrowDownCircle size={16} strokeWidth={1.5} />
              Registrar egreso
            </button>
            <button
              type="button"
              onClick={() => {
                setMostrarCierre(true);
                if (resumen) setEfectivoReal(resumen.efectivo_esperado.toFixed(2));
              }}
              className="btn btn-ghost"
            >
              <Lock size={16} strokeWidth={1.5} />
              Cerrar turno
            </button>
          </div>
        )}
      </div>

      {aviso && (
        <p
          role={aviso.tipo === 'error' ? 'alert' : 'status'}
          className={`flex items-center gap-2 border-l-2 px-3 py-2 text-sm ${
            aviso.tipo === 'ok' ? 'border-ok bg-ok/10 text-ok' : 'border-bad bg-bad/10 text-bad'
          }`}
        >
          {aviso.tipo === 'ok' && <CheckCircle2 size={16} strokeWidth={1.5} />}
          {aviso.texto}
        </p>
      )}

      {/* Resumen del último cierre recién ejecutado */}
      {ultimoCierre && !turno && (
        <section className="bg-surface p-6">
          <h2 className="section-title text-lg">Arqueo final del último turno cerrado</h2>
          <dl className="mt-4 grid grid-cols-2 gap-4 tabular-nums sm:grid-cols-4">
            <div>
              <dt className="text-xs text-muted">Efectivo esperado</dt>
              <dd className="mt-0.5 text-xl font-bold text-bone">
                {soles(ultimoCierre.efectivo_esperado)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Efectivo real contado</dt>
              <dd className="mt-0.5 text-xl font-bold text-bone">
                {soles(ultimoCierre.efectivo_real)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Diferencia</dt>
              <dd
                className={`mt-0.5 text-xl font-bold ${
                  ultimoCierre.diferencia === 0
                    ? 'text-ok'
                    : ultimoCierre.diferencia > 0
                    ? 'text-warn'
                    : 'text-bad'
                }`}
              >
                {ultimoCierre.diferencia > 0 ? '+ ' : ''}
                {soles(ultimoCierre.diferencia)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Total ingresos turno</dt>
              <dd className="mt-0.5 text-xl font-bold text-bone">
                {soles(ultimoCierre.total_ingresos)}
              </dd>
            </div>
          </dl>
        </section>
      )}

      {/* ESTADO 1: No hay turno abierto -> Formulario de Apertura */}
      {!turno && (
        <section className="mx-auto max-w-md bg-surface p-6 sm:p-8">
          <h2 className="section-title text-xl">Abrir turno de caja</h2>
          <p className="mt-1 mb-6 text-sm text-muted">
            Declara el sencillo o fondo inicial en efectivo con el que arranca la recepción.
          </p>

          <form onSubmit={handleAbrirTurno} className="space-y-5">
            <fieldset>
              <legend className="label">Turno</legend>
              <div className="grid grid-cols-2 gap-2">
                {(['Mañana', 'Tarde'] as TurnoNombre[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTurnoNombre(t)}
                    aria-pressed={turnoNombre === t}
                    className={`rounded-xs py-2.5 text-sm font-semibold transition-colors ${
                      turnoNombre === t
                        ? 'bg-bone text-ink'
                        : 'bg-surface-2 text-muted hover:text-bone'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </fieldset>

            <div>
              <label htmlFor="fondo-inicial" className="label">
                Fondo inicial en efectivo (S/)
              </label>
              <input
                id="fondo-inicial"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.50"
                required
                value={fondoInicial}
                onChange={(e) => setFondoInicial(e.target.value)}
                className="field !bg-surface-2 text-lg tabular-nums"
              />
            </div>

            <button type="submit" disabled={abriendo} className="btn btn-primary w-full !min-h-11">
              {abriendo && <Loader2 size={16} strokeWidth={1.5} className="animate-spin" />}
              <Unlock size={16} strokeWidth={1.5} />
              Abrir turno {turnoNombre}
            </button>
          </form>
        </section>
      )}

      {/* ESTADO 2: Turno abierto -> POS protagonista (~65%) + Arqueo en vivo (~35%) */}
      {turno && resumen && (
        <>
          <div className="grid items-start gap-8 lg:grid-cols-[1.85fr_1fr]">
            <PosPanel
              productos={productos}
              onVentaCompletada={async (msg) => {
                setAviso({ tipo: 'ok', texto: msg });
                await cargarTodo();
              }}
            />

            <CashSummaryStrip turno={turno} resumen={resumen} />
          </div>

          <CashClosureTable movimientos={movimientos} onAnular={handleAnular} />
        </>
      )}

      {/* Drawer / Modal: Registrar Egreso */}
      {mostrarEgreso && turno && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 sm:items-center sm:p-6">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="egreso-modal-titulo"
            className="w-full max-w-md border border-line bg-surface p-6"
          >
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h2 id="egreso-modal-titulo" className="section-title text-xl">
                  Registrar egreso o gasto
                </h2>
                <p className="mt-0.5 text-xs text-muted">
                  Salidas de caja chica durante el turno actual
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMostrarEgreso(false)}
                className="btn btn-ghost !min-h-8 !px-2"
                aria-label="Cerrar"
              >
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>

            <form onSubmit={handleRegistrarEgreso} className="space-y-4">
              <div className="space-y-1.5">
                <span className="label">Motivo rápido</span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setConceptoEgreso('Retiro de efectivo por el dueño');
                      setMetodoEgreso('Efectivo');
                      if (resumen && resumen.efectivo_esperado > 0) {
                        setMontoEgreso(resumen.efectivo_esperado.toFixed(2));
                      }
                    }}
                    className="rounded-xs bg-surface-2 px-2.5 py-1 text-xs font-medium text-bone hover:bg-line"
                  >
                    Retiro por el dueño
                  </button>
                  <button
                    type="button"
                    onClick={() => setConceptoEgreso('Limpieza / insumos del gimnasio')}
                    className="rounded-xs bg-surface-2 px-2.5 py-1 text-xs font-medium text-muted hover:text-bone"
                  >
                    Limpieza / insumos
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="egreso-concepto" className="label">
                  Concepto del gasto o retiro
                </label>
                <input
                  id="egreso-concepto"
                  type="text"
                  required
                  autoFocus
                  placeholder="Ej: Compra de lejía, garrafón de agua, pasaje..."
                  value={conceptoEgreso}
                  onChange={(e) => setConceptoEgreso(e.target.value)}
                  className="field !bg-surface-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="egreso-monto" className="label">
                    Monto (S/)
                  </label>
                  <input
                    id="egreso-monto"
                    type="number"
                    inputMode="decimal"
                    min="0.10"
                    step="0.10"
                    required
                    placeholder="0.00"
                    value={montoEgreso}
                    onChange={(e) => setMontoEgreso(e.target.value)}
                    className="field !bg-surface-2 tabular-nums"
                  />
                </div>
                <div>
                  <label htmlFor="egreso-metodo" className="label">
                    Sale de
                  </label>
                  <select
                    id="egreso-metodo"
                    value={metodoEgreso}
                    onChange={(e) => setMetodoEgreso(e.target.value as MetodoPago)}
                    className="field !bg-surface-2"
                  >
                    {METODOS.map((m) => (
                      <option key={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-line/80 pt-4">
                <button
                  type="button"
                  onClick={() => setMostrarEgreso(false)}
                  className="btn btn-ghost"
                >
                  Cancelar
                </button>
                <button type="submit" disabled={guardandoEgreso} className="btn btn-primary">
                  {guardandoEgreso && (
                    <Loader2 size={16} strokeWidth={1.5} className="animate-spin" />
                  )}
                  Guardar egreso
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Cerrar Turno */}
      {mostrarCierre && turno && resumen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 sm:items-center sm:p-6">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cierre-modal-titulo"
            className="w-full max-w-md border border-line bg-surface p-6"
          >
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 id="cierre-modal-titulo" className="section-title text-xl">
                  Cerrar turno {turno.turno}
                </h2>
                <p className="mt-1 text-xs text-muted tabular-nums">
                  Efectivo esperado en cajón: <strong className="text-bone">{soles(resumen.efectivo_esperado)}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMostrarCierre(false)}
                className="btn btn-ghost !min-h-8 !px-2"
                aria-label="Cerrar"
              >
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>

            <form onSubmit={handleCerrarTurno} className="space-y-4">
              <div>
                <label htmlFor="efectivo-real" className="label">
                  Efectivo físico contado (S/)
                </label>
                <input
                  id="efectivo-real"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.10"
                  required
                  autoFocus
                  value={efectivoReal}
                  onChange={(e) => setEfectivoReal(e.target.value)}
                  className="field !bg-surface-2 text-lg tabular-nums"
                />
                {diferenciaPrevia !== null && (
                  <p
                    className={`mt-1.5 text-xs font-semibold tabular-nums ${
                      diferenciaPrevia === 0
                        ? 'text-ok'
                        : diferenciaPrevia > 0
                        ? 'text-warn'
                        : 'text-bad'
                    }`}
                  >
                    {diferenciaPrevia === 0
                      ? 'Cuadre exacto (S/ 0.00)'
                      : diferenciaPrevia > 0
                      ? `Sobrante: + ${soles(diferenciaPrevia)}`
                      : `Faltante: ${soles(diferenciaPrevia)}`}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="obs-cierre" className="label">
                  Observaciones (opcional)
                </label>
                <input
                  id="obs-cierre"
                  type="text"
                  placeholder="Ej: Se dejó S/ 50 de sencillo para mañana"
                  value={obsCierre}
                  onChange={(e) => setObsCierre(e.target.value)}
                  className="field !bg-surface-2"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-line/80 pt-4">
                <button
                  type="button"
                  onClick={() => setMostrarCierre(false)}
                  className="btn btn-ghost"
                >
                  Cancelar
                </button>
                <button type="submit" disabled={cerrando} className="btn btn-primary">
                  {cerrando && <Loader2 size={16} strokeWidth={1.5} className="animate-spin" />}
                  Confirmar cierre
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
