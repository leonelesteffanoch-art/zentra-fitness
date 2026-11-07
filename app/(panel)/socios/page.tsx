'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Ban,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Edit3,
  Loader2,
  RefreshCw,
  Snowflake,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { SearchBar } from '@/components/SearchBar';
import { MemberFormModal } from '@/components/MemberFormModal';
import { QuickPaymentModal, type ModoCobro } from '@/components/QuickPaymentModal';
import {
  anularMembresia,
  buscarSocios,
  congelarMembresia,
  listarSociosEstado,
  membresiasDeSocio,
  type FiltroEstadoSocio,
} from '@/services/sociosService';
import { turnoAbierto } from '@/services/cajaService';
import { soles } from '@/lib/formato';
import type { MembresiaEstado, Semaforo, SocioEstado } from '@/types';

const BADGE_SEMAFORO: Record<Semaforo, { cls: string; txt: string }> = {
  VERDE: { cls: 'bg-ok/15 text-ok', txt: 'Activo' },
  AMBAR: { cls: 'bg-warn/15 text-warn', txt: 'Por vencer' },
  ROJO: { cls: 'bg-bad/15 text-bad', txt: 'Vencido' },
};

const FILTROS: { id: FiltroEstadoSocio; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'activos', label: 'Activos' },
  { id: 'por_vencer', label: 'Por vencer' },
  { id: 'vencidos', label: 'Vencidos' },
];

export default function SociosPage() {
  const { perfil } = useAuth();
  const gymId = perfil?.gym_id;
  const esAdmin = perfil?.rol === 'admin';

  const [socios, setSocios] = useState<SocioEstado[]>([]);
  const [pagina, setPagina] = useState(0);
  const [termino, setTermino] = useState('');
  const [filtro, setFiltro] = useState<FiltroEstadoSocio>('todos');
  const [cargando, setCargando] = useState(true);
  const [hayTurno, setHayTurno] = useState(false);

  const [seleccionado, setSeleccionado] = useState<SocioEstado | null>(null);
  const [historial, setHistorial] = useState<MembresiaEstado[]>([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);

  // Modales
  const [modalSocio, setModalSocio] = useState<'nuevo' | 'editar' | null>(null);
  const [modoCobro, setModoCobro] = useState<ModoCobro | null>(null);

  // Acciones sobre una membresía (congelar / anular)
  const [congelandoId, setCongelandoId] = useState<string | null>(null);
  const [diasCongelar, setDiasCongelar] = useState('3');
  const [anulandoId, setAnulandoId] = useState<string | null>(null);
  const [motivoAnular, setMotivoAnular] = useState('');
  const [procesandoAccion, setProcesandoAccion] = useState(false);

  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  const cargarListado = useCallback(
    async (term: string, pag: number, fil: FiltroEstadoSocio) => {
      if (!gymId) return;
      setCargando(true);
      try {
        const lista =
          term.length >= 2
            ? await buscarSocios(gymId, term, fil)
            : await listarSociosEstado(gymId, pag, fil);
        setSocios(lista);
      } catch (e) {
        setAviso({
          tipo: 'error',
          texto: e instanceof Error ? e.message : 'Error al cargar socios',
        });
      } finally {
        setCargando(false);
      }
    },
    [gymId]
  );

  useEffect(() => {
    if (!gymId) return;
    let cancelado = false;
    Promise.all([listarSociosEstado(gymId, 0, 'todos'), turnoAbierto(gymId)])
      .then(([lista, t]) => {
        if (cancelado) return;
        setSocios(lista);
        setHayTurno(t !== null);
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
    setCongelandoId(null);
    setAnulandoId(null);
    setCargandoHistorial(true);
    try {
      const mems = await membresiasDeSocio(socio.socio_id);
      setHistorial(mems);
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
    await cargarListado(termino, pagina, filtro);
    if (actualizado) {
      await cargarFicha(actualizado);
    }
  }

  async function handleCongelar(membresiaId: string) {
    const dias = Number(diasCongelar);
    if (!Number.isInteger(dias) || dias <= 0) {
      setAviso({ tipo: 'error', texto: 'Ingresa una cantidad de días válida' });
      return;
    }
    setProcesandoAccion(true);
    setAviso(null);
    try {
      const nuevaFecha = await congelarMembresia(membresiaId, dias);
      setCongelandoId(null);
      setAviso({
        tipo: 'ok',
        texto: `Membresía congelada +${dias} días. Nueva fecha fin: ${nuevaFecha}`,
      });
      if (seleccionado) await refrescarSeleccionado(seleccionado.dni);
    } catch (e) {
      setAviso({
        tipo: 'error',
        texto: e instanceof Error ? e.message : 'No se pudo congelar la membresía',
      });
    } finally {
      setProcesandoAccion(false);
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

  const hayMasDeUnaPagina = termino.length < 2 && (pagina > 0 || socios.length === 20);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Cabecera */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-4xl sm:text-5xl">Socios</h1>
        <button
          type="button"
          onClick={() => setModalSocio('nuevo')}
          className="btn btn-secondary"
        >
          <UserPlus size={16} strokeWidth={1.5} />
          Nuevo socio
        </button>
      </div>

      {/* Buscador + Chips de filtro rápido */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full sm:max-w-md">
          <SearchBar
            onSearch={handleSearch}
            buscando={cargando}
            placeholder="Buscar por DNI, nombres o apellidos..."
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
                className={`rounded-xs px-3 py-1.5 text-xs font-medium transition-colors ${
                  activo
                    ? 'bg-bone text-ink'
                    : 'bg-surface text-muted hover:bg-surface-2 hover:text-bone'
                }`}
              >
                {f.label}
              </button>
            );
          })}
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

      {/* Grilla: Listado a la izquierda + Ficha del socio a la derecha */}
      <div className="grid items-start gap-8 lg:grid-cols-[1.2fr_1fr]">
        {/* Columna izquierda: Tabla de socios */}
        <section aria-label="Listado de socios" className="space-y-3">
          <div className="overflow-x-auto border border-line bg-surface">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="border-b border-line bg-surface-2 text-xs font-medium text-muted">
                <tr>
                  <th className="px-4 py-2.5">Socio</th>
                  <th className="px-4 py-2.5">DNI</th>
                  <th className="px-4 py-2.5">Plan / Vence</th>
                  <th className="px-4 py-2.5 text-right">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {socios.length === 0 && !cargando ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-muted">
                      No hay socios con ese criterio.
                    </td>
                  </tr>
                ) : (
                  socios.map((s) => {
                    const activo = seleccionado?.socio_id === s.socio_id;
                    const badge = BADGE_SEMAFORO[s.semaforo];
                    return (
                      <tr
                        key={s.socio_id}
                        onClick={() => cargarFicha(s)}
                        className={`cursor-pointer transition-colors ${
                          activo ? 'bg-surface-2' : 'hover:bg-surface-2/60'
                        }`}
                      >
                        <td className="px-4 py-3 font-medium text-bone">
                          {s.apellidos}, {s.nombres}
                          {s.saldo_pendiente > 0 && (
                            <span className="ml-2 text-xs text-warn tabular-nums">
                              (Debe {soles(s.saldo_pendiente)})
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-muted">{s.dni}</td>
                        <td className="px-4 py-3 text-xs">
                          {s.plan ? (
                            <>
                              <span className="font-medium text-bone">{s.plan}</span>
                              <span className="block font-mono text-muted">{s.fecha_fin}</span>
                            </>
                          ) : (
                            <span className="text-muted">Sin membresía</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span
                            className={`inline-block rounded-xs px-2 py-0.5 text-xs font-semibold ${badge.cls}`}
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

          {/* Paginación visible solo si hay más de una página */}
          {hayMasDeUnaPagina && (
            <div className="flex items-center justify-end gap-2">
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
                <ChevronLeft size={14} strokeWidth={1.5} /> Anterior
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
                Siguiente <ChevronRight size={14} strokeWidth={1.5} />
              </button>
            </div>
          )}
        </section>

        {/* Columna derecha: EmptyState o Ficha ordenada (Datos -> Membresía -> Acciones) */}
        <section aria-label="Detalle del socio" className="bg-surface p-6">
          {!seleccionado ? (
            <div className="flex flex-col items-center py-12 text-center">
              <Users size={32} strokeWidth={1.5} className="text-muted" />
              <p className="mt-3 text-sm font-medium text-bone">Ningún socio seleccionado</p>
              <p className="mt-1 max-w-xs text-xs text-muted">
                Elige un socio de la tabla para ver su ficha y membresía, o inscribe uno nuevo.
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
                      <dt className="inline">Tel / WhatsApp: </dt>
                      <dd className="inline tabular-nums text-bone">{seleccionado.telefono}</dd>
                    </div>
                  )}
                </dl>
              </div>

              {/* 3. Membresía e historial + 4. Acciones de membresía */}
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
                            <span>Total: <strong className="font-medium text-bone">{soles(m.precio_total)}</strong></span>
                            <span>Pagado: <strong className="font-medium text-ok">{soles(m.monto_pagado)}</strong></span>
                            {m.saldo_pendiente > 0 && (
                              <span className="font-semibold text-warn">
                                Saldo: {soles(m.saldo_pendiente)}
                              </span>
                            )}
                            {m.dias_congelados > 0 && (
                              <span>Congelados: {m.dias_congelados} d</span>
                            )}
                          </div>

                          {/* 4. Acciones sobre la membresía */}
                          {!anulada && (
                            <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-line/60 pt-2.5">
                              {congelandoId === m.membresia_id ? (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs text-muted">Días a congelar:</span>
                                  <input
                                    type="number"
                                    min="1"
                                    max="60"
                                    value={diasCongelar}
                                    onChange={(e) => setDiasCongelar(e.target.value)}
                                    className="field !min-h-8 !w-16 !px-2 text-xs tabular-nums"
                                  />
                                  <button
                                    type="button"
                                    disabled={procesandoAccion}
                                    onClick={() => handleCongelar(m.membresia_id)}
                                    className="btn btn-secondary !min-h-8 !px-2.5"
                                    title="Confirmar congelamiento"
                                  >
                                    <Check size={14} strokeWidth={1.5} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setCongelandoId(null)}
                                    className="btn btn-ghost !min-h-8 !px-2"
                                  >
                                    <X size={14} strokeWidth={1.5} />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCongelandoId(m.membresia_id);
                                    setAnulandoId(null);
                                  }}
                                  className="inline-flex items-center gap-1 text-xs font-medium text-bone hover:underline"
                                >
                                  <Snowflake size={13} strokeWidth={1.5} />
                                  Congelar días
                                </button>
                              )}

                              {esAdmin && (
                                <>
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
                                        setCongelandoId(null);
                                        setMotivoAnular('');
                                      }}
                                      className="inline-flex items-center gap-1 text-xs font-medium text-muted hover:text-bad"
                                    >
                                      <Ban size={13} strokeWidth={1.5} />
                                      Anular membresía
                                    </button>
                                  )}
                                </>
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
                ? 'Socio registrado. Ahora puedes asignarle su membresía.'
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
    </div>
  );
}
