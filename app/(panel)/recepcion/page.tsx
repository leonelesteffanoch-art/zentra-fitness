'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  AlertTriangle,
  BarChart2,
  Check,
  Clock,
  LogIn,
  UserPlus,
  Wallet,
} from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { SearchBar } from '@/components/SearchBar';
import { MemberStatusCard } from '@/components/MemberStatusCard';
import { MemberFormModal } from '@/components/MemberFormModal';
import { EditMembershipModal } from '@/components/EditMembershipModal';
import { QuickPaymentModal, type ModoCobro } from '@/components/QuickPaymentModal';
import { ToastBanner } from '@/components/ToastBanner';
import { buscarSocios, obtenerSocioEstadoPorId } from '@/services/sociosService';
import {
  asistenciasDeHoyDetalladas,
  registrarAsistencia,
  ultimasAsistencias,
  type AsistenciaHoyDetalle,
} from '@/services/asistenciasService';
import { turnoAbierto } from '@/services/cajaService';
import { estadoDatosSocio, formatearNombreSocio, soles } from '@/lib/formato';
import type { Asistencia, Semaforo, SocioEstado, TurnoCaja } from '@/types';

const BADGE_ESTADO: Record<Semaforo, { cls: string; txt: string }> = {
  VERDE: { cls: 'bg-ok/15 text-ok ring-1 ring-ok/30', txt: 'Activo' },
  AMBAR: { cls: 'bg-warn/15 text-warn ring-1 ring-warn/30', txt: 'Por vencer' },
  ROJO: { cls: 'bg-bad/15 text-bad ring-1 ring-bad/30', txt: 'Vencido' },
};

const FRANJAS_HORARIAS = [
  { h: 6, label: '6:00' },
  { h: 8, label: '8:00' },
  { h: 10, label: '10:00' },
  { h: 12, label: '12:00' },
  { h: 14, label: '14:00' },
  { h: 16, label: '16:00' },
  { h: 18, label: '18:00' },
  { h: 20, label: '20:00' },
  { h: 22, label: '22:00' },
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
  const [searchReset, setSearchReset] = useState(0);
  const [seleccionado, setSeleccionado] = useState<SocioEstado | null>(null);
  const [asistenciasSocio, setAsistenciasSocio] = useState<Asistencia[]>([]);
  const [ingresosHoy, setIngresosHoy] = useState<AsistenciaHoyDetalle[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [registrando, setRegistrando] = useState(false);
  const [registrandoId, setRegistrandoId] = useState<string | null>(null);
  const [yaIngreso, setYaIngreso] = useState(false);
  const [turnoActual, setTurnoActual] = useState<TurnoCaja | null | undefined>(undefined);
  const [horaActualLima, setHoraActualLima] = useState<number | null>(null);
  const [cobro, setCobro] = useState<ModoCobro | null>(null);
  const [editandoMembresiaId, setEditandoMembresiaId] = useState<string | null>(null);
  const [modalSocio, setModalSocio] = useState<'nuevo' | 'editar' | null>(null);
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  useEffect(() => {
    const actualizarHora = () => {
      setHoraActualLima(obtenerHoraLimaNumero(new Date().toISOString()));
    };
    const init = setTimeout(actualizarHora, 0);
    const id = setInterval(actualizarHora, 60_000);
    return () => {
      clearTimeout(init);
      clearInterval(id);
    };
  }, []);

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
      if (e.key === 'Escape' && seleccionado && !cobro && !modalSocio) {
        setSeleccionado(null);
        setAsistenciasSocio([]);
      }
    }
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [seleccionado, cobro, modalSocio]);

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
      setAviso({
        tipo: 'ok',
        texto:
          seleccionado.semaforo === 'ROJO'
            ? `Ingreso con tolerancia registrado: ${formatearNombreSocio(seleccionado)}`
            : `Ingreso registrado: ${formatearNombreSocio(seleccionado)}`,
      });
    } catch (e) {
      setAviso({ tipo: 'error', texto: e instanceof Error ? e.message : 'No se pudo registrar' });
    } finally {
      setRegistrando(false);
    }
  }

  async function checkInRapido(socio: SocioEstado) {
    setRegistrandoId(socio.socio_id);
    try {
      await registrarAsistencia(socio.socio_id);
      await cargarIngresosHoy();
      setAviso({ tipo: 'ok', texto: `Ingreso registrado: ${formatearNombreSocio(socio)}` });
    } catch (e) {
      setAviso({ tipo: 'error', texto: e instanceof Error ? e.message : 'No se pudo registrar' });
    } finally {
      setRegistrandoId(null);
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

  const idsAsistieronHoy = useMemo(
    () => new Set(ingresosHoy.map((i) => i.socio_id)),
    [ingresosHoy]
  );

  // Métricas gráficas de hoy
  const metricasHoy = useMemo(() => {
    const total = ingresosHoy.length;
    const verdes = ingresosHoy.filter((i) => i.semaforo === 'VERDE').length;
    const ambar = ingresosHoy.filter((i) => i.semaforo === 'AMBAR').length;
    const rojos = ingresosHoy.filter((i) => i.semaforo === 'ROJO').length;
    const pctVerde = total > 0 ? Math.round((verdes / total) * 100) : 100;
    const pctAmbar = total > 0 ? Math.round((ambar / total) * 100) : 0;
    const pctRojo = total > 0 ? Math.max(0, 100 - pctVerde - pctAmbar) : 0;

    const conteoPorFranja = FRANJAS_HORARIAS.map((f) => {
      const cant = ingresosHoy.filter((i) => {
        const h = obtenerHoraLimaNumero(i.hora);
        return h >= f.h && h < f.h + 2;
      }).length;
      return { ...f, cant };
    });
    const maxReal = Math.max(0, ...conteoPorFranja.map((c) => c.cant));
    const escalaMax = maxReal <= 4 ? 4 : Math.ceil(maxReal / 4) * 4;

    return {
      total,
      verdes,
      ambar,
      rojos,
      pctVerde,
      pctAmbar,
      pctRojo,
      conteoPorFranja,
      escalaMax,
    };
  }, [ingresosHoy]);

  const hayTurno = turnoActual !== null && turnoActual !== undefined;

  return (
    <div className="panel-fade-in space-y-6">
      {/* Encabezado y Acciones */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line/70 pb-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">
            Control de acceso y atención
          </p>
          <h1 className="mt-1 font-display text-4xl tracking-wide sm:text-5xl">RECEPCIÓN</h1>
        </div>

        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:items-center sm:gap-2.5">
          <Link href="/caja" className="btn btn-ghost !min-h-10 text-xs">
            <Wallet size={15} strokeWidth={1.75} />
            Ir a Caja y ventas
          </Link>
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

      {/* Buscador principal */}
      <section
        aria-label="Buscador de socios"
        className="rounded-lg border-2 border-brand/55 bg-surface-2/40 p-5 transition-colors focus-within:border-brand"
      >
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand">
            Buscar socio
          </p>
          <span className="text-xs text-muted">
            Paso 1: Busca por DNI, primer nombre o apellido antes de crear uno nuevo
          </span>
        </div>
        <SearchBar
          key={searchReset}
          onSearch={buscar}
          buscando={buscando}
          size="lg"
          variant="hero"
          autoFocus
          placeholder="Escribe el DNI, nombre o apellido..."
        />
      </section>

      <ToastBanner aviso={aviso} onClose={() => setAviso(null)} />

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
          onEditarDatos={() => setModalSocio('editar')}
          onEditarMembresia={() => {
            if (seleccionado.membresia_id) setEditandoMembresiaId(seleccionado.membresia_id);
          }}
          onLimpiar={() => {
            setSeleccionado(null);
            setAsistenciasSocio([]);
            if (resultados.length <= 1) {
              setTermino('');
              setResultados([]);
              setAviso(null);
              setSearchReset((k) => k + 1);
            }
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
            <span className="text-[11px] text-muted">
              Selecciona un socio para abrir su ficha o registra su ingreso directo
            </span>
          </div>
          <ul className="divide-y divide-line" aria-label="Resultados">
            {resultados.map((s) => {
              const b = BADGE_ESTADO[s.semaforo];
              const ini = `${s.nombres?.[0] ?? ''}${s.apellidos?.[0] ?? ''}`.toUpperCase();
              const asistioHoy = idsAsistieronHoy.has(s.socio_id);
              return (
                <li
                  key={s.socio_id}
                  className="flex flex-col justify-between gap-2.5 px-4 py-3 transition-colors hover:bg-surface-2/60 sm:flex-row sm:items-center sm:gap-4"
                >
                  <button
                    type="button"
                    onClick={() => void seleccionarSocioConAsistencias(s)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-surface-2 font-display text-sm font-bold text-bone ring-1 ring-line">
                      {ini}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-bone">
                        {formatearNombreSocio(s)}
                      </p>
                      <p className="mt-0.5 text-xs text-muted">
                        <span className="font-mono text-bone">DNI {s.dni}</span>
                        {estadoDatosSocio(s).dniProvisional && (
                          <span className="ml-1.5 rounded bg-warn/15 px-1.5 py-0.5 text-[10px] font-semibold text-warn">
                            Provisional
                          </span>
                        )}
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
                  </button>
                  <div className="flex w-full shrink-0 flex-wrap items-center justify-end gap-2 sm:w-auto">
                    {s.saldo_pendiente > 0 && (
                      <span className="rounded bg-bad/15 px-2 py-0.5 font-mono text-[11px] font-semibold text-bad">
                        Saldo {soles(s.saldo_pendiente)}
                      </span>
                    )}
                    <span className={`rounded px-2.5 py-0.5 text-xs font-semibold ${b.cls}`}>
                      {b.txt}
                    </span>
                    {s.semaforo !== 'ROJO' &&
                      (asistioHoy ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-ok/15 px-2.5 py-1 text-xs font-semibold text-ok ring-1 ring-ok/30">
                          <Check size={12} strokeWidth={2.5} />
                          Hoy
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={registrandoId === s.socio_id}
                          onClick={() => void checkInRapido(s)}
                          className="btn btn-enter !min-h-8 !px-3 text-xs"
                        >
                          <LogIn size={13} strokeWidth={2} />
                          {registrandoId === s.socio_id ? 'Registrando...' : 'Ingresar'}
                        </button>
                      ))}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {!buscando && termino.length >= 2 && resultados.length === 0 && (
        <div className="panel-card panel-fade-in px-6 py-8 text-center">
          <p className="text-sm font-medium text-bone">No se encontró ningún socio con “{termino}”.</p>
          <p className="mt-1 text-xs text-muted">
            Si el socio ya entrenaba antes, intenta buscando solo su primer nombre o un solo apellido para evitar duplicados.
          </p>
          <button
            type="button"
            onClick={() => setModalSocio('nuevo')}
            className="btn btn-primary mt-4"
          >
            <UserPlus size={16} strokeWidth={1.75} />
            Registrar nuevo socio
          </button>
        </div>
      )}

      {/* Cinta de KPIs en vivo de Recepción */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="panel-card flex items-center justify-between gap-4 p-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
              Asistencias de hoy
            </p>
            <div className="mt-1 flex items-baseline gap-2">
              <p className="font-mono text-2xl font-bold text-bone tabular-nums sm:text-3xl">
                {metricasHoy.total}
              </p>
              <span className="text-xs text-muted">socios registrados hoy</span>
            </div>
          </div>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-ok/15 text-ok ring-1 ring-ok/30">
            <Activity size={20} strokeWidth={1.75} />
          </div>
        </div>

        <div className="panel-card flex flex-col justify-between p-5">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
              Estado de asistencias
            </span>
            <span className="font-mono text-xs font-semibold text-bone tabular-nums">
              {metricasHoy.verdes} al día · {metricasHoy.ambar} con aviso
              {metricasHoy.rojos > 0 ? ` · ${metricasHoy.rojos} tolerancia` : ''}
            </span>
          </div>
          <div className="mt-3 flex h-2 w-full overflow-hidden rounded-full bg-surface-2">
            <div
              className="bar-fill h-full bg-ok"
              style={{ width: `${metricasHoy.pctVerde}%` }}
            />
            <div
              className="bar-fill h-full bg-warn"
              style={{ width: `${metricasHoy.pctAmbar}%` }}
            />
            {metricasHoy.rojos > 0 && (
              <div
                className="bar-fill h-full bg-bad"
                style={{ width: `${metricasHoy.pctRojo}%` }}
              />
            )}
          </div>
          <div className="mt-2 flex flex-wrap justify-between gap-2 text-[11px] text-muted">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-ok" /> Al día ({metricasHoy.pctVerde}%)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-warn" /> Por vencer o con saldo
            </span>
            {metricasHoy.rojos > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-bad" /> Tolerancia
              </span>
            )}
          </div>
        </div>

        <div className="panel-card flex items-center justify-between gap-3 p-5">
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

      {/* Panel inferior: Actividad de hoy en vivo + Flujo por franja horaria */}
      <div className="grid gap-5 lg:grid-cols-12">
        {/* Feed de últimos ingresos de hoy */}
        <section className="panel-card flex flex-col justify-between p-5 lg:col-span-7">
          <div>
            <div className="flex items-center justify-between gap-2 border-b border-line/70 pb-3">
              <div className="flex items-center gap-2">
                <Clock size={15} className="text-brand" strokeWidth={1.75} />
                <h2 className="text-sm font-semibold text-bone">Accesos registrados hoy</h2>
              </div>
              <span className="rounded-full bg-surface-2 px-2.5 py-0.5 font-mono text-[11px] text-muted">
                {ingresosHoy.length} {ingresosHoy.length === 1 ? 'registro' : 'registros'}
              </span>
            </div>

            {ingresosHoy.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-xs text-muted">
                  Aún no hay asistencias registradas hoy.
                </p>
              </div>
            ) : (
              <ul className="mt-3 max-h-[290px] divide-y divide-line/60 overflow-y-auto pr-1">
                {ingresosHoy.slice(0, 30).map((ing) => {
                  const b = BADGE_ESTADO[ing.semaforo];
                  const nombreCompleto = ing.socios
                    ? formatearNombreSocio(ing.socios)
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
            Selecciona un socio para ver su ficha.
          </p>
        </section>

        {/* Gráfico de barras: Flujo horario de hoy */}
        <section className="panel-card flex flex-col justify-between p-5 lg:col-span-5">
          <div>
            <div className="flex items-center justify-between gap-2 border-b border-line/70 pb-3">
              <div className="flex items-center gap-2">
                <BarChart2 size={15} className="text-brand" strokeWidth={1.75} />
                <h2 className="text-sm font-semibold text-bone">Afluencia por horario</h2>
              </div>
              <span className="text-[11px] text-muted">6:00 – 22:00</span>
            </div>

            <div className="mt-5 flex items-start gap-2 pt-3">
              {/* Eje Y discreto */}
              <div
                aria-hidden="true"
                className="mt-9 flex h-28 w-5 shrink-0 flex-col justify-between text-right font-mono text-[9px] leading-none text-muted/70 tabular-nums"
              >
                <span>{metricasHoy.escalaMax}</span>
                <span>{Math.round(metricasHoy.escalaMax / 2)}</span>
                <span>0</span>
              </div>

              <div className="relative flex flex-1 items-end justify-between gap-1 sm:gap-2">
                {/* Líneas guía horizontales muy tenues */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 top-9 flex h-28 flex-col justify-between"
                >
                  <span className="border-t border-dashed border-line/45" />
                  <span className="border-t border-dashed border-line/45" />
                  <span className="border-t border-dashed border-line/45" />
                </div>

                {metricasHoy.conteoPorFranja.map((f) => {
                  const esAhora =
                    horaActualLima !== null && horaActualLima >= f.h && horaActualLima < f.h + 2;
                  const alturaPct =
                    f.cant === 0
                      ? 5
                      : Math.max(10, Math.round((f.cant / metricasHoy.escalaMax) * 100));
                  return (
                    <div
                      key={f.h}
                      className="group relative z-10 flex min-w-0 flex-1 flex-col items-center gap-1"
                      title={`${f.label}${esAhora ? ' (Ahora)' : ''}: ${f.cant} ingresos`}
                    >
                      <div className="flex h-8 flex-col items-center justify-end gap-0.5 leading-none">
                        {esAhora && (
                          <span className="rounded border border-brand/40 bg-brand/15 px-1 py-0.5 text-[8px] font-bold uppercase tracking-wider text-brand">
                            Ahora
                          </span>
                        )}
                        {f.cant > 0 && (
                          <span className="font-mono text-[10px] font-bold text-bone opacity-85 tabular-nums">
                            {f.cant}
                          </span>
                        )}
                      </div>
                      <div
                        className={`flex h-28 w-full items-end justify-center rounded-t p-0.5 transition-colors ${
                          esAhora
                            ? 'border border-brand/55 bg-brand/5 ring-1 ring-brand/15'
                            : 'bg-surface-2/60'
                        }`}
                      >
                        <div
                          className={`w-full rounded-t transition-all duration-500 ${
                            f.cant > 0
                              ? 'bg-gradient-to-t from-brand/60 to-brand group-hover:brightness-110'
                              : esAhora
                              ? 'bg-brand/35'
                              : 'bg-line/40'
                          }`}
                          style={{ height: `${alturaPct}%` }}
                        />
                      </div>
                      <span
                        className={`font-mono text-[9px] tabular-nums sm:text-[10px] ${
                          esAhora ? 'font-bold text-brand' : 'text-muted'
                        }`}
                      >
                        {f.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <p className="mt-3 border-t border-line/50 pt-2.5 text-[11px] text-muted">
            Distribución de asistencias registradas durante el día.
          </p>
        </section>
      </div>

      {modalSocio && gymId && perfil && (
        <MemberFormModal
          gymId={gymId}
          userId={perfil.id}
          hayTurno={hayTurno}
          permitirIngresoHoy
          socioEditar={modalSocio === 'editar' ? seleccionado : null}
          onClose={() => setModalSocio(null)}
          onSaved={async (dniGuardado, esNuevo, resultado) => {
            const editado = seleccionado;
            setModalSocio(null);
            if (!esNuevo && editado) {
              setAviso({ tipo: 'ok', texto: 'Datos del socio actualizados.' });
              try {
                const fresco = await obtenerSocioEstadoPorId(editado.socio_id);
                if (fresco) {
                  setSeleccionado(fresco);
                  setResultados((rs) =>
                    rs.map((r) => (r.socio_id === fresco.socio_id ? fresco : r))
                  );
                  setIngresosHoy((lista) =>
                    lista.map((ing) =>
                      ing.socio_id === fresco.socio_id
                        ? {
                            ...ing,
                            socios: {
                              dni: fresco.dni,
                              nombres: fresco.nombres,
                              apellidos: fresco.apellidos,
                            },
                          }
                        : ing
                    )
                  );
                }
              } catch {
                const [fallback] = await buscarSocios(gymId, dniGuardado);
                if (fallback) setSeleccionado(fallback);
              }
              return;
            }
            const r = await buscarSocios(gymId, dniGuardado);
            setResultados(r);
            if (r[0]) {
              await seleccionarSocioConAsistencias(r[0]);
            }
            if (resultado?.ingresoRegistrado) {
              await cargarIngresosHoy();
              setYaIngreso(true);
            }
            setAviso({
              tipo: 'ok',
              texto: resultado?.mensaje ?? 'Socio registrado correctamente.',
            });
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

      {editandoMembresiaId && seleccionado && gymId && (
        <EditMembershipModal
          gymId={gymId}
          socioNombre={formatearNombreSocio(seleccionado)}
          membresiaId={editandoMembresiaId}
          onClose={() => setEditandoMembresiaId(null)}
          onSaved={async (msg) => {
            const socioId = seleccionado.socio_id;
            setEditandoMembresiaId(null);
            setAviso({ tipo: 'ok', texto: msg });
            try {
              const actualizado = await obtenerSocioEstadoPorId(socioId);
              if (actualizado) {
                await seleccionarSocioConAsistencias(actualizado);
                setResultados((rs) =>
                  rs.map((r) => (r.socio_id === actualizado.socio_id ? actualizado : r))
                );
              }
            } catch {
              // silencioso
            }
          }}
        />
      )}
    </div>
  );
}
