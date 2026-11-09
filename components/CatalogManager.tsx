'use client';

import { useState, type FormEvent } from 'react';
import { Edit3, Loader2, Plus } from 'lucide-react';
import {
  actualizarPlan,
  crearPlan,
  type DatosPlan,
} from '@/services/sociosService';
import {
  actualizarProducto,
  crearProducto,
  type DatosProducto,
} from '@/services/cajaService';
import { soles } from '@/lib/formato';
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
  const [prStock, setPrStock] = useState('20');
  const [prServicio, setPrServicio] = useState(false);
  const [prActivo, setPrActivo] = useState(true);
  const [guardandoProd, setGuardandoProd] = useState(false);

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
    setPrStock(String(p.stock));
    setPrServicio(p.es_servicio);
    setPrActivo(p.activo);
    setMostrarFormProd(true);
  }

  async function guardarProd(e: FormEvent) {
    e.preventDefault();
    const precio = Number(prPrecio);
    const stock = prServicio ? 0 : Number(prStock);
    if (!prNombre.trim() || Number.isNaN(precio) || precio < 0) {
      onError('Completa el nombre y un precio válido');
      return;
    }
    const payload: DatosProducto = {
      nombre: prNombre.trim(),
      categoria: prCat,
      precio,
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
              <div className="flex items-center gap-2">
                <span className="text-base font-semibold text-bone tabular-nums">
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
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* 2. PRODUCTOS DEL POS */}
      <section aria-label="Productos de mostrador" className="bg-surface p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="section-title text-base">Catálogo POS</h3>
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
                  placeholder="Ej: Agua Cielo (Helada)"
                />
              </div>
              <div>
                <label htmlFor="prod-cat" className="label">
                  Categoría
                </label>
                <select
                  id="prod-cat"
                  value={prCat}
                  onChange={(e) => setPrCat(e.target.value)}
                  className="field !min-h-9"
                >
                  {CATEGORIAS_PROD.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="prod-precio" className="label">
                  Precio unitario (S/)
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
          {productos.map((p) => (
            <li
              key={p.id}
              className={`flex items-center justify-between py-3 text-sm ${
                !p.activo ? 'opacity-50' : ''
              }`}
            >
              <div>
                <p className="font-medium text-bone">
                  {p.nombre}{' '}
                  <span className="text-xs font-normal text-muted">· {p.categoria}</span>
                </p>
                <p className="text-xs text-muted tabular-nums">
                  {p.es_servicio ? 'Servicio sin stock' : `Stock: ${p.stock}`}
                  {!p.activo && ' · Inactivo'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-base font-semibold text-bone tabular-nums">
                  {soles(p.precio)}
                </span>
                <button
                  type="button"
                  onClick={() => abrirEditarProd(p)}
                  className="rounded-xs p-2 text-muted transition-colors hover:bg-surface-2 hover:text-bone"
                  aria-label={`Editar ${p.nombre}`}
                  title={`Editar ${p.nombre}`}
                >
                  <Edit3 size={15} strokeWidth={1.5} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
