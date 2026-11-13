'use client';

import { useState, type FormEvent } from 'react';
import {
  AlertTriangle,
  Boxes,
  Edit3,
  Loader2,
  PackagePlus,
  Percent,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import {
  actualizarPlan,
  crearPlan,
  eliminarPlan,
  type DatosPlan,
} from '@/services/sociosService';
import {
  actualizarProducto,
  crearProducto,
  eliminarProducto,
  reponerStock,
  type DatosProducto,
} from '@/services/cajaService';
import { soles } from '@/lib/formato';
import { Portal } from '@/components/Portal';
import type { Plan, Producto } from '@/types';

interface Props {
  gymId: string;
  planes: Plan[];
  productos: Producto[];
  onUpdated: (msg: string) => Promise<void>;
  onError: (msg: string) => void;
}

const CATEGORIAS_PROD = ['Bebidas', 'Suplementos', 'Pases', 'Otros'];

/**
 * Permite al dueño (admin) editar los precios y condiciones de los planes
 * (que también se reflejan en la Landing Page) y de los productos del POS.
 */
export function CatalogManager({ gymId, planes, productos, onUpdated, onError }: Props) {
  // --- Estado formulario Plan ---
  const [planEditId, setPlanEditId] = useState<string | null>(null);
  const [mostrarFormPlan, setMostrarFormPlan] = useState(false);
  const [pNombre, setPNombre] = useState('');
  const [pDesc, setPDesc] = useState('');
  const [pDias, setPDias] = useState('30');
  const [pPrecio, setPPrecio] = useState('80');
  const [pVisible, setPVisible] = useState(true);
  const [pActivo, setPActivo] = useState(true);
  const [guardandoPlan, setGuardandoPlan] = useState(false);

  // --- Estado formulario Producto ---
  const [prodEditId, setProdEditId] = useState<string | null>(null);
  const [mostrarFormProd, setMostrarFormProd] = useState(false);
  const [prNombre, setPrNombre] = useState('');
  const [prCat, setPrCat] = useState('Bebidas');
  const [prPrecio, setPrPrecio] = useState('2.00');
  const [prCosto, setPrCosto] = useState('1.00');
  const [prStock, setPrStock] = useState('20');
  const [prServicio, setPrServicio] = useState(false);
  const [prActivo, setPrActivo] = useState(true);
  const [guardandoProd, setGuardandoProd] = useState(false);

  // --- Modales de Confirmación de Eliminación ---
  const [planEliminar, setPlanEliminar] = useState<Plan | null>(null);
  const [prodEliminar, setProdEliminar] = useState<Producto | null>(null);
  const [eliminando, setEliminando] = useState(false);

  // --- Modal de Reposición Rápida de Stock ---
  const [prodReponer, setProdReponer] = useState<Producto | null>(null);
  const [cantReponer, setCantReponer] = useState('12');
  const [costoReponer, setCostoReponer] = useState('');
  const [reponiendo, setReponiendo] = useState(false);

  function abrirNuevoPlan() {
    setPlanEditId(null);
    setPNombre('');
    setPDesc('');
    setPDias('30');
    setPPrecio('80');
    setPVisible(true);
    setPActivo(true);
    setMostrarFormPlan(true);
  }

  function abrirEditarPlan(p: Plan) {
    setPlanEditId(p.id);
    setPNombre(p.nombre);
    setPDesc(p.descripcion ?? '');
    setPDias(String(p.duracion_dias));
    setPPrecio(String(p.precio));
    setPVisible(p.visible_landing);
    setPActivo(p.activo);
    setMostrarFormPlan(true);
  }

  async function handleEliminarPlan() {
    if (!planEliminar) return;
    setEliminando(true);
    try {
      const res = await eliminarPlan(planEliminar.id);
      setPlanEliminar(null);
      await onUpdated(
        res.eliminado
          ? `Plan "${planEliminar.nombre}" eliminado permanentemente`
          : `Plan "${planEliminar.nombre}" archivado y ocultado (posee historial de membresías)`
      );
    } catch (err) {
      onError(err instanceof Error ? err.message : 'No se pudo eliminar el plan');
    } finally {
      setEliminando(false);
    }
  }

  async function handleEliminarProd() {
    if (!prodEliminar) return;
    setEliminando(true);
    try {
      const res = await eliminarProducto(prodEliminar.id);
      setProdEliminar(null);
      await onUpdated(
        res.eliminado
          ? `Producto "${prodEliminar.nombre}" eliminado permanentemente`
          : `Producto "${prodEliminar.nombre}" archivado y ocultado (posee historial de ventas)`
      );
    } catch (err) {
      onError(err instanceof Error ? err.message : 'No se pudo eliminar el producto');
    } finally {
      setEliminando(false);
    }
  }

  async function handleReponerStock(e: FormEvent) {
    e.preventDefault();
    if (!prodReponer) return;
    const cant = Number(cantReponer);
    if (Number.isNaN(cant) || cant <= 0) {
      onError('Ingresa una cantidad válida mayor a 0');
      return;
    }
    const nuevoCosto = costoReponer.trim() !== '' ? Number(costoReponer) : undefined;
    setReponiendo(true);
    try {
      const nuevoTotal = await reponerStock(prodReponer.id, cant, nuevoCosto);
      setProdReponer(null);
      setCantReponer('12');
      setCostoReponer('');
      await onUpdated(
        `Stock repuesto: "${prodReponer.nombre}" ahora tiene ${nuevoTotal} unidades`
      );
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Error al reponer stock');
    } finally {
      setReponiendo(false);
    }
  }

  async function guardarPlan(e: FormEvent) {
    e.preventDefault();
    const duracion = Number(pDias);
    const precio = Number(pPrecio);
    if (!pNombre.trim() || duracion <= 0 || Number.isNaN(precio) || precio < 0) {
      onError('Completa el nombre, duración y un precio válido');
      return;
    }
    const payload: DatosPlan = {
      nombre: pNombre.trim(),
      descripcion: pDesc.trim() || null,
      duracion_dias: duracion,
      precio,
      permite_congelar: false,
      max_dias_congelar: null,
      visible_landing: pVisible,
      activo: pActivo,
    };

    setGuardandoPlan(true);
    try {
      if (planEditId) {
        await actualizarPlan(planEditId, payload);
        setMostrarFormPlan(false);
        await onUpdated(`Plan "${payload.nombre}" actualizado`);
      } else {
        await crearPlan(gymId, payload);
        setMostrarFormPlan(false);
        await onUpdated(`Plan "${payload.nombre}" creado`);
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : 'No se pudo guardar el plan');
    } finally {
      setGuardandoPlan(false);
    }
  }

  function abrirNuevoProd() {
    setProdEditId(null);
    setPrNombre('');
    setPrCat('Bebidas');
    setPrPrecio('2.00');
    setPrCosto('1.00');
    setPrStock('20');
    setPrServicio(false);
    setPrActivo(true);
    setMostrarFormProd(true);
  }

  function abrirEditarProd(p: Producto) {
    setProdEditId(p.id);
    setPrNombre(p.nombre);
    setPrCat(p.categoria);
    setPrPrecio(String(p.precio));
    setPrCosto(p.costo !== undefined && p.costo !== null ? String(p.costo) : '0');
    setPrStock(String(p.stock));
    setPrServicio(p.es_servicio);
    setPrActivo(p.activo);
    setMostrarFormProd(true);
  }

  async function guardarProd(e: FormEvent) {
    e.preventDefault();
    const precio = Number(prPrecio);
    const costo = Number(prCosto) || 0;
    const stock = prServicio ? 0 : Number(prStock);
    if (!prNombre.trim() || Number.isNaN(precio) || precio < 0) {
      onError('Completa el nombre y un precio válido');
      return;
    }
    const payload: DatosProducto = {
      nombre: prNombre.trim(),
      categoria: prCat,
      precio,
      costo: costo >= 0 ? costo : 0,
      stock: Number.isNaN(stock) ? 0 : stock,
      es_servicio: prServicio,
      activo: prActivo,
    };

    setGuardandoProd(true);
    try {
      if (prodEditId) {
        await actualizarProducto(prodEditId, payload);
        setMostrarFormProd(false);
        await onUpdated(`Producto "${payload.nombre}" actualizado`);
      } else {
        await crearProducto(gymId, payload);
        setMostrarFormProd(false);
        await onUpdated(`Producto "${payload.nombre}" creado`);
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : 'No se pudo guardar el producto');
    } finally {
      setGuardandoProd(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      {/* 1. PLANES DE MEMBRESÍA */}
      <section aria-label="Planes de membresía" className="bg-surface p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="section-title text-base">Planes de entrenamiento</h3>
          <button
            type="button"
            onClick={abrirNuevoPlan}
            className="btn btn-secondary !min-h-8 !px-3 !text-xs"
          >
            <Plus size={14} strokeWidth={1.5} /> Nuevo plan
          </button>
        </div>

        {mostrarFormPlan && (
          <form onSubmit={guardarPlan} className="mb-5 space-y-3 bg-surface-2 p-4 text-sm">
            <p className="text-xs font-semibold text-bone">
              {planEditId ? 'Editar plan' : 'Crear nuevo plan'}
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label htmlFor="plan-nombre" className="label">
                  Nombre del plan
                </label>
                <input
                  id="plan-nombre"
                  type="text"
                  required
                  value={pNombre}
                  onChange={(e) => setPNombre(e.target.value)}
                  className="field !min-h-9"
                  placeholder="Ej: Mensual (Diario)"
                />
              </div>
              <div>
                <label htmlFor="plan-precio" className="label">
                  Precio (S/)
                </label>
                <input
                  id="plan-precio"
                  type="number"
                  step="0.50"
                  min="0"
                  required
                  value={pPrecio}
                  onChange={(e) => setPPrecio(e.target.value)}
                  className="field !min-h-9 tabular-nums"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label htmlFor="plan-dias" className="label">
                  Duración (días)
                </label>
                <input
                  id="plan-dias"
                  type="number"
                  min="1"
                  required
                  value={pDias}
                  onChange={(e) => setPDias(e.target.value)}
                  className="field !min-h-9 tabular-nums"
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="plan-desc" className="label">
                  Descripción corta (web)
                </label>
                <input
                  id="plan-desc"
                  type="text"
                  value={pDesc}
                  onChange={(e) => setPDesc(e.target.value)}
                  className="field !min-h-9"
                  placeholder="Ej: 30 días con ingreso todos los días"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-1 text-xs">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={pVisible}
                  onChange={(e) => setPVisible(e.target.checked)}
                />
                Mostrar en web
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={pActivo}
                  onChange={(e) => setPActivo(e.target.checked)}
                />
                Activo
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setMostrarFormPlan(false)}
                className="btn btn-ghost !min-h-8 !px-3 !text-xs"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardandoPlan}
                className="btn btn-primary !min-h-8 !px-4 !text-xs"
              >
                {guardandoPlan && <Loader2 size={14} strokeWidth={1.5} className="animate-spin" />}
                Guardar plan
              </button>
            </div>
          </form>
        )}

        <ul className="divide-y divide-line/70 border-t border-line/70">
          {planes.map((p) => (
            <li
              key={p.id}
              className={`flex items-center justify-between py-3 text-sm ${
                !p.activo ? 'opacity-50' : ''
              }`}
            >
              <div>
                <p className="font-medium text-bone">
                  {p.nombre}{' '}
                  <span className="text-xs font-normal text-muted tabular-nums">
                    ({p.duracion_dias === 1 ? '1 día' : `${p.duracion_dias} días`})
                  </span>
                </p>
                <p className="text-xs text-muted">
                  {p.visible_landing ? 'Visible en web' : 'Oculto en web'}
                  {!p.activo && ' · Inactivo'}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-semibold text-bone tabular-nums mr-2">
                  {soles(p.precio)}
                </span>
                <button
                  type="button"
                  onClick={() => abrirEditarPlan(p)}
                  className="rounded-xs p-2 text-muted transition-colors hover:bg-surface-2 hover:text-bone"
                  aria-label={`Editar ${p.nombre}`}
                  title={`Editar ${p.nombre}`}
                >
                  <Edit3 size={15} strokeWidth={1.5} />
                </button>
                <button
                  type="button"
                  onClick={() => setPlanEliminar(p)}
                  className="rounded-xs p-2 text-muted transition-colors hover:bg-bad/20 hover:text-bad"
                  aria-label={`Eliminar ${p.nombre}`}
                  title={`Eliminar ${p.nombre}`}
                >
                  <Trash2 size={15} strokeWidth={1.5} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* 2. PRODUCTOS DEL POS */}
      <section aria-label="Productos de mostrador" className="bg-surface p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="section-title text-base flex items-center gap-1.5">
              <Boxes size={16} className="text-brand" />
              Catálogo POS y Almacén
            </h3>
            <p className="text-[11px] text-muted">
              Precios, costo de compra, márgenes de ganancia y reposición
            </p>
          </div>
          <button
            type="button"
            onClick={abrirNuevoProd}
            className="btn btn-secondary !min-h-8 !px-3 !text-xs"
          >
            <Plus size={14} strokeWidth={1.5} /> Nuevo producto
          </button>
        </div>

        {mostrarFormProd && (
          <form onSubmit={guardarProd} className="mb-5 space-y-3 bg-surface-2 p-4 text-sm">
            <p className="text-xs font-semibold text-bone">
              {prodEditId ? 'Editar producto' : 'Crear nuevo producto'}
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label htmlFor="prod-nombre" className="label">
                  Nombre
                </label>
                <input
                  id="prod-nombre"
                  type="text"
                  required
                  value={prNombre}
                  onChange={(e) => setPrNombre(e.target.value)}
                  className="field !min-h-9"
                  placeholder="Ej: Agua Cielo"
                />
              </div>
              <div>
                <label htmlFor="prod-cat" className="label">
                  Categoría
                </label>
                <select
                  id="prod-cat"
                  value={prCat}
                  onChange={(e) => {
                    const nuevaCat = e.target.value;
                    setPrCat(nuevaCat);
                    if (nuevaCat === 'Pases') {
                      setPrServicio(true);
                      setPrCosto('0');
                    }
                  }}
                  className="field !min-h-9"
                >
                  {CATEGORIAS_PROD.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label htmlFor="prod-precio" className="label">
                  Precio venta (S/)
                </label>
                <input
                  id="prod-precio"
                  type="number"
                  step="0.10"
                  min="0"
                  required
                  value={prPrecio}
                  onChange={(e) => setPrPrecio(e.target.value)}
                  className="field !min-h-9 tabular-nums"
                />
              </div>
              <div>
                <label htmlFor="prod-costo" className="label">
                  Costo de compra (S/)
                </label>
                <input
                  id="prod-costo"
                  type="number"
                  step="0.10"
                  min="0"
                  value={prCosto}
                  onChange={(e) => setPrCosto(e.target.value)}
                  className="field !min-h-9 tabular-nums"
                  placeholder="0.00"
                />
              </div>
              {!prServicio && (
                <div>
                  <label htmlFor="prod-stock" className="label">
                    Stock disponible
                  </label>
                  <input
                    id="prod-stock"
                    type="number"
                    min="0"
                    required
                    value={prStock}
                    onChange={(e) => setPrStock(e.target.value)}
                    className="field !min-h-9 tabular-nums"
                  />
                </div>
              )}
            </div>

            {/* Estimador de margen en tiempo real */}
            {(() => {
              const pv = Number(prPrecio) || 0;
              const pc = Number(prCosto) || 0;
              const gan = pv - pc;
              const pct = pc > 0 ? Math.round((gan / pc) * 100) : 100;
              return (
                <div className="rounded-xs bg-surface p-2.5 text-xs flex items-center justify-between border border-line/50">
                  <span className="text-muted flex items-center gap-1">
                    <Percent size={13} className="text-brand" /> Margen unitario proyectado:
                  </span>
                  <span className={`font-semibold tabular-nums ${gan >= 0 ? 'text-ok' : 'text-bad'}`}>
                    {soles(gan)} ({pct >= 0 ? `+${pct}%` : `${pct}%`})
                  </span>
                </div>
              );
            })()}

            <div className="flex flex-wrap items-center gap-4 pt-1 text-xs">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={prServicio}
                  onChange={(e) => setPrServicio(e.target.checked)}
                />
                Es servicio (sin control de stock, ej. Pase por día)
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={prActivo}
                  onChange={(e) => setPrActivo(e.target.checked)}
                />
                Activo
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setMostrarFormProd(false)}
                className="btn btn-ghost !min-h-8 !px-3 !text-xs"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardandoProd}
                className="btn btn-primary !min-h-8 !px-4 !text-xs"
              >
                {guardandoProd && <Loader2 size={14} strokeWidth={1.5} className="animate-spin" />}
                Guardar producto
              </button>
            </div>
          </form>
        )}

        <ul className="divide-y divide-line/70 border-t border-line/70">
          {productos.map((p) => {
            const esBajo = !p.es_servicio && p.stock <= 5;
            const esAgotado = !p.es_servicio && p.stock === 0;
            const costo = Number(p.costo) || 0;
            const margen = p.precio - costo;
            const margenPct = costo > 0 ? Math.round((margen / costo) * 100) : 0;

            return (
              <li
                key={p.id}
                className={`flex flex-col gap-2 py-3 text-sm sm:flex-row sm:items-center sm:justify-between ${
                  !p.activo ? 'opacity-50' : ''
                }`}
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-bone">{p.nombre}</p>
                    <span className="text-xs text-muted">· {p.categoria}</span>
                    {esAgotado ? (
                      <span className="inline-flex items-center gap-1 rounded-2xs bg-bad/15 px-1.5 py-0.5 text-[10px] font-bold text-bad">
                        <AlertTriangle size={11} strokeWidth={2} /> Agotado
                      </span>
                    ) : esBajo ? (
                      <span className="inline-flex items-center gap-1 rounded-2xs bg-warn/15 px-1.5 py-0.5 text-[10px] font-semibold text-warn">
                        <AlertTriangle size={11} strokeWidth={2} /> Stock bajo ({p.stock})
                      </span>
                    ) : null}
                  </div>

                  <p className="text-xs text-muted tabular-nums">
                    {p.es_servicio ? (
                      'Servicio sin stock'
                    ) : (
                      <>
                        Stock: <strong className="text-bone">{p.stock}</strong> un.
                      </>
                    )}
                    {costo > 0 && (
                      <span className="ml-2 border-l border-line/60 pl-2 text-muted">
                        Costo: {soles(costo)} · Margen:{' '}
                        <span className="text-ok font-semibold">+{margenPct}%</span>
                      </span>
                    )}
                    {!p.activo && ' · Inactivo'}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 self-end sm:self-center">
                  <span className="text-base font-semibold text-bone tabular-nums mr-2">
                    {soles(p.precio)}
                  </span>

                  {!p.es_servicio && (
                    <button
                      type="button"
                      onClick={() => {
                        setProdReponer(p);
                        setCantReponer('12');
                        setCostoReponer(p.costo ? String(p.costo) : '');
                      }}
                      className="btn btn-secondary !min-h-8 !px-2.5 !text-xs flex items-center gap-1"
                      title="Reponer existencias"
                    >
                      <PackagePlus size={13} strokeWidth={1.5} />
                      + Stock
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => abrirEditarProd(p)}
                    className="rounded-xs p-2 text-muted transition-colors hover:bg-surface-2 hover:text-bone"
                    aria-label={`Editar ${p.nombre}`}
                    title={`Editar ${p.nombre}`}
                  >
                    <Edit3 size={15} strokeWidth={1.5} />
                  </button>

                  <button
                    type="button"
                    onClick={() => setProdEliminar(p)}
                    className="rounded-xs p-2 text-muted transition-colors hover:bg-bad/20 hover:text-bad"
                    aria-label={`Eliminar ${p.nombre}`}
                    title={`Eliminar ${p.nombre}`}
                  >
                    <Trash2 size={15} strokeWidth={1.5} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* MODAL: Confirmar eliminación de Plan */}
      {planEliminar && (
        <Portal>
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs"
          >
            <div className="panel-card modal-animate w-full max-w-sm p-6 shadow-xl">
              <h3 className="text-base font-bold text-bone">¿Eliminar plan de membresía?</h3>
              <p className="mt-2 text-xs leading-relaxed text-muted">
                Vas a eliminar el plan <strong className="text-bone">&ldquo;{planEliminar.nombre}&rdquo;</strong>. Si
                el plan tiene socios o ventas registradas en el pasado, se archivará y ocultará de la
                web automáticamente para proteger el historial financiero.
              </p>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPlanEliminar(null)}
                  className="btn btn-ghost !min-h-8 !text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={eliminando}
                  onClick={handleEliminarPlan}
                  className="btn btn-primary !min-h-8 !bg-bad !text-white hover:!bg-bad/90 !text-xs"
                >
                  {eliminando && <Loader2 size={13} className="animate-spin" />}
                  Confirmar eliminación
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* MODAL: Confirmar eliminación de Producto */}
      {prodEliminar && (
        <Portal>
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs"
          >
            <div className="panel-card modal-animate w-full max-w-sm p-6 shadow-xl">
              <h3 className="text-base font-bold text-bone">¿Eliminar producto del catálogo?</h3>
              <p className="mt-2 text-xs leading-relaxed text-muted">
                Vas a eliminar <strong className="text-bone">&ldquo;{prodEliminar.nombre}&rdquo;</strong>. Si tiene
                ventas históricas registradas en caja, se archivará y ocultará del POS automáticamente
                para no alterar los arqueos pasados.
              </p>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setProdEliminar(null)}
                  className="btn btn-ghost !min-h-8 !text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={eliminando}
                  onClick={handleEliminarProd}
                  className="btn btn-primary !min-h-8 !bg-bad !text-white hover:!bg-bad/90 !text-xs"
                >
                  {eliminando && <Loader2 size={13} className="animate-spin" />}
                  Confirmar eliminación
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* MODAL: Reposición Rápida de Stock */}
      {prodReponer && (
        <Portal>
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs"
          >
            <div className="panel-card modal-animate max-h-[90vh] w-full max-w-sm overflow-y-auto p-6 shadow-xl">
              <div className="flex items-center justify-between border-b border-line/60 pb-3">
                <div className="flex items-center gap-2">
                  <PackagePlus size={16} className="text-brand" />
                  <h3 className="text-base font-bold text-bone">Reponer existencias</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setProdReponer(null)}
                  className="text-muted hover:text-bone"
                >
                  <X size={15} />
                </button>
              </div>

              <form onSubmit={handleReponerStock} className="mt-4 space-y-3 text-xs">
                <div>
                  <span className="text-muted block">Producto</span>
                  <span className="font-semibold text-bone text-sm">{prodReponer.nombre}</span>
                  <span className="text-muted block mt-0.5">
                    Stock actual: <strong className="text-bone">{prodReponer.stock}</strong> unidades
                  </span>
                </div>

                <div>
                  <label htmlFor="cant-reponer" className="label !text-xs">
                    Cantidad que ingresa al almacén *
                  </label>
                  <input
                    id="cant-reponer"
                    type="number"
                    min="1"
                    required
                    autoFocus
                    value={cantReponer}
                    onChange={(e) => setCantReponer(e.target.value)}
                    className="field !min-h-9 tabular-nums text-sm"
                    placeholder="Ej: 24"
                  />
                </div>

                <div>
                  <label htmlFor="costo-reponer" className="label !text-xs">
                    Nuevo costo unitario de compra (S/) - opcional
                  </label>
                  <input
                    id="costo-reponer"
                    type="number"
                    step="0.10"
                    min="0"
                    value={costoReponer}
                    onChange={(e) => setCostoReponer(e.target.value)}
                    className="field !min-h-9 tabular-nums text-sm"
                    placeholder={prodReponer.costo ? String(prodReponer.costo) : '0.00'}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-line/60">
                  <button
                    type="button"
                    onClick={() => setProdReponer(null)}
                    className="btn btn-ghost !min-h-8 !text-xs"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={reponiendo}
                    className="btn btn-primary !min-h-8 !text-xs"
                  >
                    {reponiendo && <Loader2 size={13} className="animate-spin" />}
                    Confirmar ingreso
                  </button>
                </div>
              </form>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
