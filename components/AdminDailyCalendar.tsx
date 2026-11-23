'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  Dumbbell,
  Loader2,
  ShoppingBag,
  X,
} from 'lucide-react';
import { Portal } from '@/components/Portal';
import {
  obtenerDetalleDia,
  obtenerResumenMesCalendario,
  type DetalleDiaAdmin,
  type ResumenDiaCalendario,
} from '@/services/cajaService';
import { formatearFechaDMY, hoyLima, soles, sumarDias } from '@/lib/formato';
import type { MetodoPago } from '@/types';

interface Props {
  gymId: string;
  fechaExterna?: string | null;
  onSeleccionarDia?: (fecha: string | null) => void;
  refreshKey?: number;
}

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Setiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

const METODOS_ORDEN: { id: MetodoPago; color: string }[] = [
  { id: 'Efectivo', color: 'bg-ok' },
  { id: 'Yape', color: 'bg-purple-500' },
  { id: 'Plin', color: 'bg-cyan-400' },
  { id: 'Tarjeta', color: 'bg-amber-400' },
];

function solesCompacto(n: number): string {
  const redondeado = Math.round(n * 100) / 100;
  const tieneDecimales = Math.abs(redondeado % 1) > 0.001;
  return `S/ ${redondeado.toLocaleString('es-PE', {
    minimumFractionDigits: tieneDecimales ? 2 : 0,
    maximumFractionDigits: tieneDecimales ? 2 : 0,
  })}`;
}

function formatearFechaLarga(fechaISO: string): string {
  const [y, m, d] = fechaISO.split('-').map(Number);
  if (!y || !m || !d) return fechaISO;
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const texto = dt.toLocaleDateString('es-PE', {
    timeZone: 'UTC',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export function AdminDailyCalendar({
  gymId,
  fechaExterna,
  onSeleccionarDia,
  refreshKey = 0,
}: Props) {
  const hoy = hoyLima();
  const [hoyAnio, hoyMes] = hoy.split('-').map(Number);

  const [vistaMes, setVistaMes] = useState<{ anio: number; mes: number }>(() => ({
    anio: hoyAnio,
    mes: hoyMes,
  }));
  const [diaLocal, setDiaLocal] = useState<string | null>(null);
  const [exportandoDia, setExportandoDia] = useState(false);

  const diaAbierto = fechaExterna !== undefined ? fechaExterna : diaLocal;

  const abrirDia = (fecha: string | null) => {
    if (onSeleccionarDia) onSeleccionarDia(fecha);
    else setDiaLocal(fecha);
    if (fecha) {
      const [y, m] = fecha.split('-').map(Number);
      if (y && m) setVistaMes({ anio: y, mes: m });
    }
  };

  const claveMes = `${gymId}:${vistaMes.anio}-${vistaMes.mes}:${refreshKey}`;
  const [mesState, setMesState] = useState<{
    clave: string;
    mapa: Record<string, ResumenDiaCalendario>;
    error: string | null;
  } | null>(null);
  const cargandoMes = mesState?.clave !== claveMes;

  useEffect(() => {
    let cancelado = false;
    obtenerResumenMesCalendario(gymId, vistaMes.anio, vistaMes.mes)
      .then((mapa) => {
        if (!cancelado) setMesState({ clave: claveMes, mapa, error: null });
      })
      .catch((e: unknown) => {
        if (!cancelado) {
          setMesState({
            clave: claveMes,
            mapa: {},
            error: e instanceof Error ? e.message : 'No se pudo cargar el calendario',
          });
        }
      });
    return () => {
      cancelado = true;
    };
  }, [gymId, vistaMes.anio, vistaMes.mes, claveMes]);

  const [diaState, setDiaState] = useState<{
    fecha: string;
    refreshKey: number;
    detalle: DetalleDiaAdmin | null;
    error: string | null;
  } | null>(null);
  const cargandoDia = Boolean(
    diaAbierto && (diaState?.fecha !== diaAbierto || diaState?.refreshKey !== refreshKey)
  );

  useEffect(() => {
    if (!diaAbierto) return;
    let cancelado = false;
    obtenerDetalleDia(gymId, diaAbierto)
      .then((detalle) => {
        if (!cancelado) {
          setDiaState({ fecha: diaAbierto, refreshKey, detalle, error: null });
        }
      })
      .catch((e: unknown) => {
        if (!cancelado) {
          setDiaState({
            fecha: diaAbierto,
            refreshKey,
            detalle: null,
            error: e instanceof Error ? e.message : 'No se pudo cargar el resumen del día',
          });
        }
      });
    return () => {
      cancelado = true;
    };
  }, [gymId, diaAbierto, refreshKey]);

  useEffect(() => {
    if (!diaAbierto) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (onSeleccionarDia) onSeleccionarDia(null);
        else setDiaLocal(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [diaAbierto, onSeleccionarDia]);

  const mapaMes = useMemo(
    () => (mesState?.clave === claveMes ? mesState.mapa : {}),
    [mesState, claveMes]
  );

  const grillaMes = useMemo(() => {
    const pad = (n: number) => String(n).padStart(2, '0');
    const diaUno = new Date(Date.UTC(vistaMes.anio, vistaMes.mes - 1, 1)).getUTCDay();
    const offsetInicio = diaUno === 0 ? 6 : diaUno - 1;
    const totalDias = new Date(Date.UTC(vistaMes.anio, vistaMes.mes, 0)).getUTCDate();

    const celdas: Array<{
      fecha: string;
      diaNum: number;
      esDomingo: boolean;
      esHoy: boolean;
      esFuturo: boolean;
      resumen?: ResumenDiaCalendario;
    } | null> = [];

    for (let i = 0; i < offsetInicio; i += 1) celdas.push(null);

    let totalIngresosMes = 0;
    let diasConCobros = 0;
    let totalAsistenciasMes = 0;

    for (let d = 1; d <= totalDias; d += 1) {
      const fecha = `${vistaMes.anio}-${pad(vistaMes.mes)}-${pad(d)}`;
      const resumen = mapaMes[fecha];
      const diaSem = new Date(Date.UTC(vistaMes.anio, vistaMes.mes - 1, d)).getUTCDay();
      if (resumen) {
        totalIngresosMes += resumen.ingresos;
        if (resumen.ingresos > 0) diasConCobros += 1;
        totalAsistenciasMes += resumen.asistencias;
      }
      celdas.push({
        fecha,
        diaNum: d,
        esDomingo: diaSem === 0,
        esHoy: fecha === hoy,
        esFuturo: fecha > hoy,
        resumen,
      });
    }

    return {
      celdas,
      totalIngresosMes: Math.round(totalIngresosMes * 100) / 100,
      diasConCobros,
      totalAsistenciasMes,
    };
  }, [vistaMes.anio, vistaMes.mes, mapaMes, hoy]);

  function cambiarMes(delta: number) {
    setVistaMes((prev) => {
      let nuevoMes = prev.mes + delta;
      let nuevoAnio = prev.anio;
      if (nuevoMes < 1) {
        nuevoMes = 12;
        nuevoAnio -= 1;
      } else if (nuevoMes > 12) {
        nuevoMes = 1;
        nuevoAnio += 1;
      }
      if (nuevoAnio > hoyAnio || (nuevoAnio === hoyAnio && nuevoMes > hoyMes)) {
        return prev;
      }
      return { anio: nuevoAnio, mes: nuevoMes };
    });
  }

  const esMesActual = vistaMes.anio === hoyAnio && vistaMes.mes === hoyMes;
  const detalleActual =
    diaAbierto && diaState?.fecha === diaAbierto && diaState.refreshKey === refreshKey
      ? diaState.detalle
      : null;
  const errorDia =
    diaAbierto && diaState?.fecha === diaAbierto && diaState.refreshKey === refreshKey
      ? diaState.error
      : null;

  async function exportarExcelDia() {
    if (!detalleActual || detalleActual.movimientos.length === 0) return;
    setExportandoDia(true);
    try {
      const XLSX = await import('xlsx');
      const activos = detalleActual.movimientos.filter((m) => m.estado === 'ACTIVO');
      if (activos.length === 0) return;
      const filas = activos.map((m) => ({
        Fecha: formatearFechaDMY(m.Fecha),
        Hora: m.Hora,
        Turno: m.Turno,
        Tipo: m.Tipo,
        Concepto: m.Concepto,
        Monto: Number(m.Monto),
        Método: m['Método'],
        'Socio/Cliente': m['Socio/Cliente'],
        Responsable: m.Responsable,
      }));
      const hoja = XLSX.utils.json_to_sheet(filas);
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
      XLSX.utils.book_append_sheet(libro, hoja, 'Resumen del día');
      XLSX.writeFile(libro, `Zentra_Fitness_Dia_${detalleActual.fecha}.xlsx`);
    } finally {
      setExportandoDia(false);
    }
  }

  return (
    <>
      <section aria-label="Calendario de actividad diaria" className="panel-card space-y-4 p-5">
        {/* Cabecera del calendario */}
        <div className="flex flex-col justify-between gap-3 border-b border-line/70 pb-4 sm:flex-row sm:items-center">
          <div>
            <h3 className="section-title flex items-center gap-2 text-base">
              <CalendarDays size={16} className="text-brand" strokeWidth={1.75} />
              Actividad por día
            </h3>
            <p className="mt-0.5 text-xs text-muted">
              Presiona cualquier día para revisar el detalle de ventas, cobros y asistencias.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center rounded-md border border-line bg-surface p-0.5">
              <button
                type="button"
                onClick={() => cambiarMes(-1)}
                className="flex h-8 w-8 items-center justify-center rounded text-muted transition-colors hover:bg-surface-2 hover:text-bone"
                aria-label="Mes anterior"
                title="Mes anterior"
              >
                <ChevronLeft size={15} strokeWidth={1.75} />
              </button>
              <span className="min-w-[132px] px-2 text-center text-xs font-semibold text-bone">
                {MESES[vistaMes.mes - 1]} {vistaMes.anio}
              </span>
              <button
                type="button"
                disabled={esMesActual}
                onClick={() => cambiarMes(1)}
                className="flex h-8 w-8 items-center justify-center rounded text-muted transition-colors hover:bg-surface-2 hover:text-bone disabled:cursor-not-allowed disabled:opacity-35"
                aria-label="Mes siguiente"
                title="Mes siguiente"
              >
                <ChevronRight size={15} strokeWidth={1.75} />
              </button>
            </div>

            <button
              type="button"
              onClick={() => abrirDia(hoy)}
              className="btn btn-secondary !min-h-9 !px-3 text-xs"
            >
              Ver hoy
            </button>
          </div>
        </div>

        {/* Resumen rápido del mes */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-line/60 bg-ink/40 px-4 py-2.5 text-xs">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 tabular-nums">
            <span className="text-muted">
              Recaudado en {MESES[vistaMes.mes - 1].toLowerCase()}:{' '}
              <strong className="font-mono font-semibold text-bone">
                {soles(grillaMes.totalIngresosMes)}
              </strong>
            </span>
            <span className="text-muted">
              Días con cobros:{' '}
              <strong className="font-mono font-semibold text-bone">
                {grillaMes.diasConCobros}
              </strong>
            </span>
            <span className="text-muted">
              Asistencias:{' '}
              <strong className="font-mono font-semibold text-bone">
                {grillaMes.totalAsistenciasMes}
              </strong>
            </span>
          </div>
          {cargandoMes && <Loader2 size={14} className="animate-spin text-brand" />}
        </div>

        {mesState?.clave === claveMes && mesState.error && (
          <p className="rounded-md border-l-2 border-bad bg-bad/10 px-3 py-2 text-xs text-bad">
            {mesState.error}
          </p>
        )}

        {/* Grilla mensual */}
        <div className="overflow-x-auto pb-1">
          <div className="min-w-[560px]">
            <div className="mb-1.5 grid grid-cols-7 gap-1.5 text-center text-[11px] font-semibold uppercase tracking-wider text-muted">
              {DIAS_SEMANA.map((d) => (
                <div key={d} className="py-1">
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1.5">
              {grillaMes.celdas.map((c, idx) => {
                if (!c) {
                  return <div key={`vacio-${idx}`} className="min-h-[68px] sm:min-h-[76px]" />;
                }

                const tieneIngresos = (c.resumen?.ingresos ?? 0) > 0;
                const soloEgresos = !tieneIngresos && (c.resumen?.egresos ?? 0) > 0;
                const seleccionado = diaAbierto === c.fecha;

                return (
                  <button
                    key={c.fecha}
                    type="button"
                    disabled={c.esFuturo}
                    onClick={() => abrirDia(c.fecha)}
                    className={`group flex min-h-[68px] flex-col justify-between rounded-md border p-2 text-left transition-colors sm:min-h-[76px] sm:p-2.5 ${
                      c.esFuturo
                        ? 'cursor-default border-line/30 bg-ink/20 opacity-35'
                        : seleccionado
                        ? 'border-brand bg-brand/10 ring-1 ring-brand/30'
                        : c.esHoy
                        ? 'border-brand/60 bg-brand/5 hover:border-brand hover:bg-brand/10'
                        : tieneIngresos
                        ? 'border-line bg-surface-2/60 hover:border-brand/60 hover:bg-surface-2'
                        : `border-line/50 bg-ink/35 hover:border-line hover:bg-surface-2/40 ${
                            c.esDomingo ? 'opacity-75' : ''
                          }`
                    }`}
                  >
                    <div className="flex w-full items-center justify-between gap-1">
                      <span
                        className={`font-mono text-xs font-semibold tabular-nums ${
                          c.esHoy ? 'text-brand' : 'text-muted group-hover:text-bone'
                        }`}
                      >
                        {c.diaNum}
                      </span>
                      {c.esHoy && (
                        <span className="rounded bg-brand/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-brand">
                          Hoy
                        </span>
                      )}
                    </div>

                    {!c.esFuturo && (
                      <div className="mt-1 min-w-0">
                        {tieneIngresos && c.resumen ? (
                          <>
                            <p className="truncate font-mono text-xs font-semibold text-bone tabular-nums sm:text-sm">
                              {solesCompacto(c.resumen.ingresos)}
                            </p>
                            <p className="mt-0.5 truncate text-[10px] text-muted tabular-nums">
                              {c.resumen.operaciones}{' '}
                              {c.resumen.operaciones === 1 ? 'cobro' : 'cobros'}
                              {c.resumen.asistencias > 0 ? ` · ${c.resumen.asistencias} asist.` : ''}
                            </p>
                          </>
                        ) : soloEgresos && c.resumen ? (
                          <>
                            <p className="truncate font-mono text-xs font-semibold text-bad tabular-nums">
                              − {solesCompacto(c.resumen.egresos)}
                            </p>
                            <p className="mt-0.5 truncate text-[10px] text-muted">Solo egresos</p>
                          </>
                        ) : (
                          <p className="truncate text-[10px] text-muted/75 tabular-nums">
                            {c.resumen && c.resumen.asistencias > 0
                              ? `${c.resumen.asistencias} asist.`
                              : '—'}
                          </p>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Modal con detalle completo del día seleccionado */}
      {diaAbierto && (
        <Portal>
          <div
            onClick={() => abrirDia(null)}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-xs sm:items-center sm:p-6"
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="detalle-dia-titulo"
              onClick={(e) => e.stopPropagation()}
              className="modal-animate flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-line bg-surface shadow-2xl"
            >
              {/* Cabecera del modal */}
              <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line/80 p-5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-muted">
                      Resumen del día
                    </span>
                    {diaAbierto === hoy && (
                      <span className="rounded bg-brand/15 px-1.5 py-0.5 text-[10px] font-semibold text-brand">
                        Hoy
                      </span>
                    )}
                  </div>
                  <h2 id="detalle-dia-titulo" className="section-title mt-0.5 text-lg sm:text-xl">
                    {formatearFechaLarga(diaAbierto)}
                  </h2>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => abrirDia(sumarDias(diaAbierto, -1))}
                    className="btn btn-ghost !min-h-8 !px-2.5 text-xs"
                    aria-label="Día anterior"
                    title="Día anterior"
                  >
                    <ChevronLeft size={15} strokeWidth={1.75} />
                  </button>
                  <button
                    type="button"
                    disabled={diaAbierto >= hoy}
                    onClick={() => abrirDia(sumarDias(diaAbierto, 1))}
                    className="btn btn-ghost !min-h-8 !px-2.5 text-xs"
                    aria-label="Día siguiente"
                    title="Día siguiente"
                  >
                    <ChevronRight size={15} strokeWidth={1.75} />
                  </button>
                  <button
                    type="button"
                    disabled={
                      cargandoDia ||
                      exportandoDia ||
                      !detalleActual ||
                      detalleActual.operacionesActivas === 0
                    }
                    onClick={() => void exportarExcelDia()}
                    className="btn btn-secondary !min-h-8 !px-3 text-xs"
                  >
                    {exportandoDia ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Download size={14} strokeWidth={1.75} />
                    )}
                    Exportar día
                  </button>
                  <button
                    type="button"
                    onClick={() => abrirDia(null)}
                    className="btn btn-ghost !min-h-8 !px-2 text-muted hover:text-bone"
                    aria-label="Cerrar resumen del día"
                  >
                    <X size={16} strokeWidth={1.75} />
                  </button>
                </div>
              </header>

              {/* Contenido desplazable */}
              <div className="flex-1 space-y-5 overflow-y-auto p-5">
                {cargandoDia ? (
                  <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted">
                    <Loader2 size={18} className="animate-spin text-brand" />
                    Cargando movimientos del día...
                  </div>
                ) : errorDia ? (
                  <p role="alert" className="rounded-md border-l-2 border-bad bg-bad/10 px-4 py-3 text-sm text-bad">
                    {errorDia}
                  </p>
                ) : detalleActual ? (
                  <>
                    {/* KPIs principales del día */}
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <div className="rounded-md border border-line/70 bg-ink/40 p-3.5">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                          Ingresos
                        </p>
                        <p className="mt-1 font-mono text-xl font-bold text-ok tabular-nums">
                          {soles(detalleActual.ingresos)}
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted tabular-nums">
                          {detalleActual.operacionesActivas}{' '}
                          {detalleActual.operacionesActivas === 1 ? 'operación' : 'operaciones'}
                        </p>
                      </div>

                      <div className="rounded-md border border-line/70 bg-ink/40 p-3.5">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                          Egresos
                        </p>
                        <p
                          className={`mt-1 font-mono text-xl font-bold tabular-nums ${
                            detalleActual.egresos > 0 ? 'text-bad' : 'text-bone'
                          }`}
                        >
                          {soles(detalleActual.egresos)}
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted">Gastos y retiros</p>
                      </div>

                      <div className="rounded-md border border-brand/25 bg-surface-2/60 p-3.5">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                          Flujo neto
                        </p>
                        <p className="mt-1 font-mono text-xl font-bold text-brand tabular-nums">
                          {soles(detalleActual.neto)}
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted">Ingresos menos egresos</p>
                      </div>

                      <div className="rounded-md border border-line/70 bg-ink/40 p-3.5">
                        <p className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-muted">
                          <Activity size={12} className="text-brand" /> Actividad
                        </p>
                        <p className="mt-1 font-mono text-xl font-bold text-bone tabular-nums">
                          {detalleActual.asistencias} asist.
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted tabular-nums">
                          {detalleActual.nuevosSocios === 0
                            ? 'Sin socios nuevos'
                            : `+${detalleActual.nuevosSocios} ${
                                detalleActual.nuevosSocios === 1 ? 'socio nuevo' : 'socios nuevos'
                              }`}
                        </p>
                      </div>
                    </div>

                    {/* Medios de pago */}
                    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                      {METODOS_ORDEN.map((m) => {
                        const monto = detalleActual.porMetodo[m.id] ?? 0;
                        const pct =
                          detalleActual.ingresos > 0
                            ? Math.round((monto / detalleActual.ingresos) * 100)
                            : 0;
                        return (
                          <div
                            key={m.id}
                            className="flex items-center justify-between rounded-md border border-line/60 bg-surface-2/40 px-3 py-2 text-xs tabular-nums"
                          >
                            <span className="flex items-center gap-1.5 text-muted">
                              <span className={`h-2 w-2 rounded-full ${m.color}`} />
                              {m.id}
                              {pct > 0 && <span className="text-[10px]">({pct}%)</span>}
                            </span>
                            <span className="font-mono font-semibold text-bone">{soles(monto)}</span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Qué se vendió ese día */}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <section className="rounded-md border border-line/70 bg-ink/40 p-4">
                        <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted">
                          <Dumbbell size={14} className="text-brand" />
                          Membresías cobradas
                        </h3>
                        {detalleActual.membresias.length === 0 ? (
                          <p className="mt-3 text-xs text-muted">Sin cobros de membresías.</p>
                        ) : (
                          <ul className="mt-3 space-y-2 text-xs">
                            {detalleActual.membresias.map((pl) => (
                              <li key={pl.nombre} className="flex items-center justify-between gap-2">
                                <span className="truncate font-medium text-bone">
                                  {pl.nombre}{' '}
                                  <span className="text-muted">({pl.cantidad})</span>
                                </span>
                                <span className="shrink-0 font-mono font-semibold text-bone tabular-nums">
                                  {soles(pl.total)}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </section>

                      <section className="rounded-md border border-line/70 bg-ink/40 p-4">
                        <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted">
                          <ShoppingBag size={14} className="text-brand" />
                          Productos vendidos
                        </h3>
                        {detalleActual.productos.length === 0 ? (
                          <p className="mt-3 text-xs text-muted">Sin ventas en mostrador.</p>
                        ) : (
                          <ul className="mt-3 space-y-2 text-xs">
                            {detalleActual.productos.map((pr) => (
                              <li key={pr.nombre} className="flex items-center justify-between gap-2">
                                <span className="truncate font-medium text-bone">
                                  {pr.nombre}{' '}
                                  <span className="text-muted">({pr.unidades} un.)</span>
                                </span>
                                <span className="shrink-0 font-mono font-semibold text-bone tabular-nums">
                                  {soles(pr.total)}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </section>
                    </div>

                    {/* Detalle de operaciones */}
                    <section className="space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
                          Movimientos registrados ({detalleActual.movimientos.length})
                        </h3>
                        {detalleActual.anulaciones > 0 && (
                          <span className="text-[11px] text-muted">
                            Incluye {detalleActual.anulaciones}{' '}
                            {detalleActual.anulaciones === 1 ? 'anulación' : 'anulaciones'}
                          </span>
                        )}
                      </div>

                      {detalleActual.movimientos.length === 0 ? (
                        <p className="rounded-md border border-line/60 bg-ink/35 px-4 py-8 text-center text-xs text-muted">
                          No se registraron movimientos de caja en esta fecha.
                        </p>
                      ) : (
                        <div className="overflow-x-auto rounded-lg border border-line bg-ink/40">
                          <table className="w-full border-collapse text-left text-xs">
                            <thead className="border-b border-line bg-surface-2/80 text-[11px] font-semibold uppercase tracking-wider text-muted">
                              <tr>
                                <th className="px-3 py-2.5">Hora</th>
                                <th className="px-3 py-2.5">Concepto</th>
                                <th className="px-3 py-2.5">Socio / Cliente</th>
                                <th className="px-3 py-2.5">Método</th>
                                <th className="hidden px-3 py-2.5 sm:table-cell">Responsable</th>
                                <th className="px-3 py-2.5 text-right">Monto</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-line/70">
                              {detalleActual.movimientos.map((m) => {
                                const anulado = m.estado === 'ANULADO';
                                const esEgreso = m.Tipo.toLowerCase() === 'egreso';
                                return (
                                  <tr
                                    key={m.movimiento_id}
                                    className={
                                      anulado
                                        ? 'bg-surface/30 text-muted line-through'
                                        : 'hover:bg-surface-2/40'
                                    }
                                  >
                                    <td className="whitespace-nowrap px-3 py-2.5 font-mono text-muted">
                                      {m.Hora}
                                    </td>
                                    <td className="px-3 py-2.5 font-medium text-bone">
                                      <span>{m.Concepto}</span>
                                      {anulado && (
                                        <span className="ml-1.5 inline-block rounded bg-bad/15 px-1.5 py-0.5 text-[10px] font-semibold text-bad no-underline">
                                          Anulado
                                        </span>
                                      )}
                                    </td>
                                    <td className="px-3 py-2.5 text-muted">
                                      {m['Socio/Cliente']}
                                    </td>
                                    <td className="px-3 py-2.5">
                                      <span className="rounded bg-surface-2 px-2 py-0.5 font-mono text-[11px] text-bone">
                                        {m['Método']}
                                      </span>
                                    </td>
                                    <td className="hidden px-3 py-2.5 text-muted sm:table-cell">
                                      {m.Responsable}
                                    </td>
                                    <td
                                      className={`whitespace-nowrap px-3 py-2.5 text-right font-mono font-semibold tabular-nums ${
                                        esEgreso ? 'text-bad' : 'text-bone'
                                      }`}
                                    >
                                      {esEgreso ? '− ' : ''}
                                      {soles(Number(m.Monto) || 0)}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </section>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        </Portal>
      )}
    </>
  );
}
