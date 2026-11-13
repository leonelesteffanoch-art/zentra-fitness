'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  Download,
  Dumbbell,
  Layers,
  Loader2,
  Package,
  Shield,
  ShoppingBag,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useAuth } from '@/components/AuthProvider';
import { CatalogManager } from '@/components/CatalogManager';
import { GymStatsSection } from '@/components/GymStatsSection';
import { StaffManager } from '@/components/StaffManager';
import {
  listarProductos,
  movimientosParaExport,
  obtenerEstadisticasAdmin,
  resumenPeriodo,
  type ComparativaMeses,
  type DesglosePlan,
  type DesgloseProducto,
} from '@/services/cajaService';
import { listarPlanes } from '@/services/sociosService';
import { hoyLima, soles, sumarDias } from '@/lib/formato';
import type {
  MetodoPago,
  MovimientoExport,
  Plan,
  Producto,
  ResumenPeriodoFila,
} from '@/types';

export default function AdminPage() {
  const { perfil, loading } = useAuth();
  const router = useRouter();
  const gymId = perfil?.gym_id;

  const [desde, setDesde] = useState(() => sumarDias(hoyLima(), -30));
  const [hasta, setHasta] = useState(() => hoyLima());

  const [cargando, setCargando] = useState(true);
  const [exportando, setExportando] = useState(false);
  const [resumen, setResumen] = useState<ResumenPeriodoFila[]>([]);
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [comparativa, setComparativa] = useState<ComparativaMeses | null>(null);
  const [desglosePlanes, setDesglosePlanes] = useState<DesglosePlan[]>([]);
  const [desgloseProds, setDesgloseProds] = useState<DesgloseProducto[]>([]);
  const [pestana, setPestana] = useState<'todo' | 'finanzas' | 'catalogo' | 'personal'>('todo');
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  useEffect(() => {
    if (!loading && perfil && perfil.rol !== 'admin') {
      router.replace('/recepcion');
    }
  }, [loading, perfil, router]);

  const recargarCatalogos = useCallback(async () => {
    if (!gymId) return;
    const [pls, prods] = await Promise.all([
      listarPlanes(gymId, true),
      listarProductos(gymId, true),
    ]);
    setPlanes(pls);
    setProductos(prods);
  }, [gymId]);

  const consultarPeriodo = useCallback(
    async (fDesde: string, fHasta: string) => {
      if (!fDesde || !fHasta || fDesde > fHasta || !gymId) return;
      setCargando(true);
      try {
        const [filas, stats] = await Promise.all([
          resumenPeriodo(fDesde, fHasta),
          obtenerEstadisticasAdmin(gymId, fDesde, fHasta),
        ]);
        setResumen(filas);
        setComparativa(stats.comparativa);
        setDesglosePlanes(stats.planes);
        setDesgloseProds(stats.productos);
      } catch (e) {
        setAviso({
          tipo: 'error',
          texto: e instanceof Error ? e.message : 'Error al consultar finanzas',
        });
      } finally {
        setCargando(false);
      }
    },
    [gymId]
  );

  useEffect(() => {
    if (!gymId || perfil?.rol !== 'admin') return;
    let cancelado = false;
    Promise.all([
      resumenPeriodo(desde, hasta),
      listarPlanes(gymId, true),
      listarProductos(gymId, true),
      obtenerEstadisticasAdmin(gymId, desde, hasta),
    ])
      .then(([filas, pls, prods, stats]) => {
        if (cancelado) return;
        setResumen(filas);
        setPlanes(pls);
        setProductos(prods);
        setComparativa(stats.comparativa);
        setDesglosePlanes(stats.planes);
        setDesgloseProds(stats.productos);
      })
      .catch((e: unknown) => {
        if (!cancelado) {
          setAviso({
            tipo: 'error',
            texto: e instanceof Error ? e.message : 'Error al cargar panel admin',
          });
        }
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gymId, perfil?.rol]);

  // Totales agregados a partir de las filas resumidas en PostgreSQL
  const kpis = useMemo(() => {
    let ingresos = 0;
    let egresos = 0;
    const porMetodo: Record<MetodoPago, number> = {
      Efectivo: 0,
      Yape: 0,
      Plin: 0,
      Tarjeta: 0,
    };

    const porDiaMap = new Map<string, { fecha: string; ingresos: number; egresos: number }>();

    for (const r of resumen) {
      const monto = Number(r.total) || 0;
      if (r.tipo === 'INGRESO') {
        ingresos += monto;
        porMetodo[r.metodo] = (porMetodo[r.metodo] ?? 0) + monto;
      } else {
        egresos += monto;
      }

      const dia = porDiaMap.get(r.fecha) ?? { fecha: r.fecha, ingresos: 0, egresos: 0 };
      if (r.tipo === 'INGRESO') dia.ingresos += monto;
      else dia.egresos += monto;
      porDiaMap.set(r.fecha, dia);
    }

    const serieDiaria = Array.from(porDiaMap.values())
      .sort((a, b) => a.fecha.localeCompare(b.fecha))
      .slice(-14);
    const maxDiario = Math.max(
      1,
      ...serieDiaria.map((d) => Math.max(d.ingresos, d.egresos))
    );

    return {
      ingresos,
      egresos,
      neto: ingresos - egresos,
      porMetodo,
      serieDiaria,
      maxDiario,
    };
  }, [resumen]);

  function aplicarRangoRapido(diasAtras: number | 'mes') {
    const hoy = hoyLima();
    const nuevoDesde =
      diasAtras === 'mes' ? `${hoy.slice(0, 8)}01` : sumarDias(hoy, -diasAtras);
    setDesde(nuevoDesde);
    setHasta(hoy);
    void consultarPeriodo(nuevoDesde, hoy);
  }

  async function exportarExcel() {
    if (!gymId) return;
    setExportando(true);
    setAviso(null);
    try {
      const acumulado: MovimientoExport[] = [];
      let pag = 0;
      while (pag < 10) {
        const lote = await movimientosParaExport(gymId, desde, hasta, pag);
        acumulado.push(...lote);
        if (lote.length < 1000) break;
        pag += 1;
      }

      if (acumulado.length === 0) {
        setAviso({ tipo: 'error', texto: 'No hay movimientos activos en ese rango para exportar' });
        return;
      }

      const filasExcel = acumulado.map((f) => ({
        Fecha: f.Fecha,
        Hora: f.Hora,
        Turno: f.Turno,
        Tipo: f.Tipo,
        Concepto: f.Concepto,
        Monto: Number(f.Monto),
        Método: f['Método'],
        'Socio/Cliente': f['Socio/Cliente'],
        Responsable: f.Responsable,
      }));

      const hoja = XLSX.utils.json_to_sheet(filasExcel);
      hoja['!cols'] = [
        { wch: 12 },
        { wch: 8 },
        { wch: 10 },
        { wch: 10 },
        { wch: 30 },
        { wch: 12 },
        { wch: 12 },
        { wch: 28 },
        { wch: 20 },
      ];
      const libro = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(libro, hoja, 'Movimientos');
      XLSX.writeFile(libro, `Zentra_Fitness_Caja_${desde}_a_${hasta}.xlsx`);
      setAviso({
        tipo: 'ok',
        texto: `Excel exportado (${filasExcel.length} movimientos)`,
      });
    } catch (e) {
      setAviso({
        tipo: 'error',
        texto: e instanceof Error ? e.message : 'No se pudo exportar a Excel',
      });
    } finally {
      setExportando(false);
    }
  }

  if (perfil && perfil.rol !== 'admin') return null;

  const totalIng = Math.max(1, kpis.ingresos);
  const pctEfec = kpis.ingresos > 0 ? Math.round((kpis.porMetodo.Efectivo / totalIng) * 100) : 0;
  const pctYape = kpis.ingresos > 0 ? Math.round((kpis.porMetodo.Yape / totalIng) * 100) : 0;
  const pctPlin = kpis.ingresos > 0 ? Math.round((kpis.porMetodo.Plin / totalIng) * 100) : 0;
  const pctTarj =
    kpis.ingresos > 0 ? Math.max(0, 100 - pctEfec - pctYape - pctPlin) : 0;

  return (
    <div className="panel-fade-in space-y-8">
      {/* Cabecera y Filtro de rango + Atajos rápidos */}
      <div className="flex flex-col justify-between gap-4 border-b border-line/80 pb-5 xl:flex-row xl:items-end">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-brand">
            Dirección, Finanzas y Catálogo
          </p>
          <h1 className="mt-0.5 font-display text-4xl tracking-wide sm:text-5xl">
            ADMINISTRACIÓN
          </h1>
        </div>

        <div className="flex flex-wrap items-end gap-2.5">
          {/* Atajos de fecha */}
          <div className="flex items-center gap-1 rounded-md border border-line bg-surface p-1">
            {(
              [
                { label: 'Hoy', val: 0 as const },
                { label: '7d', val: 7 as const },
                { label: 'Este mes', val: 'mes' as const },
                { label: '30d', val: 30 as const },
                { label: '90d', val: 90 as const },
              ]
            ).map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => aplicarRangoRapido(preset.val)}
                className="rounded px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-surface-2 hover:text-bone"
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div>
            <label htmlFor="admin-desde" className="label text-[10px]">
              Desde
            </label>
            <input
              id="admin-desde"
              type="date"
              value={desde}
              onChange={(e) => {
                const v = e.target.value;
                setDesde(v);
                void consultarPeriodo(v, hasta);
              }}
              className="field !min-h-9 font-mono text-xs"
            />
          </div>
          <div>
            <label htmlFor="admin-hasta" className="label text-[10px]">
              Hasta
            </label>
            <input
              id="admin-hasta"
              type="date"
              value={hasta}
              onChange={(e) => {
                const v = e.target.value;
                setHasta(v);
                void consultarPeriodo(desde, v);
              }}
              className="field !min-h-9 font-mono text-xs"
            />
          </div>
          <button
            type="button"
            disabled={exportando}
            onClick={exportarExcel}
            className="btn btn-secondary !min-h-9"
          >
            {exportando ? (
              <Loader2 size={15} strokeWidth={1.75} className="animate-spin" />
            ) : (
              <Download size={15} strokeWidth={1.75} />
            )}
            Exportar .xlsx
          </button>
        </div>
      </div>

      {/* Sub-navegación rápida de secciones de Administración */}
      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Secciones de administración">
        {(
          [
            { id: 'todo', label: 'Vista general', icon: <Layers size={14} /> },
            { id: 'finanzas', label: 'Finanzas y Flujo', icon: <Wallet size={14} /> },
            { id: 'catalogo', label: 'Catálogo y Stock', icon: <Package size={14} /> },
            { id: 'personal', label: 'Personal y Sistema', icon: <Shield size={14} /> },
          ] as const
        ).map((tab) => {
          const activo = pestana === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activo}
              onClick={() => setPestana(tab.id)}
              className={`flex items-center gap-2 rounded-md px-3.5 py-2 text-xs font-semibold transition-all ${
                activo
                  ? 'bg-brand text-ink shadow-xs'
                  : 'border border-line bg-surface text-muted hover:bg-surface-2 hover:text-bone'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          );
        })}
      </div>

      {aviso && (
        <p
          role={aviso.tipo === 'error' ? 'alert' : 'status'}
          className={`panel-fade-in flex items-center gap-2 rounded-md border-l-4 px-4 py-3 text-sm font-medium ${
            aviso.tipo === 'ok' ? 'border-ok bg-ok/15 text-ok' : 'border-bad bg-bad/15 text-bad'
          }`}
        >
          {aviso.tipo === 'ok' && <CheckCircle2 size={16} strokeWidth={1.75} />}
          {aviso.texto}
        </p>
      )}

      {(pestana === 'todo' || pestana === 'finanzas') && (
        <>
          {/* 1. Balance del período: Flujo neto + Barra gráfica de métodos */}
          <section aria-label="Balance del período" className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="section-title text-lg">Balance financiero ({desde} → {hasta})</h2>
              {cargando && <Loader2 size={15} strokeWidth={1.75} className="animate-spin text-brand" />}
            </div>

            <div className="panel-card p-6">
              <div className="grid items-baseline gap-6 sm:grid-cols-3">
                {/* Protagonista: Flujo neto */}
                <div className="rounded-md border border-brand/25 bg-gradient-to-br from-surface-2 to-ink p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                    Flujo neto en caja
                  </p>
                  <p className="mt-1 font-mono text-3xl font-bold text-brand tabular-nums sm:text-4xl">
                    {soles(kpis.neto)}
                  </p>
                </div>

                {/* Secundarios: Ingresos y Egresos */}
                <div className="rounded-md border border-line/70 bg-ink/40 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                    Ingresos brutos
                  </p>
                  <p className="mt-1 font-mono text-2xl font-bold text-ok tabular-nums sm:text-3xl">
                    {soles(kpis.ingresos)}
                  </p>
                </div>
                <div className="rounded-md border border-line/70 bg-ink/40 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                    Egresos y retiros
                  </p>
                  <p className="mt-1 font-mono text-2xl font-bold text-bad tabular-nums sm:text-3xl">
                    {soles(kpis.egresos)}
                  </p>
                </div>
              </div>

              {/* Barra apilada de métodos de pago */}
              <div className="mt-6 space-y-2 border-t border-line/70 pt-4">
                <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-surface-2">
                  {kpis.ingresos === 0 ? (
                    <div className="h-full w-full bg-line/40" />
                  ) : (
                    <>
                      {pctEfec > 0 && (
                        <div className="bar-fill h-full bg-ok" style={{ width: `${pctEfec}%` }} />
                      )}
                      {pctYape > 0 && (
                        <div className="bar-fill h-full bg-purple-500" style={{ width: `${pctYape}%` }} />
                      )}
                      {pctPlin > 0 && (
                        <div className="bar-fill h-full bg-cyan-400" style={{ width: `${pctPlin}%` }} />
                      )}
                      {pctTarj > 0 && (
                        <div className="bar-fill h-full bg-amber-400" style={{ width: `${pctTarj}%` }} />
                      )}
                    </>
                  )}
                </div>

                <dl className="grid grid-cols-2 gap-3 pt-1 text-xs tabular-nums sm:grid-cols-4">
                  <div className="flex items-center justify-between rounded bg-surface-2/50 px-3 py-2">
                    <dt className="flex items-center gap-1.5 text-muted">
                      <span className="h-2 w-2 rounded-full bg-ok" /> Efectivo ({pctEfec}%)
                    </dt>
                    <dd className="font-mono font-bold text-bone">{soles(kpis.porMetodo.Efectivo)}</dd>
                  </div>
                  <div className="flex items-center justify-between rounded bg-surface-2/50 px-3 py-2">
                    <dt className="flex items-center gap-1.5 text-muted">
                      <span className="h-2 w-2 rounded-full bg-purple-500" /> Yape ({pctYape}%)
                    </dt>
                    <dd className="font-mono font-bold text-bone">{soles(kpis.porMetodo.Yape)}</dd>
                  </div>
                  <div className="flex items-center justify-between rounded bg-surface-2/50 px-3 py-2">
                    <dt className="flex items-center gap-1.5 text-muted">
                      <span className="h-2 w-2 rounded-full bg-cyan-400" /> Plin ({pctPlin}%)
                    </dt>
                    <dd className="font-mono font-bold text-bone">{soles(kpis.porMetodo.Plin)}</dd>
                  </div>
                  <div className="flex items-center justify-between rounded bg-surface-2/50 px-3 py-2">
                    <dt className="flex items-center gap-1.5 text-muted">
                      <span className="h-2 w-2 rounded-full bg-amber-400" /> Tarjeta ({pctTarj}%)
                    </dt>
                    <dd className="font-mono font-bold text-bone">{soles(kpis.porMetodo.Tarjeta)}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </section>

          {/* 1.1 Gráfico de Evolución Diaria de Ingresos vs Egresos */}
          {kpis.serieDiaria.length > 0 && (
            <section className="panel-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line/70 pb-3">
                <div className="flex items-center gap-2">
                  <BarChart3 size={16} className="text-brand" strokeWidth={1.75} />
                  <h3 className="section-title text-base">
                    Evolución diaria de caja (Últimos días con actividad)
                  </h3>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-xs bg-brand" /> Ingresos
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-xs bg-bad/80" /> Egresos
                  </span>
                </div>
              </div>

              <div className="mt-5 flex h-44 items-end gap-2 overflow-x-auto pb-1 pt-4">
                {kpis.serieDiaria.map((d) => {
                  const pctIng =
                    d.ingresos === 0
                      ? 4
                      : Math.max(10, Math.round((d.ingresos / kpis.maxDiario) * 100));
                  const pctEgr =
                    d.egresos === 0
                      ? 0
                      : Math.max(8, Math.round((d.egresos / kpis.maxDiario) * 100));
                  const etiquetaDia = d.fecha.slice(5); // MM-DD
                  return (
                    <div
                      key={d.fecha}
                      className="group flex min-w-[44px] flex-1 flex-col items-center gap-1.5"
                      title={`${d.fecha} · Ingresos: ${soles(d.ingresos)} · Egresos: ${soles(d.egresos)}`}
                    >
                      <span className="font-mono text-[10px] font-semibold text-bone opacity-85 tabular-nums">
                        {d.ingresos > 0 ? Math.round(d.ingresos) : ''}
                      </span>
                      <div className="flex h-32 w-full items-end justify-center gap-1 rounded-t bg-surface-2/50 px-1 pt-1">
                        <div
                          className="w-full rounded-t bg-gradient-to-t from-brand/60 to-brand transition-all duration-500 group-hover:brightness-110"
                          style={{ height: `${pctIng}%` }}
                        />
                        {pctEgr > 0 && (
                          <div
                            className="w-2/3 rounded-t bg-bad/80 transition-all duration-500"
                            style={{ height: `${pctEgr}%` }}
                          />
                        )}
                      </div>
                      <span className="font-mono text-[10px] text-muted">{etiquetaDia}</span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* 1.2 Comparativa Mensual: Mes actual vs Mes anterior */}
          {comparativa && (
            <section aria-label="Comparativa mensual" className="panel-card p-5">
              <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted">
                    <TrendingUp size={15} className="text-brand" />
                    Rendimiento Comercial Mensual
                  </span>
                  <div className="mt-2 flex flex-wrap items-baseline gap-3">
                    <div>
                      <span className="block text-xs text-muted">
                        {comparativa.nombreMesActual} (al día de hoy):
                      </span>
                      <span className="font-mono text-2xl font-bold text-bone tabular-nums">
                        {soles(comparativa.mesActualTotal)}
                      </span>
                    </div>
                    <span className="self-center text-sm text-muted">vs.</span>
                    <div>
                      <span className="block text-xs text-muted">
                        {comparativa.nombreMesAnterior} (mes cerrado):
                      </span>
                      <span className="font-mono text-lg font-semibold text-muted tabular-nums">
                        {soles(comparativa.mesAnteriorTotal)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 rounded-md border border-line bg-surface-2 px-3.5 py-2">
                  {comparativa.porcentajeVariacion >= 0 ? (
                    <div className="flex items-center gap-1.5 font-mono text-sm font-bold text-ok">
                      <ArrowUpRight size={18} strokeWidth={2.5} />
                      <span>+{comparativa.porcentajeVariacion}%</span>
                      <span className="font-sans text-xs font-normal text-muted">crecimiento</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 font-mono text-sm font-bold text-bad">
                      <ArrowDownRight size={18} strokeWidth={2.5} />
                      <span>{comparativa.porcentajeVariacion}%</span>
                      <span className="font-sans text-xs font-normal text-muted">vs mes anterior</span>
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* 1.4 Desglose de ingresos por Plan y por Producto */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Desglose por Plan */}
            <section aria-label="Ingresos por Plan" className="panel-card space-y-3 p-5">
              <div className="flex items-center justify-between">
                <h3 className="section-title flex items-center gap-2 text-base">
                  <Dumbbell size={16} className="text-brand" />
                  Ingresos por Plan de Entrenamiento
                </h3>
                <span className="text-xs text-muted">Período seleccionado</span>
              </div>

              {desglosePlanes.length === 0 ? (
                <p className="py-4 text-xs text-muted">
                  No hay cobros de membresías en este rango de fechas.
                </p>
              ) : (
                (() => {
                  const maxTotal = Math.max(...desglosePlanes.map((p) => p.total), 1);
                  return (
                    <ul className="space-y-3 text-xs">
                      {desglosePlanes.map((plan) => {
                        const pct = Math.round((plan.total / maxTotal) * 100);
                        return (
                          <li key={plan.nombre} className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-bone">{plan.nombre}</span>
                              <span className="font-mono font-bold tabular-nums text-bone">
                                {soles(plan.total)}{' '}
                                <span className="font-sans text-[11px] font-normal text-muted">
                                  ({plan.cantidad} cobros)
                                </span>
                              </span>
                            </div>
                            <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
                              <div
                                className="bar-fill h-full rounded-full bg-brand"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  );
                })()
              )}
            </section>

            {/* Desglose por Producto POS */}
            <section aria-label="Ingresos por Producto" className="panel-card space-y-3 p-5">
              <div className="flex items-center justify-between">
                <h3 className="section-title flex items-center gap-2 text-base">
                  <ShoppingBag size={16} className="text-brand" />
                  Ingresos por Producto del POS
                </h3>
                <span className="text-xs text-muted">Período seleccionado</span>
              </div>

              {desgloseProds.length === 0 ? (
                <p className="py-4 text-xs text-muted">
                  No hay ventas registradas en mostrador en este rango.
                </p>
              ) : (
                (() => {
                  const maxTotal = Math.max(...desgloseProds.map((p) => p.total), 1);
                  return (
                    <ul className="space-y-3 text-xs">
                      {desgloseProds.map((prod) => {
                        const pct = Math.round((prod.total / maxTotal) * 100);
                        return (
                          <li key={prod.nombre} className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-bone">{prod.nombre}</span>
                              <span className="font-mono font-bold tabular-nums text-bone">
                                {soles(prod.total)}{' '}
                                <span className="font-sans text-[11px] font-normal text-muted">
                                  ({prod.unidades} un.)
                                </span>
                              </span>
                            </div>
                            <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
                              <div
                                className="bar-fill h-full rounded-full bg-ok"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  );
                })()
              )}
            </section>
          </div>
        </>
      )}

      {/* 1.5 Estadísticas operativas */}
      {gymId && (pestana === 'todo' || pestana === 'finanzas') && (
        <GymStatsSection gymId={gymId} />
      )}

      {/* 2. Gestión de precios y catálogo */}
      {gymId && (pestana === 'todo' || pestana === 'catalogo') && (
        <section aria-label="Gestión de precios y catálogo" className="space-y-3">
          <h2 className="section-title text-lg">Gestión de precios y catálogo</h2>
          <CatalogManager
            gymId={gymId}
            planes={planes}
            productos={productos}
            onUpdated={async (msg) => {
              setAviso({ tipo: 'ok', texto: msg });
              await recargarCatalogos();
            }}
            onError={(msg) => setAviso({ tipo: 'error', texto: msg })}
          />
        </section>
      )}

      {/* 3. Personal y permisos + Limpieza de datos de prueba */}
      {perfil && (pestana === 'todo' || pestana === 'personal') && (
        <StaffManager
          adminId={perfil.id}
          onSuccess={(texto) => setAviso({ tipo: 'ok', texto })}
          onError={(texto) => setAviso({ tipo: 'error', texto })}
          onResetComplete={async () => {
            await consultarPeriodo(desde, hasta);
            await recargarCatalogos();
          }}
        />
      )}
    </div>
  );
}
