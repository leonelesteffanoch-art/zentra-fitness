'use client';

import { useMemo, useState } from 'react';
import {
  Banknote,
  Check,
  Dumbbell,
  GlassWater,
  Loader2,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  Snowflake,
  Sun,
  Ticket,
  Trash2,
  UtensilsCrossed,
  X,
} from 'lucide-react';
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

interface ProductoVariante {
  id: string;
  productoOriginal: Producto;
  tipo: 'normal' | 'helada';
  nombreEtiqueta: string;
  precio: number;
  stock: number;
  es_servicio: boolean;
}

interface ProductoAgrupado {
  id: string;
  nombreBase: string;
  categoria: string;
  es_servicio: boolean;
  variantes: ProductoVariante[];
}

/**
 * Detecta si el producto es helado y extrae su nombre base para agruparlo.
 * Ej: "Agua Cielo (Helada)" -> "Agua Cielo", "Agua Loa (Chupón Helada)" -> "Agua Loa (Chupón)"
 */
function obtenerNombreBase(nombre: string): { base: string; esHelada: boolean } {
  const esHelada = /\bhelad[ao]s?\b/i.test(nombre);
  if (!esHelada) return { base: nombre.trim(), esHelada: false };

  let base = nombre
    .replace(/\s*\(\s*(.*?)\s+helad[ao]s?\s*\)/i, ' ($1)')
    .replace(/\s*\(\s*helad[ao]s?\s*\)/i, '')
    .replace(/\s*-\s*helad[ao]s?/i, '')
    .replace(/\s+helad[ao]s?/i, '')
    .trim();

  base = base.replace(/\s*\(\s*\)/g, '').trim();

  return { base, esHelada: true };
}

function iconoCategoria(categoria: string) {
  const c = categoria.toLowerCase();
  if (c.includes('bebida')) return <GlassWater size={14} className="text-cyan-400" strokeWidth={1.75} />;
  if (c.includes('suplemento')) return <Dumbbell size={14} className="text-amber-400" strokeWidth={1.75} />;
  if (c.includes('pase')) return <Ticket size={14} className="text-emerald-400" strokeWidth={1.75} />;
  return <UtensilsCrossed size={14} className="text-muted" strokeWidth={1.75} />;
}

export function PosPanel({ productos, onVentaCompletada }: Props) {
  const [carrito, setCarrito] = useState<Record<string, number>>({});
  const [cliente, setCliente] = useState('');
  const [lineas, setLineas] = useState<LineaPago[]>([{ metodo: 'Efectivo', monto: '' }]);
  const [modoMixto, setModoMixto] = useState(false);
  const [metodoRapido, setMetodoRapido] = useState<MetodoPago>('Efectivo');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filtros de categoría y búsqueda rápida
  const [categoriaActiva, setCategoriaActiva] = useState<string>('todos');
  const [busqueda, setBusqueda] = useState('');

  // Calculadora de vuelto para efectivo
  const [pagaCon, setPagaCon] = useState<string>('');

  // Agrupación inteligente de productos (combina versión al tiempo + helada en una sola ficha)
  const productosAgrupados = useMemo(() => {
    const mapa = new Map<string, ProductoAgrupado>();

    for (const prod of productos) {
      if (!prod.activo) continue;
      const { base, esHelada } = obtenerNombreBase(prod.nombre);
      const clave = `${prod.categoria.toLowerCase()}:::${base.toLowerCase()}`;

      let grupo = mapa.get(clave);
      if (!grupo) {
        grupo = {
          id: prod.id,
          nombreBase: base,
          categoria: prod.categoria,
          es_servicio: prod.es_servicio,
          variantes: [],
        };
        mapa.set(clave, grupo);
      }

      grupo.variantes.push({
        id: prod.id,
        productoOriginal: prod,
        tipo: esHelada ? 'helada' : 'normal',
        nombreEtiqueta: esHelada ? '❄️ Helada' : 'Al tiempo',
        precio: prod.precio,
        stock: prod.stock,
        es_servicio: prod.es_servicio,
      });
    }

    // Ordenar variantes: normal primero, luego helada
    for (const g of mapa.values()) {
      g.variantes.sort((a) => (a.tipo === 'normal' ? -1 : 1));
      const normal = g.variantes.find((v) => v.tipo === 'normal');
      if (normal) g.id = normal.id;
    }

    return Array.from(mapa.values());
  }, [productos]);

  // Lista de categorías únicas con contador de productos disponibles
  const categorias = useMemo(() => {
    const set = new Set<string>();
    productos.forEach((p) => {
      if (p.activo && p.categoria) set.add(p.categoria);
    });
    return Array.from(set);
  }, [productos]);

  // Productos filtrados por categoría y texto
  const productosFiltrados = useMemo(() => {
    return productosAgrupados.filter((p) => {
      const coincideCat = categoriaActiva === 'todos' || p.categoria.toLowerCase() === categoriaActiva.toLowerCase();
      const coincideTexto = busqueda.trim() === '' || p.nombreBase.toLowerCase().includes(busqueda.trim().toLowerCase());
      return coincideCat && coincideTexto;
    });
  }, [productosAgrupados, categoriaActiva, busqueda]);

  // Items en carrito referenciando el producto original de la base de datos
  const itemsSeleccionados = useMemo(() => {
    return productos
      .filter((p) => (carrito[p.id] ?? 0) > 0)
      .map((p) => {
        const { esHelada, base } = obtenerNombreBase(p.nombre);
        return {
          producto: p,
          nombreBase: base,
          esHelada,
          cantidad: carrito[p.id],
        };
      });
  }, [productos, carrito]);

  const total = useMemo(
    () => itemsSeleccionados.reduce((acc, it) => acc + it.producto.precio * it.cantidad, 0),
    [itemsSeleccionados]
  );

  const sumaMixto = useMemo(
    () => lineas.reduce((acc, l) => acc + (Number(l.monto) || 0), 0),
    [lineas]
  );

  const vueltoCalculado = useMemo(() => {
    const entregado = Number(pagaCon);
    if (Number.isNaN(entregado) || entregado < total) return null;
    return Math.round((entregado - total) * 100) / 100;
  }, [pagaCon, total]);

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
    setPagaCon('');
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
      {/* Cabecera del POS con buscador rápido */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="section-title flex items-center gap-2 text-lg">
            <ShoppingBag size={18} strokeWidth={1.75} className="text-brand" />
            Punto de venta
          </h2>
          <p className="mt-0.5 text-xs text-muted">
            Mostrador de bebidas, suplementos y pases con variantes al tiempo o heladas
          </p>
        </div>

        {/* Buscador en tiempo real */}
        <div className="relative w-full sm:w-60">
          <Search size={14} className="absolute left-2.5 top-2.5 text-muted" />
          <input
            type="text"
            placeholder="Buscar producto..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="field !min-h-8 !pl-8 !pr-7 !text-xs !bg-surface"
          />
          {busqueda && (
            <button
              type="button"
              onClick={() => setBusqueda('')}
              className="absolute right-2 top-2 text-muted hover:text-bone"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Pestañas de categoría */}
      <div className="flex flex-wrap gap-1.5 border-b border-line/60 pb-2.5" role="tablist">
        <button
          type="button"
          onClick={() => setCategoriaActiva('todos')}
          className={`flex items-center gap-1.5 rounded-xs px-3 py-1.5 text-xs font-medium transition-colors ${
            categoriaActiva === 'todos'
              ? 'bg-bone text-ink shadow-xs'
              : 'bg-surface text-muted hover:bg-surface-2 hover:text-bone'
          }`}
        >
          <span>Todos</span>
          <span className="text-[10px] opacity-70">({productosAgrupados.length})</span>
        </button>
        {categorias.map((cat) => {
          const activo = categoriaActiva.toLowerCase() === cat.toLowerCase();
          const totalCat = productosAgrupados.filter((p) => p.categoria.toLowerCase() === cat.toLowerCase()).length;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoriaActiva(cat)}
              className={`flex items-center gap-1.5 rounded-xs px-3 py-1.5 text-xs font-medium transition-colors ${
                activo
                  ? 'bg-bone text-ink shadow-xs'
                  : 'bg-surface text-muted hover:bg-surface-2 hover:text-bone'
              }`}
            >
              {iconoCategoria(cat)}
              <span>{cat}</span>
              <span className="text-[10px] opacity-70">({totalCat})</span>
            </button>
          );
        })}
      </div>

      {/* Catálogo de Productos Agrupados */}
      {productosFiltrados.length === 0 ? (
        <div className="bg-surface px-4 py-10 text-center text-sm text-muted">
          No se encontraron productos que coincidan con la búsqueda.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
          {productosFiltrados.map((grupo) => {
            const tieneVariantes = grupo.variantes.length > 1;
            const cantTotal = grupo.variantes.reduce((sum, v) => sum + (carrito[v.id] ?? 0), 0);

            return (
              <div
                key={grupo.nombreBase}
                className={`relative flex flex-col justify-between rounded-xs border p-3.5 transition-all ${
                  cantTotal > 0
                    ? 'border-brand/60 bg-surface-2 shadow-xs'
                    : 'border-line/70 bg-surface hover:border-line hover:bg-surface-2/60'
                }`}
              >
                {/* Cabecera de la tarjeta con nombre base y categoría */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted font-mono">
                      {iconoCategoria(grupo.categoria)}
                      {grupo.categoria}
                    </span>
                    <h3 className="truncate font-semibold leading-snug text-bone text-sm mt-0.5">
                      {grupo.nombreBase}
                    </h3>
                  </div>

                  {cantTotal > 0 && (
                    <span className="inline-flex items-center justify-center rounded-xs bg-brand px-1.5 py-0.5 text-xs font-bold text-ink tabular-nums">
                      {cantTotal} en carro
                    </span>
                  )}
                </div>

                {/* Si tiene opción de Helada / Al tiempo */}
                {tieneVariantes ? (
                  <div className="mt-3.5 space-y-1.5">
                    <div className="grid grid-cols-2 gap-1.5">
                      {grupo.variantes.map((v) => {
                        const cantVar = carrito[v.id] ?? 0;
                        const sinStock = !v.es_servicio && v.stock <= 0;
                        const esHelada = v.tipo === 'helada';

                        return (
                          <button
                            key={v.id}
                            type="button"
                            disabled={sinStock}
                            onClick={() => sumar(v.productoOriginal, 1)}
                            className={`group relative flex flex-col items-center justify-center rounded-xs p-2 text-center transition-all ${
                              cantVar > 0
                                ? esHelada
                                  ? 'bg-cyan-950/70 border border-cyan-500/80 text-cyan-200'
                                  : 'bg-surface border border-brand text-bone'
                                : esHelada
                                ? 'bg-surface-2/80 hover:bg-cyan-950/40 border border-cyan-900/40 text-bone hover:border-cyan-600/50'
                                : 'bg-surface-2/80 hover:bg-surface border border-line/60 text-bone'
                            } disabled:cursor-not-allowed disabled:opacity-40`}
                          >
                            <span className="flex items-center gap-1 text-[11px] font-medium">
                              {esHelada ? (
                                <Snowflake size={12} className="text-cyan-400 shrink-0" strokeWidth={2} />
                              ) : (
                                <Sun size={12} className="text-amber-400 shrink-0" strokeWidth={2} />
                              )}
                              <span>{esHelada ? 'Helada' : 'Al tiempo'}</span>
                            </span>

                            <span className="mt-0.5 text-xs font-bold tabular-nums">
                              {soles(v.precio)}
                            </span>

                            <div className="mt-1 flex items-center justify-between w-full text-[10px]">
                              {sinStock ? (
                                <span className="font-bold text-bad">Agotado</span>
                              ) : !v.es_servicio && v.stock <= 5 ? (
                                <span className="font-semibold text-warn">Quedan {v.stock}</span>
                              ) : (
                                <span className="text-muted">Stock: {v.stock}</span>
                              )}
                              {cantVar > 0 && (
                                <span className="font-bold text-bone bg-ink/70 px-1 rounded-2xs">
                                  +{cantVar}
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  /* Producto sin variantes (Galleta, Suplemento, Pase) */
                  (() => {
                    const v = grupo.variantes[0];
                    const cantVar = carrito[v.id] ?? 0;
                    const sinStock = !v.es_servicio && v.stock <= 0;

                    return (
                      <button
                        type="button"
                        disabled={sinStock}
                        onClick={() => sumar(v.productoOriginal, 1)}
                        className={`mt-3.5 flex items-center justify-between rounded-xs p-2.5 transition-colors ${
                          cantVar > 0
                            ? 'bg-surface-2 border border-brand/50'
                            : 'bg-surface-2/80 hover:bg-surface border border-line/60'
                        } disabled:cursor-not-allowed disabled:opacity-40 text-left`}
                      >
                        <div>
                          <span className="text-base font-bold text-bone tabular-nums">
                            {soles(v.precio)}
                          </span>
                          <span className="block text-[11px] tabular-nums">
                            {v.es_servicio ? (
                              <span className="text-muted">Servicio sin límite</span>
                            ) : sinStock ? (
                              <span className="font-bold text-bad">⚠️ Agotado</span>
                            ) : v.stock <= 5 ? (
                              <span className="font-semibold text-warn">⚠️ Stock bajo ({v.stock})</span>
                            ) : (
                              <span className="text-muted">Stock: {v.stock}</span>
                            )}
                          </span>
                        </div>
                        <span className="btn btn-secondary !min-h-7 !px-2.5 !text-xs">
                          <Plus size={13} strokeWidth={2} />
                          Agregar
                        </span>
                      </button>
                    );
                  })()
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Carrito activo */}
      {itemsSeleccionados.length > 0 && (
        <div className="space-y-4 rounded-xs border border-line bg-surface p-5 shadow-lg">
          <div className="flex items-center justify-between border-b border-line/70 pb-3">
            <div className="flex items-center gap-2">
              <ShoppingBag size={18} className="text-brand" strokeWidth={1.75} />
              <h3 className="font-semibold text-bone text-base">Ticket de venta</h3>
              <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-muted font-mono">
                {itemsSeleccionados.reduce((acc, i) => acc + i.cantidad, 0)} items
              </span>
            </div>

            <button
              type="button"
              onClick={limpiarCarrito}
              className="text-xs text-muted hover:text-bad inline-flex items-center gap-1 transition-colors"
            >
              <Trash2 size={13} strokeWidth={1.5} />
              Vaciar ticket
            </button>
          </div>

          {/* Lista de productos seleccionados */}
          <ul className="divide-y divide-line/70">
            {itemsSeleccionados.map(({ producto, nombreBase, esHelada, cantidad }) => (
              <li key={producto.id} className="flex items-center justify-between py-2.5 text-sm gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="truncate font-medium text-bone">{nombreBase}</p>
                    {esHelada ? (
                      <span className="inline-flex items-center gap-1 rounded-2xs bg-cyan-950/70 border border-cyan-500/50 px-1.5 py-0.2 text-[10px] font-semibold text-cyan-300">
                        <Snowflake size={10} strokeWidth={2} /> Helada
                      </span>
                    ) : (
                      producto.categoria.toLowerCase().includes('bebida') && (
                        <span className="inline-flex items-center gap-1 rounded-2xs bg-amber-950/50 border border-amber-500/40 px-1.5 py-0.2 text-[10px] font-medium text-amber-200">
                          <Sun size={10} strokeWidth={2} /> Al tiempo
                        </span>
                      )
                    )}
                  </div>
                  <p className="text-xs text-muted tabular-nums mt-0.5">
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
                    className="btn btn-ghost !min-h-8 !px-2 hover:bg-bad/20 hover:text-bad"
                    aria-label={`Restar ${producto.nombre}`}
                  >
                    <Minus size={14} strokeWidth={1.75} />
                  </button>
                  <span className="w-6 text-center font-bold tabular-nums text-bone">{cantidad}</span>
                  <button
                    type="button"
                    onClick={() => sumar(producto, 1)}
                    className="btn btn-ghost !min-h-8 !px-2 hover:bg-brand/20 hover:text-brand"
                    aria-label={`Sumar ${producto.nombre}`}
                  >
                    <Plus size={14} strokeWidth={1.75} />
                  </button>
                </div>
              </li>
            ))}
          </ul>

          {/* Nombre de cliente opcional */}
          <div>
            <label htmlFor="pos-cliente" className="label text-xs">
              Cliente mostrador (opcional, para pase diario o referencia)
            </label>
            <input
              id="pos-cliente"
              type="text"
              placeholder="Ej: Juan Pérez / Visitante"
              value={cliente}
              onChange={(e) => setCliente(e.target.value)}
              className="field !min-h-9 !bg-surface-2"
            />
          </div>

          {/* Método de pago */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="label !mb-0 text-xs">Método de pago</span>
              <button
                type="button"
                onClick={() => {
                  setModoMixto((m) => !m);
                  setLineas([{ metodo: 'Efectivo', monto: total.toFixed(2) }]);
                }}
                className="text-xs font-medium text-brand underline underline-offset-4 hover:text-bone"
              >
                {modoMixto ? 'Cobro en 1 método' : 'Dividir pago (Mixto)'}
              </button>
            </div>

            {!modoMixto ? (
              <div className="grid grid-cols-4 gap-1.5">
                {METODOS.map((m) => {
                  const activo = metodoRapido === m;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        setMetodoRapido(m);
                        if (m !== 'Efectivo') setPagaCon('');
                      }}
                      aria-pressed={activo}
                      className={`rounded-xs py-2 text-xs font-semibold transition-all ${
                        activo
                          ? 'bg-bone text-ink shadow-xs ring-1 ring-bone'
                          : 'bg-surface-2 text-muted hover:bg-surface-2/80 hover:text-bone'
                      }`}
                    >
                      {m}
                    </button>
                  );
                })}
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
                      className="field !min-h-9 !bg-surface-2 tabular-nums text-sm flex-1"
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

          {/* Calculadora rápida de vuelto para Efectivo */}
          {metodoRapido === 'Efectivo' && !modoMixto && (
            <div className="rounded-xs bg-surface-2/80 p-3 text-xs space-y-2 border border-line/40">
              <div className="flex items-center justify-between">
                <span className="text-muted flex items-center gap-1">
                  <Banknote size={14} className="text-ok" />
                  Calculadora de vuelto:
                </span>
                {vueltoCalculado !== null && (
                  <span className="font-semibold text-ok tabular-nums">
                    Vuelto: {soles(vueltoCalculado)}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="Monto entregado (S/)"
                  value={pagaCon}
                  onChange={(e) => setPagaCon(e.target.value)}
                  className="field !min-h-8 !text-xs !bg-surface flex-1"
                />

                {/* Atajos de billetes frecuentes en Perú */}
                {[10, 20, 50, 100]
                  .filter((b) => b >= total)
                  .slice(0, 3)
                  .map((billete) => (
                    <button
                      key={billete}
                      type="button"
                      onClick={() => setPagaCon(String(billete))}
                      className="rounded-xs bg-surface px-2.5 py-1.5 text-[11px] font-semibold text-bone hover:bg-bone hover:text-ink transition-colors"
                    >
                      S/ {billete}
                    </button>
                  ))}
              </div>
            </div>
          )}

          {error && (
            <p role="alert" className="border-l-2 border-bad bg-bad/10 px-3 py-2 text-xs text-bad">
              {error}
            </p>
          )}

          {/* Barra de total y botón de cobro */}
          <div className="flex items-center justify-between border-t border-line/70 pt-3">
            <div>
              <span className="text-xs text-muted block">Total a cobrar</span>
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
                className="btn btn-primary !px-6 !min-h-11 tabular-nums font-bold"
              >
                {enviando ? (
                  <Loader2 size={16} strokeWidth={1.5} className="animate-spin" />
                ) : (
                  <Check size={16} strokeWidth={2} />
                )}
                Cobrar {soles(total)}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
