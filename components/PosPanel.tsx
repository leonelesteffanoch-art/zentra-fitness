'use client';

import { useMemo, useState } from 'react';
import { Loader2, Minus, Plus, Trash2 } from 'lucide-react';
import { registrarVenta } from '@/services/cajaService';
import { soles } from '@/lib/formato';
import type { ItemVentaInput, MetodoPago, PagoInput, Producto } from '@/types';

interface Props {
  productos: Producto[];
  onVentaCompletada: (mensaje: string) => void;
}

const METODOS: MetodoPago[] = ['Efectivo', 'Yape', 'Plin', 'Tarjeta'];

interface LineaPago {
  metodo: MetodoPago;
  monto: string;
}

/**
 * Punto de Venta (POS) de mostrador: agua, bebidas, suplementos, pase diario.
 * No exige registrar un socio (cliente opcional). Soporta pago único o mixto.
 */
export function PosPanel({ productos, onVentaCompletada }: Props) {
  const [carrito, setCarrito] = useState<Record<string, number>>({});
  const [cliente, setCliente] = useState('');
  const [lineas, setLineas] = useState<LineaPago[]>([{ metodo: 'Efectivo', monto: '' }]);
  const [modoMixto, setModoMixto] = useState(false);
  const [metodoRapido, setMetodoRapido] = useState<MetodoPago>('Efectivo');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const itemsSeleccionados = useMemo(() => {
    return productos
      .filter((p) => (carrito[p.id] ?? 0) > 0)
      .map((p) => ({ producto: p, cantidad: carrito[p.id] }));
  }, [productos, carrito]);

  const total = useMemo(
    () => itemsSeleccionados.reduce((acc, it) => acc + it.producto.precio * it.cantidad, 0),
    [itemsSeleccionados]
  );

  const sumaMixto = useMemo(
    () => lineas.reduce((acc, l) => acc + (Number(l.monto) || 0), 0),
    [lineas]
  );

  function sumar(prod: Producto, delta: number) {
    setError(null);
    setCarrito((prev) => {
      const actual = prev[prod.id] ?? 0;
      const nuevo = Math.max(0, actual + delta);
      if (!prod.es_servicio && nuevo > prod.stock) return prev;
      if (nuevo === 0) {
        const copia = { ...prev };
        delete copia[prod.id];
        return copia;
      }
      return { ...prev, [prod.id]: nuevo };
    });
  }

  function limpiarCarrito() {
    setCarrito({});
    setCliente('');
    setLineas([{ metodo: 'Efectivo', monto: '' }]);
    setModoMixto(false);
    setError(null);
  }

  async function cobrar() {
    if (itemsSeleccionados.length === 0) return;
    setError(null);

    const items: ItemVentaInput[] = itemsSeleccionados.map((i) => ({
      producto_id: i.producto.id,
      cantidad: i.cantidad,
    }));

    const pagos: PagoInput[] = modoMixto
      ? lineas
          .filter((l) => Number(l.monto) > 0)
          .map((l) => ({ metodo: l.metodo, monto: Number(l.monto) }))
      : [{ metodo: metodoRapido, monto: Math.round(total * 100) / 100 }];

    if (modoMixto && Math.round(sumaMixto * 100) !== Math.round(total * 100)) {
      setError(`La suma del pago mixto (${soles(sumaMixto)}) debe igualar el total (${soles(total)})`);
      return;
    }

    setEnviando(true);
    try {
      await registrarVenta(items, pagos, {
        cliente: cliente.trim() ? cliente.trim() : undefined,
      });
      const resumenTexto = itemsSeleccionados
        .map((i) => `${i.cantidad}× ${i.producto.nombre}`)
        .join(', ');
      limpiarCarrito();
      onVentaCompletada(`Venta registrada: ${resumenTexto} (${soles(total)})`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo registrar la venta');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section aria-label="Punto de venta" className="space-y-4">
      <h2 className="section-title text-lg">Punto de venta</h2>

      {/* Catálogo ligero de productos */}
      {productos.length === 0 ? (
        <p className="bg-surface px-4 py-6 text-sm text-muted">No hay productos activos.</p>
      ) : (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {productos.map((p) => {
            const cant = carrito[p.id] ?? 0;
            const sinStock = !p.es_servicio && p.stock <= 0;
            return (
              <button
                key={p.id}
                type="button"
                disabled={sinStock}
                onClick={() => sumar(p, 1)}
                className={`flex flex-col justify-between rounded-xs p-3.5 text-left transition-colors ${
                  cant > 0
                    ? 'bg-surface-2 ring-1 ring-bone/60'
                    : 'bg-surface hover:bg-surface-2'
                } disabled:cursor-not-allowed disabled:opacity-40`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium leading-snug text-bone">{p.nombre}</span>
                  {cant > 0 && (
                    <span className="rounded-xs bg-bone px-1.5 py-0.5 text-xs font-bold text-ink tabular-nums">
                      {cant}
                    </span>
                  )}
                </div>
                <div className="mt-3 flex items-baseline justify-between">
                  <span className="text-base font-semibold text-bone tabular-nums">
                    {soles(p.precio)}
                  </span>
                  <span className="text-xs text-muted tabular-nums">
                    {p.es_servicio ? 'Servicio' : `Stock: ${p.stock}`}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Carrito activo */}
      {itemsSeleccionados.length > 0 && (
        <div className="space-y-4 bg-surface p-5">
          <ul className="divide-y divide-line/70">
            {itemsSeleccionados.map(({ producto, cantidad }) => (
              <li key={producto.id} className="flex items-center justify-between py-2.5 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-bone">{producto.nombre}</p>
                  <p className="text-xs text-muted tabular-nums">
                    {soles(producto.precio)} × {cantidad} ={' '}
                    <strong className="font-semibold text-bone">
                      {soles(producto.precio * cantidad)}
                    </strong>
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => sumar(producto, -1)}
                    className="btn btn-ghost !min-h-8 !px-2"
                    aria-label={`Restar ${producto.nombre}`}
                  >
                    <Minus size={14} strokeWidth={1.5} />
                  </button>
                  <span className="w-6 text-center font-semibold tabular-nums">{cantidad}</span>
                  <button
                    type="button"
                    onClick={() => sumar(producto, 1)}
                    className="btn btn-ghost !min-h-8 !px-2"
                    aria-label={`Sumar ${producto.nombre}`}
                  >
                    <Plus size={14} strokeWidth={1.5} />
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <div>
            <label htmlFor="pos-cliente" className="label">
              Cliente (opcional, para pase diario o referencia)
            </label>
            <input
              id="pos-cliente"
              type="text"
              placeholder="Ej: Juan Pérez"
              value={cliente}
              onChange={(e) => setCliente(e.target.value)}
              className="field !min-h-9 !bg-surface-2"
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="label !mb-0">Método de pago</span>
              <button
                type="button"
                onClick={() => {
                  setModoMixto((m) => !m);
                  setLineas([{ metodo: 'Efectivo', monto: total.toFixed(2) }]);
                }}
                className="text-xs font-medium text-bone underline underline-offset-4 hover:text-muted"
              >
                {modoMixto ? 'Usar un solo método' : 'Pago mixto'}
              </button>
            </div>

            {!modoMixto ? (
              <div className="grid grid-cols-4 gap-1.5">
                {METODOS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMetodoRapido(m)}
                    aria-pressed={metodoRapido === m}
                    className={`rounded-xs py-2 text-xs font-semibold transition-colors ${
                      metodoRapido === m
                        ? 'bg-bone text-ink'
                        : 'bg-surface-2 text-muted hover:text-bone'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {lineas.map((l, idx) => (
                  <div key={idx} className="flex gap-2">
                    <select
                      aria-label={`Método ${idx + 1}`}
                      value={l.metodo}
                      onChange={(e) =>
                        setLineas((ls) =>
                          ls.map((item, i) =>
                            i === idx ? { ...item, metodo: e.target.value as MetodoPago } : item
                          )
                        )
                      }
                      className="field !min-h-9 !w-32 !bg-surface-2 text-xs"
                    >
                      {METODOS.map((m) => (
                        <option key={m}>{m}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      step="0.50"
                      min="0"
                      placeholder="0.00"
                      value={l.monto}
                      onChange={(e) =>
                        setLineas((ls) =>
                          ls.map((item, i) =>
                            i === idx ? { ...item, monto: e.target.value } : item
                          )
                        )
                      }
                      className="field !min-h-9 !bg-surface-2 tabular-nums text-sm"
                    />
                  </div>
                ))}
                {lineas.length < METODOS.length && (
                  <button
                    type="button"
                    onClick={() => {
                      const rest = Math.max(0, total - sumaMixto);
                      setLineas((ls) => [
                        ...ls,
                        { metodo: 'Yape', monto: rest ? rest.toFixed(2) : '' },
                      ]);
                    }}
                    className="inline-flex items-center gap-1 text-xs font-medium text-bone hover:underline"
                  >
                    <Plus size={12} strokeWidth={1.5} /> Añadir otro método
                  </button>
                )}
              </div>
            )}
          </div>

          {error && (
            <p role="alert" className="border-l-2 border-bad bg-bad/10 px-3 py-2 text-xs text-bad">
              {error}
            </p>
          )}

          <div className="flex items-center justify-between border-t border-line/70 pt-3">
            <div>
              <span className="text-xs text-muted">Total a cobrar</span>
              <p className="text-2xl font-bold text-bone tabular-nums">{soles(total)}</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={limpiarCarrito}
                className="btn btn-ghost !px-3"
                title="Vaciar carrito"
              >
                <Trash2 size={16} strokeWidth={1.5} />
              </button>
              <button
                type="button"
                disabled={enviando}
                onClick={cobrar}
                className="btn btn-primary !px-6 tabular-nums"
              >
                {enviando && <Loader2 size={16} strokeWidth={1.5} className="animate-spin" />}
                Cobrar {soles(total)}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
