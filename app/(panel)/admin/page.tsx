'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Download, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useAuth } from '@/components/AuthProvider';
import { CatalogManager } from '@/components/CatalogManager';
import { GymStatsSection } from '@/components/GymStatsSection';
import { LeadsPanel } from '@/components/LeadsPanel';
import { StaffManager } from '@/components/StaffManager';
import {
  listarProductos,
  movimientosParaExport,
  resumenPeriodo,
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

const METODOS: MetodoPago[] = ['Efectivo', 'Yape', 'Plin', 'Tarjeta'];

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

  const consultarPeriodo = useCallback(async (fDesde: string, fHasta: string) => {
    if (!fDesde || !fHasta || fDesde > fHasta) return;
    setCargando(true);
    try {
      const filas = await resumenPeriodo(fDesde, fHasta);
      setResumen(filas);
    } catch (e) {
      setAviso({
        tipo: 'error',
        texto: e instanceof Error ? e.message : 'Error al consultar finanzas',
      });
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    if (!gymId || perfil?.rol !== 'admin') return;
    let cancelado = false;
    Promise.all([
      resumenPeriodo(desde, hasta),
      listarPlanes(gymId, true),
      listarProductos(gymId, true),
    ])
      .then(([filas, pls, prods]) => {
        if (cancelado) return;
        setResumen(filas);
        setPlanes(pls);
        setProductos(prods);
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

    for (const r of resumen) {
      const monto = Number(r.total) || 0;
      if (r.tipo === 'INGRESO') {
        ingresos += monto;
        porMetodo[r.metodo] = (porMetodo[r.metodo] ?? 0) + monto;
      } else {
        egresos += monto;
      }
    }
    return {
      ingresos,
      egresos,
      neto: ingresos - egresos,
      porMetodo,
    };
  }, [resumen]);

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

  return (
    <div className="mx-auto max-w-6xl space-y-12">
      {/* Cabecera y Filtro de rango (auto-aplicado) + Exportar Excel secundario */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line/80 pb-5">
        <h1 className="font-display text-4xl sm:text-5xl">Administración</h1>

        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="admin-desde" className="label">
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
              className="field !min-h-10 font-mono text-xs"
            />
          </div>
          <div>
            <label htmlFor="admin-hasta" className="label">
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
              className="field !min-h-10 font-mono text-xs"
            />
          </div>
          <button
            type="button"
            disabled={exportando}
            onClick={exportarExcel}
            className="btn btn-secondary !min-h-10"
          >
            {exportando ? (
              <Loader2 size={15} strokeWidth={1.5} className="animate-spin" />
            ) : (
              <Download size={15} strokeWidth={1.5} />
            )}
            Exportar .xlsx
          </button>
        </div>
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

      {/* 1. Balance del período: Flujo neto como protagonista + barra compacta por método */}
      <section aria-label="Balance del período" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="section-title text-lg">Balance del período</h2>
          {cargando && <Loader2 size={15} strokeWidth={1.5} className="animate-spin text-muted" />}
        </div>

        <div className="bg-surface p-6">
          <div className="grid items-baseline gap-6 sm:grid-cols-3">
            {/* Protagonista: Flujo neto */}
            <div>
              <p className="text-xs font-medium text-muted">Flujo neto</p>
              <p className="mt-1 text-4xl font-bold text-brand tabular-nums">
                {soles(kpis.neto)}
              </p>
            </div>

            {/* Secundarios: Ingresos y Egresos */}
            <div>
              <p className="text-xs text-muted">Ingresos totales</p>
              <p className="mt-1 text-2xl font-semibold text-ok tabular-nums">
                {soles(kpis.ingresos)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted">Egresos y gastos</p>
              <p className="mt-1 text-2xl font-semibold text-bad tabular-nums">
                {soles(kpis.egresos)}
              </p>
            </div>
          </div>

          {/* Barra fina compacta con el desglose por método de pago */}
          <dl className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-line/70 pt-4 text-xs tabular-nums">
            {METODOS.map((m) => (
              <div key={m} className="flex items-baseline gap-2">
                <dt className="text-muted">{m}:</dt>
                <dd className="text-sm font-semibold text-bone">{soles(kpis.porMetodo[m])}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* 1.5 Estadísticas operativas + Interesados desde la web */}
      {gymId && <GymStatsSection gymId={gymId} />}
      <LeadsPanel />

      {/* 2. Gestión de precios y catálogo */}
      {gymId && (
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
      {perfil && (
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
