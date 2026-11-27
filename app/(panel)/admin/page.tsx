'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Download,
  Dumbbell,
  Layers,
  Loader2,
  Package,
  PieChart,
  Shield,
  ShoppingBag,
  Wallet,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useAuth } from '@/components/AuthProvider';
import { DonutChart, PALETA_GRAFICOS, VerticalBarChart } from '@/components/AdminCharts';
import { AdminDailyCalendar } from '@/components/AdminDailyCalendar';
import { CatalogManager } from '@/components/CatalogManager';
import { GymStatsSection } from '@/components/GymStatsSection';
import { StaffManager } from '@/components/StaffManager';
import { ToastBanner } from '@/components/ToastBanner';
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
import { formatearFechaDMY, hoyLima, soles, sumarDias } from '@/lib/formato';
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
  const [diaSeleccionado, setDiaSeleccionado] = useState<string | null>(null);
  const [recargaCalendario, setRecargaCalendario] = useState(0);
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
        Fecha: f.Fecha ? formatearFechaDMY(f.Fecha) : f.Fecha,
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

  const metodosDonut = [
    { label: 'Efectivo', value: kpis.porMetodo.Efectivo, color: '#22c55e' },
    { label: 'Yape', value: kpis.porMetodo.Yape, color: '#a855f7' },
    { label: 'Plin', value: kpis.porMetodo.Plin, color: '#38bdf8' },
    { label: 'Tarjeta', value: kpis.porMetodo.Tarjeta, color: '#ffc21a' },
  ];

  const planesDonut = desglosePlanes.slice(0, 7).map((p, idx) => ({
    label: p.nombre,
    value: p.total,
    color: PALETA_GRAFICOS[idx % PALETA_GRAFICOS.length],
    sublabel: `${p.cantidad} ${p.cantidad === 1 ? 'cobro' : 'cobros'}`,
  }));
  if (desglosePlanes.length > 7) {
    const resto = desglosePlanes.slice(7);
    planesDonut.push({
      label: 'Otros planes',
      value: resto.reduce((s, p) => s + p.total, 0),
      color: '#71717a',
      sublabel: `${resto.reduce((s, p) => s + p.cantidad, 0)} cobros`,
    });
  }

  const totalMostrador = desgloseProds.reduce((s, p) => s + p.total, 0);
  const unidadesMostrador = desgloseProds.reduce((s, p) => s + p.unidades, 0);

  return (
    <div className="panel-fade-in space-y-6">
      {/* Cabecera y Filtro de rango + Atajos rápidos */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line/70 pb-5">
        <div className="shrink-0">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">
            Resumen financiero, catálogo y equipo
          </p>
          <h1 className="mt-0.5 font-display text-4xl tracking-wide sm:text-5xl">
            ADMINISTRACIÓN
          </h1>
        </div>

        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:gap-1.5 xl:flex-nowrap">
          {/* Atajos de fecha */}
          <div className="flex w-full flex-wrap items-center justify-between gap-0.5 rounded-md border border-line bg-surface p-1 sm:h-9 sm:w-auto sm:flex-nowrap sm:justify-start">
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
                className="flex-1 rounded px-2 py-1 text-center text-xs font-medium text-muted transition-colors hover:bg-surface-2 hover:text-bone sm:flex-initial"
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="flex w-full flex-wrap items-center justify-between gap-2 rounded-md border border-line bg-surface px-2.5 py-2 sm:h-9 sm:w-auto sm:flex-nowrap sm:justify-start sm:gap-1.5 sm:py-0">
            <div className="flex items-center gap-1.5">
              <label
                htmlFor="admin-desde"
                className="select-none text-[11px] font-medium text-muted"
              >
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
                className="border-0 bg-transparent p-0 font-mono text-xs text-bone outline-none [color-scheme:dark]"
              />
            </div>
            <span className="hidden h-4 w-px bg-line/80 sm:block" aria-hidden="true" />
            <div className="flex items-center gap-1.5">
              <label
                htmlFor="admin-hasta"
                className="select-none text-[11px] font-medium text-muted"
              >
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
                className="border-0 bg-transparent p-0 font-mono text-xs text-bone outline-none [color-scheme:dark]"
              />
            </div>
          </div>

          <button
            type="button"
            disabled={exportando}
            onClick={exportarExcel}
            className="btn btn-secondary h-9 w-full !min-h-9 whitespace-nowrap !px-3 text-xs sm:w-auto"
          >
            {exportando ? (
              <Loader2 size={15} strokeWidth={1.75} className="animate-spin" />
            ) : (
              <Download size={15} strokeWidth={1.75} />
            )}
            Exportar Excel
          </button>
        </div>
      </div>

      {/* Sub-navegación rápida de secciones de Administración */}
      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Secciones de administración">
        {(
          [
            { id: 'todo', label: 'Resumen', icon: <Layers size={14} /> },
            { id: 'finanzas', label: 'Finanzas', icon: <Wallet size={14} /> },
            { id: 'catalogo', label: 'Catálogo', icon: <Package size={14} /> },
            { id: 'personal', label: 'Equipo', icon: <Shield size={14} /> },
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

      <ToastBanner aviso={aviso} onClose={() => setAviso(null)} />

      {(pestana === 'todo' || pestana === 'finanzas') && (
        <>
          {/* 1. Balance del período: Flujo neto + comparativa mensual compacta */}
          <section aria-label="Balance del período" className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="section-title text-lg">
                Balance del período ({formatearFechaDMY(desde)} → {formatearFechaDMY(hasta)})
              </h2>
              <div className="flex items-center gap-2.5">
                {comparativa && (
                  <div
                    title={`${comparativa.nombreMesActual}: ${soles(comparativa.mesActualTotal)} vs ${comparativa.nombreMesAnterior}: ${soles(comparativa.mesAnteriorTotal)}`}
                    className="flex items-center gap-1.5 rounded-md border border-line bg-surface px-3 py-1 text-xs"
                  >
                    <span className="text-muted">vs {comparativa.nombreMesAnterior}:</span>
                    {comparativa.porcentajeVariacion >= 0 ? (
                      <span className="inline-flex items-center gap-0.5 font-mono font-bold text-ok">
                        <ArrowUpRight size={14} strokeWidth={2.5} />+{comparativa.porcentajeVariacion}%
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-0.5 font-mono font-bold text-bad">
                        <ArrowDownRight size={14} strokeWidth={2.5} />
                        {comparativa.porcentajeVariacion}%
                      </span>
                    )}
                  </div>
                )}
                {cargando && <Loader2 size={15} strokeWidth={1.75} className="animate-spin text-brand" />}
              </div>
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
            </div>
          </section>

          {/* 1.1 Calendario mensual interactivo con resumen por día */}
          {gymId && (
            <AdminDailyCalendar
              gymId={gymId}
              fechaExterna={diaSeleccionado}
              onSeleccionarDia={setDiaSeleccionado}
              refreshKey={recargaCalendario}
            />
          )}

          {/* 1.2 Evolución diaria (barras) + Métodos de pago (pastel) */}
          <div className="grid gap-6 lg:grid-cols-2">
            <section aria-label="Evolución diaria" className="panel-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line/70 pb-3">
                <div className="flex items-center gap-2">
                  <BarChart3 size={16} className="text-brand" strokeWidth={1.75} />
                  <h3 className="section-title text-base">Evolución diaria</h3>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-xs bg-brand" /> Ingresos
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-xs bg-bad/80" /> Egresos
                  </span>
                </div>
              </div>

              {kpis.serieDiaria.length === 0 ? (
                <p className="py-10 text-center text-xs text-muted">
                  No hay movimientos diarios en este rango.
                </p>
              ) : (
                <div className="mt-3">
                  <VerticalBarChart
                    items={kpis.serieDiaria.map((d) => ({
                      key: d.fecha,
                      label: `${d.fecha.slice(8, 10)}/${d.fecha.slice(5, 7)}`,
                      value: d.ingresos,
                      secondaryValue: d.egresos,
                      tooltip: `${formatearFechaDMY(d.fecha)} · Ingresos: ${soles(d.ingresos)} · Egresos: ${soles(d.egresos)}`,
                      highlight: d.fecha === diaSeleccionado,
                    }))}
                    formatShort={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${Math.round(v)}`)}
                    onBarClick={(fecha) => setDiaSeleccionado(fecha)}
                  />
                </div>
              )}
            </section>

            <section aria-label="Métodos de pago" className="panel-card space-y-4 p-5">
              <div className="flex items-center justify-between border-b border-line/70 pb-3">
                <h3 className="section-title flex items-center gap-2 text-base">
                  <PieChart size={16} className="text-brand" />
                  Métodos de pago
                </h3>
                <span className="text-xs text-muted">Período seleccionado</span>
              </div>
              <DonutChart
                items={metodosDonut}
                centerLabel="Ingresos"
                centerValue={soles(kpis.ingresos)}
                formatValue={soles}
                emptyText="No hay cobros registrados en este rango."
              />
            </section>
          </div>

          {/* 1.4 Desglose de ingresos por Plan (pastel) y por Producto de mostrador */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Desglose por Plan en gráfico de pastel */}
            <section aria-label="Ingresos por Plan" className="panel-card space-y-4 p-5">
              <div className="flex items-center justify-between border-b border-line/70 pb-3">
                <h3 className="section-title flex items-center gap-2 text-base">
                  <Dumbbell size={16} className="text-brand" />
                  Ingresos por plan
                </h3>
                <span className="text-xs text-muted">Participación en período</span>
              </div>

              <DonutChart
                items={planesDonut}
                centerLabel="Membresías"
                centerValue={soles(desglosePlanes.reduce((s, p) => s + p.total, 0))}
                formatValue={soles}
                emptyText="No hay cobros de membresías en este rango de fechas."
              />
            </section>

            {/* Desglose por Producto de mostrador */}
            <section aria-label="Ventas en mostrador" className="panel-card space-y-4 p-5">
              <div className="flex items-center justify-between border-b border-line/70 pb-3">
                <h3 className="section-title flex items-center gap-2 text-base">
                  <ShoppingBag size={16} className="text-brand" />
                  Ventas en mostrador
                </h3>
                <span className="font-mono text-xs font-semibold text-ok tabular-nums">
                  {soles(totalMostrador)} · {unidadesMostrador} un.
                </span>
              </div>

              {desgloseProds.length === 0 ? (
                <p className="py-6 text-center text-xs text-muted">
                  No hay ventas registradas en mostrador en este rango.
                </p>
              ) : (
                (() => {
                  const maxTotal = Math.max(...desgloseProds.map((p) => p.total), 1);
                  return (
                    <ul className="space-y-3 text-xs">
                      {desgloseProds.map((prod, idx) => {
                        const pct = Math.round((prod.total / maxTotal) * 100);
                        return (
                          <li key={prod.nombre} className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-bone">
                                <span className="mr-1.5 font-mono text-[10px] text-brand">
                                  #{idx + 1}
                                </span>
                                {prod.nombre}
                              </span>
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
        <section aria-label="Planes y productos" className="space-y-3">
          <h2 className="section-title text-lg">Planes y productos</h2>
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
            setRecargaCalendario((n) => n + 1);
            await consultarPeriodo(desde, hasta);
            await recargarCatalogos();
          }}
        />
      )}
    </div>
  );
}
