'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  AlertTriangle,
  Ban,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock,
  Download,
  Edit3,
  Loader2,
  MessageCircle,
  RefreshCw,
  Upload,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { SearchBar } from '@/components/SearchBar';
import { MemberFormModal } from '@/components/MemberFormModal';
import { QuickPaymentModal, type ModoCobro } from '@/components/QuickPaymentModal';
import { WeeklyAttendanceCalendar } from '@/components/WeeklyAttendanceCalendar';
import { ToastBanner } from '@/components/ToastBanner';
import {
  anularMembresia,
  buscarSocios,
  listarSociosEstado,
  membresiasDeSocio,
  obtenerResumenPadron,
  type FiltroEstadoSocio,
  type ResumenPadronSocios,
} from '@/services/sociosService';
import { ultimasAsistencias } from '@/services/asistenciasService';
import { turnoAbierto } from '@/services/cajaService';
import { hoyLima, soles } from '@/lib/formato';
import type { Asistencia, MembresiaEstado, Semaforo, SocioEstado } from '@/types';

// Se carga solo al abrir "Importar Excel" (arrastra la librería xlsx, que es pesada).
const ImportSociosModal = dynamic(
  () => import('@/components/ImportSociosModal').then((m) => m.ImportSociosModal),
  { ssr: false }
);

const BADGE_SEMAFORO: Record<Semaforo, { cls: string; txt: string }> = {
  VERDE: { cls: 'bg-ok/15 text-ok ring-1 ring-ok/30', txt: 'Activo' },
  AMBAR: { cls: 'bg-warn/15 text-warn ring-1 ring-warn/30', txt: 'Por vencer' },
  ROJO: { cls: 'bg-bad/15 text-bad ring-1 ring-bad/30', txt: 'Vencido' },
};

const FILTROS: { id: FiltroEstadoSocio; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'activos', label: 'Activos' },
  { id: 'por_vencer', label: 'Por vencer' },
  { id: 'vencidos', label: 'Vencidos' },
  { id: 'morosos', label: '🔴 Morosos' },
];

export default function SociosPage() {
  const { perfil } = useAuth();
  const gymId = perfil?.gym_id;
  const esAdmin = perfil?.rol === 'admin';

  const [socios, setSocios] = useState<SocioEstado[]>([]);
  const [resumenPadron, setResumenPadron] = useState<ResumenPadronSocios | null>(null);
  const [pagina, setPagina] = useState(0);
  const [termino, setTermino] = useState('');
  const [filtro, setFiltro] = useState<FiltroEstadoSocio>('todos');
  const [cargando, setCargando] = useState(true);
  const [exportando, setExportando] = useState(false);
  const [hayTurno, setHayTurno] = useState(false);

  const [seleccionado, setSeleccionado] = useState<SocioEstado | null>(null);
  const [historial, setHistorial] = useState<MembresiaEstado[]>([]);
  const [asistenciasSocio, setAsistenciasSocio] = useState<Asistencia[]>([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);

  // Modales
  const [modalSocio, setModalSocio] = useState<'nuevo' | 'editar' | null>(null);
  const [modoCobro, setModoCobro] = useState<ModoCobro | null>(null);
  const [modalImportar, setModalImportar] = useState(false);

  // Acción sobre una membresía (anular — solo admin)
  const [anulandoId, setAnulandoId] = useState<string | null>(null);
  const [motivoAnular, setMotivoAnular] = useState('');
  const [procesandoAccion, setProcesandoAccion] = useState(false);

  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  // Evita que una respuesta lenta (vieja) pise a una más reciente al escribir rápido.
  const ultimaCarga = useRef(0);

  /**
   * Carga la lista. El resumen del padrón (descarga TODAS las filas) solo se
   * recalcula cuando los datos cambiaron (cobro, edición, importación),
   * no en cada búsqueda, filtro o cambio de página.
   */
  const cargarListado = useCallback(
    async (term: string, pag: number, fil: FiltroEstadoSocio, conResumen = false) => {
      if (!gymId) return;
      const id = ++ultimaCarga.current;
      setCargando(true);
      try {
        const listaPromesa =
          term.length >= 2 ? buscarSocios(gymId, term, fil) : listarSociosEstado(gymId, pag, fil);
        if (conResumen) {
          // El resumen no bloquea la lista: se actualiza cuando llegue.
          void obtenerResumenPadron(gymId)
            .then((res) => {
              if (res) setResumenPadron(res);
            })
            .catch(() => null);
        }
        const lista = await listaPromesa;
        if (id !== ultimaCarga.current) return;
        setSocios(lista);
      } catch (e) {
        if (id !== ultimaCarga.current) return;
        setAviso({
          tipo: 'error',
          texto: e instanceof Error ? e.message : 'Error al cargar socios',
        });
      } finally {
        if (id === ultimaCarga.current) setCargando(false);
      }
    },
    [gymId]
  );

  useEffect(() => {
    if (!gymId) return;
    let cancelado = false;
    Promise.all([
      listarSociosEstado(gymId, 0, 'todos'),
      turnoAbierto(gymId),
      obtenerResumenPadron(gymId).catch(() => null),
    ])
      .then(([lista, t, res]) => {
        if (cancelado) return;
        setSocios(lista);
        setHayTurno(t !== null);
        if (res) setResumenPadron(res);
      })
      .catch((e: unknown) => {
        if (!cancelado) {
          setAviso({
            tipo: 'error',
            texto: e instanceof Error ? e.message : 'Error al cargar socios',
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

  const cargarFicha = useCallback(async (socio: SocioEstado) => {
    setSeleccionado(socio);
    setAnulandoId(null);
    setCargandoHistorial(true);
    try {
      const [mems, asis] = await Promise.all([
        membresiasDeSocio(socio.socio_id),
        ultimasAsistencias(socio.socio_id),
      ]);
      setHistorial(mems);
      setAsistenciasSocio(asis);
    } catch (e) {
      setAviso({
        tipo: 'error',
        texto: e instanceof Error ? e.message : 'Error al cargar membresías',
      });
    } finally {
      setCargandoHistorial(false);
    }
  }, []);

  const handleSearch = useCallback(
    (t: string) => {
      setTermino(t);
      setPagina(0);
      void cargarListado(t, 0, filtro);
    },
    [cargarListado, filtro]
  );

  function cambiarFiltro(nuevo: FiltroEstadoSocio) {
    setFiltro(nuevo);
    setPagina(0);
    void cargarListado(termino, 0, nuevo);
  }

  async function refrescarSeleccionado(dniBuscar: string) {
    if (!gymId) return;
    const [actualizado] = await buscarSocios(gymId, dniBuscar, 'todos');
    await cargarListado(termino, pagina, filtro, true);
    if (actualizado) {
      await cargarFicha(actualizado);
    }
  }

  async function handleAnularMembresia(membresiaId: string) {
    if (!motivoAnular.trim()) return;
    setProcesandoAccion(true);
    setAviso(null);
    try {
      await anularMembresia(membresiaId, motivoAnular.trim());
      setAnulandoId(null);
      setMotivoAnular('');
      setAviso({ tipo: 'ok', texto: 'Membresía y sus cobros asociados fueron anulados' });
      if (seleccionado) await refrescarSeleccionado(seleccionado.dni);
    } catch (e) {
      setAviso({
        tipo: 'error',
        texto: e instanceof Error ? e.message : 'No se pudo anular la membresía',
      });
    } finally {
      setProcesandoAccion(false);
    }
  }

  /** Exporta el padrón en el formato exacto de Excel del gimnasio:
   *  [Nombres, DNI, Celular, Plan, Pagado, Deuda, Inicio de la Membresía, Fin de Membresía, Días Restantes]
   */
  async function exportarExcelSocios() {
    if (!gymId) return;
    setExportando(true);
    setAviso(null);
    try {
      const XLSX = await import('xlsx');
      const todos: SocioEstado[] = [];
      let pag = 0;
      while (pag < 20) {
        const lote = await listarSociosEstado(gymId, pag, 'todos');
        todos.push(...lote);
        if (lote.length < 20) break;
        pag += 1;
      }

      if (todos.length === 0) {
        setAviso({ tipo: 'error', texto: 'No hay socios registrados para exportar' });
        return;
      }

      const filas = todos.map((s) => ({
        Nombres: `${s.apellidos}, ${s.nombres}`,
        DNI: s.dni,
        Celular: s.telefono ?? '—',
        'Plan Elegido': s.plan ?? 'Sin membresía',
        Deuda: Number(s.saldo_pendiente) || 0,
        'Inicio de la Membresía': s.fecha_inicio ?? '—',
        'Fin de Membresía': s.fecha_fin ?? '—',
        'Días Restantes': s.dias_restantes ?? 0,
        Estado:
          s.semaforo === 'VERDE'
            ? 'Activo'
            : s.semaforo === 'AMBAR'
            ? 'Por vencer / Deuda'
            : 'Vencido',
      }));

      const hoja = XLSX.utils.json_to_sheet(filas);
      hoja['!cols'] = [
        { wch: 28 },
        { wch: 12 },
        { wch: 14 },
        { wch: 22 },
        { wch: 10 },
        { wch: 18 },
        { wch: 16 },
        { wch: 14 },
        { wch: 16 },
      ];
      const libro = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(libro, hoja, 'Socios');
      XLSX.writeFile(libro, `Zentra_Fitness_Socios_${hoyLima()}.xlsx`);
      setAviso({
        tipo: 'ok',
        texto: `Padrón de socios exportado a Excel (${filas.length} inscritos)`,
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

  const hayMasDeUnaPagina = termino.length < 2 && (pagina > 0 || socios.length === 20);
  const totalPadron = Math.max(1, resumenPadron?.total ?? 1);
  const pctActivos = resumenPadron ? Math.round((resumenPadron.activos / totalPadron) * 100) : 0;
  const pctPorVencer = resumenPadron ? Math.round((resumenPadron.porVencer / totalPadron) * 100) : 0;
  const pctVencidos = resumenPadron ? Math.max(0, 100 - pctActivos - pctPorVencer) : 0;

  return (
    <div className="panel-fade-in space-y-6">
      {/* Cabecera */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-brand">
            Padrón e historial de membresías
          </p>
          <h1 className="mt-0.5 font-display text-4xl tracking-wide sm:text-5xl">SOCIOS</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setModalImportar(true)}
            className="btn btn-ghost !min-h-10"
          >
            <Upload size={15} strokeWidth={1.75} />
            Importar Excel
          </button>
          <button
            type="button"
            disabled={exportando}
            onClick={exportarExcelSocios}
            className="btn btn-ghost !min-h-10"
          >
            {exportando ? (
              <Loader2 size={15} strokeWidth={1.75} className="animate-spin" />
            ) : (
              <Download size={15} strokeWidth={1.75} />
            )}
            Exportar Excel
          </button>
          <button
            type="button"
            onClick={() => setModalSocio('nuevo')}
            className="btn btn-primary !min-h-10"
          >
            <UserPlus size={16} strokeWidth={1.75} />
            Nuevo socio
          </button>
        </div>
      </div>

      {/* Cinta de KPIs interactivos + Barra de distribución del padrón */}
      {resumenPadron && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <button
              type="button"
              onClick={() => cambiarFiltro('todos')}
              className={`panel-card panel-card-interactive p-3.5 text-left ${
                filtro === 'todos' ? '!border-brand ring-1 ring-brand/30' : ''
              }`}
            >
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                Total padrón
              </span>
              <p className="mt-1 font-mono text-2xl font-bold text-bone tabular-nums">
                {resumenPadron.total}
              </p>
              <span className="text-[11px] text-muted">100% registrados</span>
            </button>

            <button
              type="button"
              onClick={() => cambiarFiltro('activos')}
              className={`panel-card panel-card-interactive p-3.5 text-left ${
                filtro === 'activos' ? '!border-ok ring-1 ring-ok/30' : ''
              }`}
            >
              <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-ok">
                <span className="h-2 w-2 rounded-full bg-ok" /> Activos
              </span>
              <p className="mt-1 font-mono text-2xl font-bold text-ok tabular-nums">
                {resumenPadron.activos}
              </p>
              <span className="text-[11px] text-muted">{pctActivos}% del total</span>
            </button>

            <button
              type="button"
              onClick={() => cambiarFiltro('por_vencer')}
              className={`panel-card panel-card-interactive p-3.5 text-left ${
                filtro === 'por_vencer' ? '!border-warn ring-1 ring-warn/30' : ''
              }`}
            >
              <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-warn">
                <span className="h-2 w-2 rounded-full bg-warn" /> Por vencer (≤3d)
              </span>
              <p className="mt-1 font-mono text-2xl font-bold text-warn tabular-nums">
                {resumenPadron.porVencer}
              </p>
              <span className="text-[11px] text-muted">Renovación próxima</span>
            </button>

            <button
              type="button"
              onClick={() => cambiarFiltro('vencidos')}
              className={`panel-card panel-card-interactive p-3.5 text-left ${
                filtro === 'vencidos' ? '!border-bad ring-1 ring-bad/30' : ''
              }`}
            >
              <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-bad">
                <span className="h-2 w-2 rounded-full bg-bad" /> Vencidos
              </span>
              <p className="mt-1 font-mono text-2xl font-bold text-bad tabular-nums">
                {resumenPadron.vencidos}
              </p>
              <span className="text-[11px] text-muted">{pctVencidos}% por recuperar</span>
            </button>

            <button
              type="button"
              onClick={() => cambiarFiltro('morosos')}
              className={`panel-card panel-card-interactive col-span-2 p-3.5 text-left sm:col-span-1 ${
                filtro === 'morosos' ? '!border-bad ring-1 ring-bad/40' : ''
              }`}
            >
              <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-bad">
                🔴 Morosos ({resumenPadron.morosos})
              </span>
              <p className="mt-1 font-mono text-xl font-bold text-bad tabular-nums">
                {soles(resumenPadron.deudaTotal)}
              </p>
              <span className="text-[11px] text-muted">Saldo por cobrar</span>
            </button>
          </div>

          {/* Barra gráfica de salud del padrón */}
          <div className="panel-card flex items-center gap-3 px-4 py-2.5">
            <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wider text-muted">
              Distribución:
            </span>
            <div className="flex h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
              {pctActivos > 0 && (
                <div
                  className="bar-fill h-full bg-ok"
                  style={{ width: `${pctActivos}%` }}
                  title={`Activos: ${pctActivos}%`}
                />
              )}
              {pctPorVencer > 0 && (
                <div
                  className="bar-fill h-full bg-warn"
                  style={{ width: `${pctPorVencer}%` }}
                  title={`Por vencer: ${pctPorVencer}%`}
                />
              )}
              {pctVencidos > 0 && (
                <div
                  className="bar-fill h-full bg-bad"
                  style={{ width: `${pctVencidos}%` }}
                  title={`Vencidos: ${pctVencidos}%`}
                />
              )}
            </div>
            <span className="hidden shrink-0 font-mono text-[11px] text-muted sm:inline">
              {pctActivos}% activos
            </span>
          </div>
        </div>
      )}

      {/* Buscador + Chips de filtro rápido */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full sm:max-w-md">
          <SearchBar
            onSearch={handleSearch}
            buscando={cargando}
            placeholder="Buscar por DNI, nombres o apellidos... (Presiona /)"
          />
        </div>

        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por estado">
          {FILTROS.map((f) => {
            const activo = filtro === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => cambiarFiltro(f.id)}
                aria-pressed={activo}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                  activo
                    ? 'bg-brand text-ink shadow-xs'
                    : 'border border-line bg-surface text-muted hover:bg-surface-2 hover:text-bone'
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      <ToastBanner aviso={aviso} onClose={() => setAviso(null)} />

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

      {/* Grilla: Listado a la izquierda + Ficha del socio a la derecha */}
      <div className="grid items-start gap-6 lg:grid-cols-[1.25fr_1fr]">
        {/* Columna izquierda: Tabla de socios */}
        <section aria-label="Listado de socios" className="space-y-3">
          <div className="panel-card overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="border-b border-line bg-surface-2/80 text-xs font-semibold uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-4 py-3">Socio</th>
                  <th className="px-3 py-3">DNI</th>
                  <th className="px-3 py-3">Plan / Ciclo</th>
                  <th className="px-4 py-3 text-right">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/70">
                {socios.length === 0 && !cargando ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-12 text-center text-muted">
                      No hay socios con ese criterio.
                    </td>
                  </tr>
                ) : (
                  socios.map((s) => {
                    const activo = seleccionado?.socio_id === s.socio_id;
                    const badge = BADGE_SEMAFORO[s.semaforo];
                    const ini = `${s.nombres?.[0] ?? ''}${s.apellidos?.[0] ?? ''}`.toUpperCase();
                    return (
                      <tr
                        key={s.socio_id}
                        onClick={() => void cargarFicha(s)}
                        className={`cursor-pointer transition-colors ${
                          activo
                            ? 'bg-brand/10 shadow-[inset_3px_0_0_0_#facc15]'
                            : 'hover:bg-surface-2/60'
                        }`}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <span
                              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded font-display text-xs font-bold tracking-wider ring-1 ${
                                activo
                                  ? 'bg-brand text-ink ring-brand'
                                  : 'bg-surface-2 text-bone ring-line'
                              }`}
                            >
                              {ini || 'S'}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-bone">
                                {s.apellidos}, {s.nombres}
                              </p>
                              {s.saldo_pendiente > 0 && (
                                <span className="mt-0.5 inline-block rounded bg-bad/20 px-1.5 py-0.2 font-mono text-[10px] font-bold text-bad tabular-nums">
                                  Debe {soles(s.saldo_pendiente)}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 font-mono text-xs text-muted">{s.dni}</td>
                        <td className="px-3 py-3 text-xs">
                          {s.plan ? (
                            <div>
                              <span className="font-medium text-bone">{s.plan}</span>
                              <div className="mt-0.5 flex items-center gap-1.5 font-mono text-[11px] text-muted">
                                <span>{s.fecha_fin}</span>
                                {s.dias_restantes !== null && (
                                  <span
                                    className={`rounded px-1 py-0.2 text-[10px] font-semibold ${
                                      s.dias_restantes < 0
                                        ? 'bg-bad/15 text-bad'
                                        : s.dias_restantes <= 3
                                        ? 'bg-warn/15 text-warn'
                                        : 'bg-surface-2 text-muted'
                                    }`}
                                  >
                                    {s.dias_restantes < 0
                                      ? `${s.dias_restantes}d`
                                      : `${s.dias_restantes}d`}
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted">Sin membresía</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span
                            className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${badge.cls}`}
                          >
                            {badge.txt}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {hayMasDeUnaPagina && (
            <div className="flex items-center justify-between rounded-md border border-line bg-surface px-4 py-2">
              <span className="font-mono text-xs text-muted">Página {pagina + 1}</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={pagina === 0 || cargando}
                  onClick={() => {
                    const p = Math.max(0, pagina - 1);
                    setPagina(p);
                    void cargarListado('', p, filtro);
                  }}
                  className="btn btn-ghost !min-h-8 !px-3 text-xs"
                >
                  <ChevronLeft size={14} strokeWidth={1.75} /> Anterior
                </button>
                <button
                  type="button"
                  disabled={socios.length < 20 || cargando}
                  onClick={() => {
                    const p = pagina + 1;
                    setPagina(p);
                    void cargarListado('', p, filtro);
                  }}
                  className="btn btn-ghost !min-h-8 !px-3 text-xs"
                >
                  Siguiente <ChevronRight size={14} strokeWidth={1.75} />
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Columna derecha: EmptyState o Ficha ordenada (sticky en escritorio) */}
        <section
          aria-label="Detalle del socio"
          className="panel-card p-6 lg:sticky lg:top-20"
        >
          {!seleccionado ? (
            <div className="flex flex-col items-center py-12 text-center">
              <Users size={32} strokeWidth={1.5} className="text-muted" />
              <p className="mt-3 text-sm font-medium text-bone">Ningún socio seleccionado</p>
              <p className="mt-1 max-w-xs text-xs text-muted">
                Elige un socio de la tabla para ver su ficha, calendario semanal y membresía, o
                inscribe uno nuevo.
              </p>
              <button
                type="button"
                onClick={() => setModalSocio('nuevo')}
                className="btn btn-primary mt-5"
              >
                <UserPlus size={16} strokeWidth={1.5} />
                Registrar nuevo socio
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* 1. Acción principal arriba */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line/70 pb-4">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setModoCobro('renovar')}
                    className="btn btn-primary"
                  >
                    <RefreshCw size={16} strokeWidth={1.5} />
                    {seleccionado.membresia_id ? 'Renovar membresía' : 'Asignar plan'}
                  </button>
                  {seleccionado.saldo_pendiente > 0 && (
                    <button
                      type="button"
                      onClick={() => setModoCobro('abonar')}
                      className="btn btn-secondary tabular-nums"
                    >
                      <CircleDollarSign size={16} strokeWidth={1.5} />
                      Cobrar deuda ({soles(seleccionado.saldo_pendiente)})
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setModalSocio('editar')}
                  className="btn btn-ghost !min-h-9 !px-2.5"
                  title="Editar datos del socio"
                  aria-label="Editar datos del socio"
                >
                  <Edit3 size={15} strokeWidth={1.5} />
                </button>
              </div>

              {/* 2. Datos del socio */}
              <div>
                <h2 className="section-title text-xl">
                  {seleccionado.apellidos}, {seleccionado.nombres}
                </h2>
                <dl className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted">
                  <div>
                    <dt className="inline">DNI: </dt>
                    <dd className="inline font-mono text-bone">{seleccionado.dni}</dd>
                  </div>
                  {seleccionado.telefono && (
                    <div>
                      <dt className="inline">Celular / WhatsApp: </dt>
                      <dd className="inline tabular-nums text-bone">{seleccionado.telefono}</dd>
                    </div>
                  )}
                </dl>
              </div>

              {/* Alerta de Moroso / Deuda y Alerta de Inactividad */}
              {(() => {
                const hoy = hoyLima();
                const diasAtraso =
                  seleccionado.saldo_pendiente > 0 && seleccionado.fecha_inicio
                    ? Math.max(
                        0,
                        Math.floor(
                          (new Date(hoy).getTime() - new Date(seleccionado.fecha_inicio).getTime()) /
                            (1000 * 60 * 60 * 24)
                        )
                      )
                    : 0;

                const ultimaAsis = asistenciasSocio.length > 0 ? asistenciasSocio[0].fecha : null;
                const fechaRef = ultimaAsis ?? seleccionado.fecha_inicio;
                const diasSinVenir =
                  seleccionado.semaforo !== 'ROJO' && fechaRef
                    ? Math.max(
                        0,
                        Math.floor(
                          (new Date(hoy).getTime() - new Date(fechaRef).getTime()) /
                            (1000 * 60 * 60 * 24)
                        )
                      )
                    : 0;
                const estaInactivo = seleccionado.semaforo !== 'ROJO' && diasSinVenir >= 7;

                return (
                  <div className="space-y-3">
                    {seleccionado.saldo_pendiente > 0 && (
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-l-4 border-bad bg-bad/15 p-3.5 rounded-xs">
                        <div>
                          <span className="inline-flex items-center gap-1.5 font-bold text-bad text-xs">
                            <AlertTriangle size={15} strokeWidth={2} />
                            SALDO PENDIENTE · {diasAtraso > 0 ? `${diasAtraso} DÍAS DE ATRASO` : 'PENDIENTE'}
                          </span>
                          <p className="mt-0.5 text-xs text-bone">
                            Debe <strong className="text-bad font-bold">{soles(seleccionado.saldo_pendiente)}</strong> del plan {seleccionado.plan}.
                          </p>
                        </div>
                        {seleccionado.telefono && (
                          <a
                            href={`https://wa.me/51${seleccionado.telefono.replace(/\D/g, '')}?text=${encodeURIComponent(
                              `Hola ${seleccionado.nombres}, te saludamos de Zentra Fitness. Te recordamos cordialmente que mantienes un saldo pendiente de ${soles(
                                seleccionado.saldo_pendiente
                              )} de tu membresía. Puedes cancelarlo en tu próximo ingreso o vía Yape/Plin. ¡Muchas gracias!`
                            )}`}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-secondary !min-h-8 !px-2.5 text-xs text-ok hover:text-ok shrink-0"
                            title="Enviar recordatorio por WhatsApp"
                          >
                            <MessageCircle size={14} />
                            Cobrar por WhatsApp
                          </a>
                        )}
                      </div>
                    )}

                    {estaInactivo && (
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-l-4 border-warn bg-warn/15 p-3.5 rounded-xs">
                        <div>
                          <span className="inline-flex items-center gap-1.5 font-bold text-warn text-xs">
                            <Clock size={15} strokeWidth={2} />
                            INACTIVO · {diasSinVenir} DÍAS SIN ENTRENAR
                          </span>
                          <p className="mt-0.5 text-xs text-bone">
                            {ultimaAsis
                              ? `Última visita registrada: ${ultimaAsis}.`
                              : `Inició membresía el ${seleccionado.fecha_inicio} pero aún no registra check-in.`}
                          </p>
                        </div>
                        {seleccionado.telefono && (
                          <a
                            href={`https://wa.me/51${seleccionado.telefono.replace(/\D/g, '')}?text=${encodeURIComponent(
                              `¡Hola ${seleccionado.nombres}! Te extrañamos en Zentra Fitness 💪 Notamos que llevas ${diasSinVenir} días sin venir a entrenar. Recuerda que tu membresía ${
                                seleccionado.plan ? `(${seleccionado.plan})` : ''
                              } sigue activa y la constancia es la clave para tus resultados. ¿Tienes algún horario disponible esta semana para retomar? ¡Te esperamos en la sala!`
                            )}`}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-secondary !min-h-8 !px-2.5 text-xs shrink-0"
                          >
                            <MessageCircle size={14} className="text-ok" />
                            Motivar por WhatsApp
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* 3. Calendario semanal de asistencias */}
              <WeeklyAttendanceCalendar
                asistencias={asistenciasSocio}
                planNombre={seleccionado.plan}
              />

              {/* 4. Membresías registradas */}
              <div className="space-y-3 border-t border-line/70 pt-5">
                <h3 className="text-xs font-medium text-muted">Membresías registradas</h3>

                {cargandoHistorial ? (
                  <div className="py-6 text-muted">
                    <Loader2 className="animate-spin" strokeWidth={1.5} />
                  </div>
                ) : historial.length === 0 ? (
                  <p className="bg-surface-2 p-4 text-xs text-muted">
                    Este socio aún no tiene membresías registradas.
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {historial.map((m) => {
                      const anulada = m.estado === 'ANULADO';
                      return (
                        <li
                          key={m.membresia_id}
                          className={`bg-surface-2 p-4 text-sm ${
                            anulada ? 'opacity-50 line-through' : ''
                          }`}
                        >
                          <div className="flex items-baseline justify-between">
                            <span className="font-semibold text-bone">{m.plan}</span>
                            <span className="font-mono text-xs text-muted">
                              {m.fecha_inicio} → {m.fecha_fin}
                            </span>
                          </div>

                          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted tabular-nums">
                            <span>
                              Total:{' '}
                              <strong className="font-medium text-bone">
                                {soles(m.precio_total)}
                              </strong>
                            </span>
                            <span>
                              Pagado:{' '}
                              <strong className="font-medium text-ok">
                                {soles(m.monto_pagado)}
                              </strong>
                            </span>
                            {m.saldo_pendiente > 0 && (
                              <span className="font-semibold text-warn">
                                Deuda: {soles(m.saldo_pendiente)}
                              </span>
                            )}
                          </div>

                          {/* Acción de anulación exclusiva para el administrador */}
                          {!anulada && esAdmin && (
                            <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-line/60 pt-2.5">
                              {anulandoId === m.membresia_id ? (
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="text"
                                    placeholder="Motivo de anulación"
                                    value={motivoAnular}
                                    onChange={(e) => setMotivoAnular(e.target.value)}
                                    className="field !min-h-8 !w-40 !px-2 text-xs"
                                  />
                                  <button
                                    type="button"
                                    disabled={procesandoAccion || !motivoAnular.trim()}
                                    onClick={() => handleAnularMembresia(m.membresia_id)}
                                    className="btn btn-secondary !min-h-8 !px-2.5"
                                  >
                                    <Check size={14} strokeWidth={1.5} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setAnulandoId(null)}
                                    className="btn btn-ghost !min-h-8 !px-2"
                                  >
                                    <X size={14} strokeWidth={1.5} />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAnulandoId(m.membresia_id);
                                    setMotivoAnular('');
                                  }}
                                  className="inline-flex items-center gap-1 text-xs font-medium text-muted hover:text-bad"
                                >
                                  <Ban size={13} strokeWidth={1.5} />
                                  Anular membresía
                                </button>
                              )}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Modal Crear / Editar Socio */}
      {modalSocio && gymId && perfil && (
        <MemberFormModal
          gymId={gymId}
          userId={perfil.id}
          socioEditar={modalSocio === 'editar' ? seleccionado : null}
          onClose={() => setModalSocio(null)}
          onSaved={async (dniGuardado, esNuevo) => {
            setModalSocio(null);
            setAviso({
              tipo: 'ok',
              texto: esNuevo
                ? 'Socio registrado. Ahora puedes asignarle su plan.'
                : 'Datos del socio actualizados.',
            });
            await refrescarSeleccionado(dniGuardado);
            if (esNuevo) setModoCobro('renovar');
          }}
        />
      )}

      {/* Modal Cobrar / Renovar Membresía */}
      {modoCobro && seleccionado && gymId && (
        <QuickPaymentModal
          modo={modoCobro}
          socio={seleccionado}
          gymId={gymId}
          hayTurno={hayTurno}
          onClose={() => setModoCobro(null)}
          onDone={async (msg) => {
            setModoCobro(null);
            setAviso({ tipo: 'ok', texto: msg });
            await refrescarSeleccionado(seleccionado.dni);
          }}
        />
      )}

      {/* Modal Importar Excel de Socios Antiguos */}
      {modalImportar && gymId && (
        <ImportSociosModal
          gymId={gymId}
          onClose={() => setModalImportar(false)}
          onDone={async (msg) => {
            setModalImportar(false);
            setAviso({ tipo: 'ok', texto: msg });
            setPagina(0);
            await cargarListado(termino, 0, filtro, true);
          }}
        />
      )}
    </div>
  );
}
