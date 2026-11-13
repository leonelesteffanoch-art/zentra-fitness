'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  AlertTriangle,
  BarChart2,
  CheckCircle2,
  Clock,
  ScanLine,
  UserPlus,
  Wallet,
} from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { SearchBar } from '@/components/SearchBar';
import { MemberStatusCard } from '@/components/MemberStatusCard';
import { MemberFormModal } from '@/components/MemberFormModal';
import { QuickPaymentModal, type ModoCobro } from '@/components/QuickPaymentModal';
import { buscarSocios, obtenerSocioEstadoPorId } from '@/services/sociosService';
import {
  asistenciasDeHoyDetalladas,
  registrarAsistencia,
  ultimasAsistencias,
  type AsistenciaHoyDetalle,
} from '@/services/asistenciasService';
import { turnoAbierto } from '@/services/cajaService';
import { soles } from '@/lib/formato';
import type { Asistencia, Semaforo, SocioEstado, TurnoCaja } from '@/types';

const BADGE_ESTADO: Record<Semaforo, { cls: string; txt: string }> = {
  VERDE: { cls: 'bg-ok/15 text-ok ring-1 ring-ok/30', txt: 'Activo' },
  AMBAR: { cls: 'bg-warn/15 text-warn ring-1 ring-warn/30', txt: 'Por vencer' },
  ROJO: { cls: 'bg-bad/15 text-bad ring-1 ring-bad/30', txt: 'Vencido' },
};

const FRANJAS_HORARIAS = [
  { h: 6, label: '6a' },
  { h: 8, label: '8a' },
  { h: 10, label: '10a' },
  { h: 12, label: '12p' },
  { h: 14, label: '2p' },
  { h: 16, label: '4p' },
  { h: 18, label: '6p' },
  { h: 20, label: '8p' },
  { h: 22, label: '10p' },
];

function formatearHoraCorta(isoHora: string): string {
  try {
    return new Date(isoHora).toLocaleTimeString('es-PE', {
      timeZone: 'America/Lima',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    return '';
  }
}

function obtenerHoraLimaNumero(isoHora: string): number {
  try {
    const str = new Date(isoHora).toLocaleTimeString('en-GB', {
      timeZone: 'America/Lima',
      hour: '2-digit',
      hour12: false,
    });
    return parseInt(str, 10);
  } catch {
    return 12;
  }
}

export default function RecepcionPage() {
  const { perfil } = useAuth();
  const gymId = perfil?.gym_id;

  const [resultados, setResultados] = useState<SocioEstado[]>([]);
  const [termino, setTermino] = useState('');
  const [seleccionado, setSeleccionado] = useState<SocioEstado | null>(null);
  const [asistenciasSocio, setAsistenciasSocio] = useState<Asistencia[]>([]);
  const [ingresosHoy, setIngresosHoy] = useState<AsistenciaHoyDetalle[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [registrando, setRegistrando] = useState(false);
  const [yaIngreso, setYaIngreso] = useState(false);
  const [turnoActual, setTurnoActual] = useState<TurnoCaja | null | undefined>(undefined);
  const [cobro, setCobro] = useState<ModoCobro | null>(null);
  const [modalNuevoSocio, setModalNuevoSocio] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  const cargarIngresosHoy = useCallback(async () => {
    if (!gymId) return;
    try {
      const lista = await asistenciasDeHoyDetalladas(gymId);
      setIngresosHoy(lista);
    } catch {
      // silencioso
    }
  }, [gymId]);

  useEffect(() => {
    if (!gymId) return;
    turnoAbierto(gymId)
      .then((t) => setTurnoActual(t))
      .catch(() => setTurnoActual(null));
    asistenciasDeHoyDetalladas(gymId)
      .then((lista) => setIngresosHoy(lista))
      .catch(() => {});
  }, [gymId]);

  const seleccionarSocioConAsistencias = useCallback(async (socio: SocioEstado) => {
    setSeleccionado(socio);
    setYaIngreso(false);
    try {
      const lista = await ultimasAsistencias(socio.socio_id);
      setAsistenciasSocio(lista);
    } catch {
      setAsistenciasSocio([]);
    }
  }, []);

  useEffect(() => {
    function handleEsc(e: globalThis.KeyboardEvent) {
      if (e.key === 'Escape' && seleccionado && !cobro && !modalNuevoSocio) {
        setSeleccionado(null);
        setAsistenciasSocio([]);
      }
    }
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [seleccionado, cobro, modalNuevoSocio]);

  const buscar = useCallback(
    async (t: string) => {
      if (!gymId) return;
      setTermino(t);
      setAviso(null);
      setSeleccionado(null);
      setAsistenciasSocio([]);
      setYaIngreso(false);
      if (t.length < 2) {
        setResultados([]);
        return;
      }
      setBuscando(true);
      try {
        const r = await buscarSocios(gymId, t);
        setResultados(r);
        if (r.length === 1) {
          await seleccionarSocioConAsistencias(r[0]);
        }
      } catch (e) {
        setAviso({ tipo: 'error', texto: e instanceof Error ? e.message : 'Error al buscar' });
      } finally {
        setBuscando(false);
      }
    },
    [gymId, seleccionarSocioConAsistencias]
  );

  async function checkIn() {
    if (!seleccionado) return;
    setRegistrando(true);
    try {
      await registrarAsistencia(seleccionado.socio_id);
      const [listaActualizada] = await Promise.all([
        ultimasAsistencias(seleccionado.socio_id),
        cargarIngresosHoy(),
      ]);
      setAsistenciasSocio(listaActualizada);
      setYaIngreso(true);
      setAviso({ tipo: 'ok', texto: `Ingreso registrado: ${seleccionado.nombres}` });
    } catch (e) {
      setAviso({ tipo: 'error', texto: e instanceof Error ? e.message : 'No se pudo registrar' });
    } finally {
      setRegistrando(false);
    }
  }

  async function abrirDesdeFeed(socioId: string) {
    try {
      const estado = await obtenerSocioEstadoPorId(socioId);
      if (estado) {
        await seleccionarSocioConAsistencias(estado);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch {
      // silencioso
    }
  }

  async function cobroTerminado(mensaje: string) {
    const dni = seleccionado?.dni;
    setCobro(null);
    setAviso({ tipo: 'ok', texto: mensaje });
    if (!gymId || !dni) return;
    const [actualizado] = await buscarSocios(gymId, dni);
    if (actualizado) {
      await seleccionarSocioConAsistencias(actualizado);
      setResultados((rs) =>
        rs.map((r) => (r.socio_id === actualizado.socio_id ? actualizado : r))
      );
    }
  }

  // Métricas gráficas de hoy
  const metricasHoy = useMemo(() => {
    const total = ingresosHoy.length;
    const verdes = ingresosHoy.filter((i) => i.semaforo === 'VERDE').length;
    const ambar = ingresosHoy.filter((i) => i.semaforo === 'AMBAR').length;
    const pctVerde = total > 0 ? Math.round((verdes / total) * 100) : 100;

    const conteoPorFranja = FRANJAS_HORARIAS.map((f) => {
      const cant = ingresosHoy.filter((i) => {
        const h = obtenerHoraLimaNumero(i.hora);
        return h >= f.h && h < f.h + 2;
      }).length;
      return { ...f, cant };
    });
    const maxFranja = Math.max(1, ...conteoPorFranja.map((c) => c.cant));

    return { total, verdes, ambar, pctVerde, conteoPorFranja, maxFranja };
  }, [ingresosHoy]);

  const hayTurno = turnoActual !== null && turnoActual !== undefined;

  return (
    <div className="panel-fade-in space-y-6">
      {/* Encabezado y Acciones */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-brand/15 text-brand">
              <ScanLine size={14} strokeWidth={2} />
            </span>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-brand">
              Control de acceso y mostrador
            </p>
          </div>
          <h1 className="mt-1 font-display text-4xl tracking-wide sm:text-5xl">RECEPCIÓN</h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link href="/caja" className="btn btn-ghost !min-h-10 text-xs">
            <Wallet size={15} strokeWidth={1.75} />
            Ir a Caja / POS
          </Link>
          <button
            type="button"
            onClick={() => setModalNuevoSocio(true)}
            className="btn btn-primary !min-h-10"
          >
            <UserPlus size={16} strokeWidth={1.75} />
            Nuevo socio
          </button>
        </div>
      </div>

      {/* Cinta de KPIs en vivo de Recepción */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="panel-card flex items-center justify-between gap-4 p-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
              Asistencias de hoy
            </p>
            <div className="mt-1 flex items-baseline gap-2">
              <p className="font-mono text-2xl font-bold text-bone tabular-nums sm:text-3xl">
                {metricasHoy.total}
              </p>
              <span className="text-xs text-muted">socios en sala hoy</span>
            </div>
          </div>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-ok/15 text-ok ring-1 ring-ok/30">
            <Activity size={20} strokeWidth={1.75} />
          </div>
        </div>

        <div className="panel-card flex flex-col justify-between p-4">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
              Salud de ingresos hoy
            </span>
            <span className="font-mono text-xs font-semibold text-bone tabular-nums">
              {metricasHoy.verdes} al día · {metricasHoy.ambar} por vencer
            </span>
          </div>
          <div className="mt-2.5 flex h-2 w-full overflow-hidden rounded-full bg-surface-2">
            <div
              className="bar-fill h-full bg-ok"
              style={{ width: `${metricasHoy.pctVerde}%` }}
            />
            <div
              className="bar-fill h-full bg-warn"
              style={{ width: `${100 - metricasHoy.pctVerde}%` }}
            />
          </div>
          <div className="mt-1.5 flex justify-between text-[10px] text-muted">
            <span className="inline-flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-ok" /> Activos ({metricasHoy.pctVerde}%)
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-warn" /> Atención / Deuda
            </span>
          </div>
        </div>

        <div className="panel-card flex items-center justify-between gap-3 p-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
              Estado de Caja
            </p>
            {turnoActual === undefined ? (
              <div className="mt-2 h-6 w-28 skeleton rounded" />
            ) : turnoActual ? (
              <div className="mt-1">
                <p className="flex items-center gap-1.5 text-sm font-bold text-ok">
                  <span className="h-2 w-2 rounded-full bg-ok animate-pulse" />
                  Turno {turnoActual.turno} abierto
                </p>
                <p className="mt-0.5 text-[11px] text-muted">
                  Base: <span className="font-mono text-bone">{soles(turnoActual.fondo_inicial)}</span>
                </p>
              </div>
            ) : (
              <div className="mt-1">
                <p className="flex items-center gap-1.5 text-sm font-bold text-warn">
                  <AlertTriangle size={14} /> Caja cerrada
                </p>
                <Link href="/caja" className="mt-0.5 inline-block text-[11px] text-brand underline">
                  Abrir turno para cobrar →
                </Link>
              </div>
            )}
          </div>
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-md ring-1 ${
              hayTurno
                ? 'bg-brand/15 text-brand ring-brand/30'
                : 'bg-warn/15 text-warn ring-warn/30'
            }`}
          >
            <Wallet size={20} strokeWidth={1.75} />
          </div>
        </div>
      </div>

      {/* Buscador principal */}
      <SearchBar
        onSearch={buscar}
        buscando={buscando}
        size="lg"
        autoFocus
        placeholder="Dictar DNI (8 dígitos) o nombre del socio... (Presiona / para enfocar)"
      />

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

      {/* Ficha activa del socio seleccionado */}
      {seleccionado && gymId && (
        <MemberStatusCard
          socio={seleccionado}
          asistencias={asistenciasSocio}
          registrando={registrando}
          yaIngreso={yaIngreso}
          onCheckIn={checkIn}
          onRenovar={() => setCobro('renovar')}
          onCobrarSaldo={() => setCobro('abonar')}
          onLimpiar={() => {
            setSeleccionado(null);
            setAsistenciasSocio([]);
          }}
        />
      )}

      {/* Resultados múltiples de búsqueda */}
      {!seleccionado && resultados.length > 1 && (
        <div className="panel-card panel-fade-in overflow-hidden">
          <div className="flex items-center justify-between border-b border-line bg-surface-2/60 px-4 py-2.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">
              Coincidencias encontradas ({resultados.length})
            </span>
            <span className="text-[11px] text-muted">Haz clic en un socio para abrir su ficha</span>
          </div>
          <ul className="divide-y divide-line" aria-label="Resultados">
            {resultados.map((s) => {
              const b = BADGE_ESTADO[s.semaforo];
              const ini = `${s.nombres?.[0] ?? ''}${s.apellidos?.[0] ?? ''}`.toUpperCase();
              return (
                <li key={s.socio_id}>
                  <button
                    onClick={() => void seleccionarSocioConAsistencias(s)}
                    className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors hover:bg-surface-2/80"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-surface-2 font-display text-sm font-bold text-bone ring-1 ring-line">
                        {ini}
                      </span>
                      <div>
                        <p className="font-semibold text-bone">
                          {s.apellidos}, {s.nombres}
                        </p>
                        <p className="mt-0.5 text-xs text-muted">
                          <span className="font-mono text-bone">DNI {s.dni}</span>
                          {s.plan && <span> · {s.plan}</span>}
                          {s.dias_restantes !== null && (
                            <span>
                              {' '}
                              ·{' '}
                              {s.dias_restantes < 0
                                ? `Venció hace ${Math.abs(s.dias_restantes)}d`
                                : `${s.dias_restantes}d restantes`}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {s.saldo_pendiente > 0 && (
                        <span className="rounded bg-bad/20 px-2 py-0.5 font-mono text-[11px] font-bold text-bad">
                          Debe {soles(s.saldo_pendiente)}
                        </span>
                      )}
                      <span className={`rounded px-2.5 py-0.5 text-xs font-semibold ${b.cls}`}>
                        {b.txt}
                      </span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {!buscando && termino.length >= 2 && resultados.length === 0 && (
        <div className="panel-card panel-fade-in px-6 py-10 text-center">
          <p className="text-sm text-muted">No se encontró ningún socio con “{termino}”.</p>
          <button
            type="button"
            onClick={() => setModalNuevoSocio(true)}
            className="btn btn-primary mt-4"
          >
            <UserPlus size={16} strokeWidth={1.75} />
            Registrar nuevo socio
          </button>
        </div>
      )}

      {/* Panel inferior: Actividad de hoy en vivo + Flujo por franja horaria */}
      <div className="grid gap-5 lg:grid-cols-12">
        {/* Feed de últimos ingresos de hoy */}
        <section className="panel-card flex flex-col justify-between p-5 lg:col-span-7">
          <div>
            <div className="flex items-center justify-between gap-2 border-b border-line/70 pb-3">
              <div className="flex items-center gap-2">
                <Clock size={15} className="text-brand" strokeWidth={1.75} />
                <h2 className="text-sm font-semibold text-bone">Últimos ingresos de hoy</h2>
              </div>
              <span className="rounded-full bg-surface-2 px-2.5 py-0.5 font-mono text-[11px] text-muted">
                {ingresosHoy.length} registros
              </span>
            </div>

            {ingresosHoy.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-xs text-muted">
                  Aún no hay asistencias registradas hoy. Busca un socio por DNI arriba para marcar el primer check-in.
                </p>
              </div>
            ) : (
              <ul className="mt-3 max-h-[290px] divide-y divide-line/60 overflow-y-auto pr-1">
                {ingresosHoy.slice(0, 12).map((ing) => {
                  const b = BADGE_ESTADO[ing.semaforo];
                  const nombreCompleto = ing.socios
                    ? `${ing.socios.apellidos}, ${ing.socios.nombres}`
                    : 'Socio registrado';
                  return (
                    <li key={ing.id}>
                      <button
                        type="button"
                        onClick={() => void abrirDesdeFeed(ing.socio_id)}
                        className="flex w-full items-center justify-between gap-3 rounded px-2.5 py-2.5 text-left transition-colors hover:bg-surface-2/70"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="rounded bg-ink px-2 py-1 font-mono text-xs font-semibold text-brand tabular-nums ring-1 ring-line">
                            {formatearHoraCorta(ing.hora)}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-bone">
                              {nombreCompleto}
                            </p>
                            {ing.socios?.dni && (
                              <p className="font-mono text-[11px] text-muted">
                                DNI {ing.socios.dni}
                              </p>
                            )}
                          </div>
                        </div>
                        <span className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-semibold ${b.cls}`}>
                          {b.txt}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <p className="mt-3 border-t border-line/50 pt-2.5 text-[11px] text-muted">
            Tip: Haz clic en cualquier socio de la lista para volver a abrir su ficha.
          </p>
        </section>

        {/* Gráfico de barras: Flujo horario de hoy */}
        <section className="panel-card flex flex-col justify-between p-5 lg:col-span-5">
          <div>
            <div className="flex items-center justify-between gap-2 border-b border-line/70 pb-3">
              <div className="flex items-center gap-2">
                <BarChart2 size={15} className="text-brand" strokeWidth={1.75} />
                <h2 className="text-sm font-semibold text-bone">Afluencia por hora (Hoy)</h2>
              </div>
              <span className="text-[11px] text-muted">6:00 – 22:00</span>
            </div>

            <div className="mt-5 flex h-40 items-end justify-between gap-2 px-1 pt-4">
              {metricasHoy.conteoPorFranja.map((f) => {
                const alturaPct =
                  f.cant === 0 ? 6 : Math.max(14, Math.round((f.cant / metricasHoy.maxFranja) * 100));
                return (
                  <div
                    key={f.h}
                    className="group flex flex-1 flex-col items-center gap-1.5"
                    title={`${f.label}: ${f.cant} ingresos`}
                  >
                    <span className="font-mono text-[10px] font-bold text-bone opacity-80 tabular-nums">
                      {f.cant > 0 ? f.cant : ''}
                    </span>
                    <div className="flex h-28 w-full items-end justify-center rounded-t bg-surface-2/60 p-0.5">
                      <div
                        className={`w-full rounded-t transition-all duration-500 ${
                          f.cant > 0
                            ? 'bg-gradient-to-t from-brand/60 to-brand group-hover:brightness-110'
                            : 'bg-line/40'
                        }`}
                        style={{ height: `${alturaPct}%` }}
                      />
                    </div>
                    <span className="font-mono text-[10px] text-muted">{f.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="mt-3 border-t border-line/50 pt-2.5 text-[11px] text-muted">
            Visualiza las horas pico del gimnasio en tiempo real según los check-ins del día.
          </p>
        </section>
      </div>

      {modalNuevoSocio && gymId && perfil && (
        <MemberFormModal
          gymId={gymId}
          userId={perfil.id}
          onClose={() => setModalNuevoSocio(false)}
          onSaved={async (dniCreado) => {
            setModalNuevoSocio(false);
            const r = await buscarSocios(gymId, dniCreado);
            setResultados(r);
            if (r[0]) {
              await seleccionarSocioConAsistencias(r[0]);
              setCobro('renovar');
            }
          }}
        />
      )}

      {cobro && seleccionado && gymId && (
        <QuickPaymentModal
          modo={cobro}
          socio={seleccionado}
          gymId={gymId}
          hayTurno={hayTurno}
          onClose={() => setCobro(null)}
          onDone={cobroTerminado}
        />
      )}
    </div>
  );
}
