'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Edit2,
  Loader2,
  MessageCircle,
  Plus,
  Save,
  Search,
  Trash2,
  Trophy,
  UserCheck,
  UserPlus,
  X,
  XCircle,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabase';
import { hoyLima } from '@/lib/formato';
import { buscarSocios, listarPlanes } from '@/services/sociosService';
import { turnoAbierto } from '@/services/cajaService';
import { MemberFormModal } from '@/components/MemberFormModal';
import { QuickPaymentModal } from '@/components/QuickPaymentModal';
import type { EstadoLead, LeadInteresado } from '@/app/api/leads/route';
import type { Plan, SocioEstado } from '@/types';

type FiltroProspectos =
  | 'activos'
  | 'nuevos'
  | 'contactados'
  | 'agendados'
  | 'inscritos'
  | 'descartados'
  | 'todos';

const ORIGENES = ['Presencial', 'WhatsApp', 'Instagram', 'Referido', 'Web'] as const;
const HORARIOS = ['Mañana', 'Tarde', 'Noche', 'Por definir'] as const;

async function obtenerToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? '';
}

function limpiarTelefonoWa(tel: string): string {
  const digitos = tel.replace(/\D/g, '');
  if (digitos.startsWith('51') && digitos.length >= 11) return digitos;
  return `51${digitos}`;
}

function formatearFechaHora(iso: string): string {
  try {
    return new Date(iso).toLocaleString('es-PE', {
      timeZone: 'America/Lima',
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

function separarNombre(nombreCompleto: string): { nombres: string; apellidos: string } {
  const partes = nombreCompleto.trim().split(/\s+/).filter(Boolean);
  if (partes.length <= 1) {
    return { nombres: partes[0] ?? '', apellidos: '' };
  }
  if (partes.length === 2) {
    return { nombres: partes[0], apellidos: partes[1] };
  }
  return {
    nombres: partes.slice(0, -2).join(' '),
    apellidos: partes.slice(-2).join(' '),
  };
}

function estadoEfectivo(l: LeadInteresado): EstadoLead {
  return l.estado ?? (l.contactado ? 'CONTACTADO' : 'NUEVO');
}

const ORDEN_ACTIVOS: Record<EstadoLead, number> = {
  NUEVO: 0,
  AGENDADO: 1,
  CONTACTADO: 2,
  INSCRITO: 3,
  DESCARTADO: 4,
};

const BADGE_ESTADO: Record<EstadoLead, { cls: string; txt: string }> = {
  NUEVO: {
    cls: 'bg-warn/15 text-warn border-warn/30',
    txt: 'Nuevo prospecto',
  },
  CONTACTADO: {
    cls: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    txt: 'Contactado',
  },
  AGENDADO: {
    cls: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    txt: 'Agendó visita',
  },
  INSCRITO: {
    cls: 'bg-ok/15 text-ok border-ok/30',
    txt: 'Inscrito / Socio',
  },
  DESCARTADO: {
    cls: 'bg-surface-2 text-muted border-line/60',
    txt: 'Descartado',
  },
};

interface Props {
  gymId?: string;
  userId?: string;
}

export function LeadsPanel({ gymId, userId }: Props) {
  const [leads, setLeads] = useState<LeadInteresado[]>([]);
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [hayTurno, setHayTurno] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [procesandoId, setProcesandoId] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<FiltroProspectos>('activos');
  const [busqueda, setBusqueda] = useState('');
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  // Edición de notas
  const [editandoNotaId, setEditandoNotaId] = useState<string | null>(null);
  const [textoNota, setTextoNota] = useState('');

  // Confirmación de eliminación
  const [confirmarBorrarId, setConfirmarBorrarId] = useState<string | null>(null);

  // Modal nuevo prospecto manual
  const [modalNuevo, setModalNuevo] = useState(false);
  const [nNombre, setNNombre] = useState('');
  const [nTelefono, setNTelefono] = useState('');
  const [nOrigen, setNOrigen] = useState<string>('Presencial');
  const [nObjetivo, setNObjetivo] = useState('Consulta general');
  const [nHorario, setNHorario] = useState<string>('Tarde');
  const [nEstado, setNEstado] = useState<EstadoLead>('NUEVO');
  const [nNotas, setNNotas] = useState('');
  const [guardandoNuevo, setGuardandoNuevo] = useState(false);
  const [errorNuevo, setErrorNuevo] = useState<string | null>(null);

  // Conversión directa a Socio + Membresía
  const [leadAConvertir, setLeadAConvertir] = useState<LeadInteresado | null>(null);
  const [socioRecienCreado, setSocioRecienCreado] = useState<SocioEstado | null>(null);

  useEffect(() => {
    let cancelado = false;
    obtenerToken()
      .then((token) =>
        token
          ? fetch('/api/leads', {
              headers: { Authorization: `Bearer ${token}` },
            }).then((r) => r.json())
          : null
      )
      .then((data) => {
        if (!cancelado && data && Array.isArray(data.leads)) {
          setLeads(data.leads);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelado) setCargando(false);
      });

    if (gymId) {
      Promise.all([listarPlanes(gymId), turnoAbierto(gymId)])
        .then(([pl, t]) => {
          if (cancelado) return;
          setPlanes(pl);
          if (pl[0]) setNObjetivo(pl[0].nombre);
          setHayTurno(t !== null);
        })
        .catch(() => {});
    }

    return () => {
      cancelado = true;
    };
  }, [gymId]);

  const actualizarLead = useCallback(
    async (
      id: string,
      cambios: { estado?: EstadoLead; contactado?: boolean; notas?: string; eliminar?: boolean }
    ) => {
      setProcesandoId(id);
      setAviso(null);
      try {
        const token = await obtenerToken();
        const res = await fetch('/api/leads', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ id, ...cambios }),
        });
        const data = await res.json();
        if (res.ok && Array.isArray(data.leads)) {
          setLeads(data.leads);
          if (cambios.notas !== undefined) setEditandoNotaId(null);
          if (cambios.eliminar) setConfirmarBorrarId(null);
        } else {
          setAviso({ tipo: 'error', texto: data.error ?? 'No se pudo actualizar el prospecto' });
        }
      } catch {
        setAviso({ tipo: 'error', texto: 'Error de conexión al actualizar prospecto' });
      } finally {
        setProcesandoId(null);
      }
    },
    []
  );

  async function crearProspectoManual(e: FormEvent) {
    e.preventDefault();
    setErrorNuevo(null);
    setGuardandoNuevo(true);
    try {
      const token = await obtenerToken();
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          nombre: nNombre,
          telefono: nTelefono,
          origen: nOrigen,
          objetivo: nObjetivo,
          horario: nHorario,
          estado: nEstado,
          notas: nNotas,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorNuevo(data.error ?? 'No se pudo registrar el prospecto');
      } else {
        if (Array.isArray(data.leads)) setLeads(data.leads);
        setModalNuevo(false);
        setNNombre('');
        setNTelefono('');
        setNNotas('');
        setNEstado('NUEVO');
        setAviso({ tipo: 'ok', texto: `Prospecto "${nNombre.trim()}" registrado en el embudo` });
      }
    } catch {
      setErrorNuevo('Error de conexión al guardar prospecto');
    } finally {
      setGuardandoNuevo(false);
    }
  }

  function exportarExcel() {
    const filas = leads.map((l) => ({
      Nombre: l.nombre,
      'Teléfono / WA': l.telefono,
      Origen: l.origen ?? 'Web',
      'Plan / Interés': l.objetivo,
      'Turno preferido': l.horario,
      Estado: BADGE_ESTADO[estadoEfectivo(l)].txt,
      Notas: l.notas ?? '',
      Registrado: formatearFechaHora(l.creado_at),
      Contactado: l.contactado_at ? formatearFechaHora(l.contactado_at) : 'Pendiente',
    }));
    const hoja = XLSX.utils.json_to_sheet(filas);
    hoja['!cols'] = [
      { wch: 24 },
      { wch: 15 },
      { wch: 13 },
      { wch: 20 },
      { wch: 15 },
      { wch: 18 },
      { wch: 32 },
      { wch: 16 },
      { wch: 16 },
    ];
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, 'Prospectos');
    XLSX.writeFile(libro, `Zentra_Fitness_Prospectos_${hoyLima()}.xlsx`);
    setAviso({ tipo: 'ok', texto: `Exportados ${filas.length} prospectos a Excel` });
  }

  const conteos = useMemo(() => {
    let nuevos = 0;
    let contactados = 0;
    let agendados = 0;
    let inscritos = 0;
    let descartados = 0;
    for (const l of leads) {
      const est = estadoEfectivo(l);
      if (est === 'NUEVO') nuevos += 1;
      else if (est === 'CONTACTADO') contactados += 1;
      else if (est === 'AGENDADO') agendados += 1;
      else if (est === 'INSCRITO') inscritos += 1;
      else if (est === 'DESCARTADO') descartados += 1;
    }
    const activos = nuevos + contactados + agendados;
    const validos = leads.length - descartados;
    const conversion = validos > 0 ? Math.round((inscritos / validos) * 100) : 0;
    return {
      nuevos,
      contactados,
      agendados,
      seguimiento: contactados + agendados,
      activos,
      inscritos,
      descartados,
      validos,
      conversion,
    };
  }, [leads]);

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const filtrados = leads.filter((l) => {
      const est = estadoEfectivo(l);
      if (filtro === 'activos' && (est === 'INSCRITO' || est === 'DESCARTADO')) return false;
      if (filtro === 'nuevos' && est !== 'NUEVO') return false;
      if (filtro === 'contactados' && est !== 'CONTACTADO') return false;
      if (filtro === 'agendados' && est !== 'AGENDADO') return false;
      if (filtro === 'inscritos' && est !== 'INSCRITO') return false;
      if (filtro === 'descartados' && est !== 'DESCARTADO') return false;

      if (!q) return true;
      return (
        l.nombre.toLowerCase().includes(q) ||
        l.telefono.toLowerCase().includes(q) ||
        l.objetivo.toLowerCase().includes(q) ||
        l.horario.toLowerCase().includes(q) ||
        (l.origen ?? 'web').toLowerCase().includes(q) ||
        (l.notas ?? '').toLowerCase().includes(q)
      );
    });

    if (filtro === 'activos') {
      return [...filtrados].sort(
        (a, b) => ORDEN_ACTIVOS[estadoEfectivo(a)] - ORDEN_ACTIVOS[estadoEfectivo(b)]
      );
    }
    return filtrados;
  }, [leads, filtro, busqueda]);

  return (
    <div className="space-y-8">
      {/* Cabecera */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl sm:text-5xl">Prospectos</h1>
          <p className="mt-1 text-xs text-muted">
            Embudo de interesados desde la web, redes sociales y mostrador.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {leads.length > 0 && (
            <button type="button" onClick={exportarExcel} className="btn btn-ghost !min-h-10">
              <Download size={15} strokeWidth={1.5} />
              Exportar Excel
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setErrorNuevo(null);
              setModalNuevo(true);
            }}
            className="btn btn-primary !min-h-10"
          >
            <Plus size={16} strokeWidth={1.5} />
            Registrar prospecto
          </button>
        </div>
      </div>

      {/* KPIs del embudo */}
      <section aria-label="Resumen de embudo" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <button
          type="button"
          onClick={() => setFiltro('nuevos')}
          className={`border p-4 text-left transition-colors ${
            conteos.nuevos > 0
              ? 'border-warn/40 bg-warn/5 hover:bg-warn/10'
              : 'border-line bg-surface hover:bg-surface-2'
          }`}
        >
          <p className="flex items-center justify-between text-xs uppercase tracking-wider text-muted">
            Por atender (Nuevos)
            <Clock size={14} className={conteos.nuevos > 0 ? 'text-warn' : 'text-muted'} />
          </p>
          <p className="mt-1 font-display text-3xl text-bone tabular-nums">{conteos.nuevos}</p>
          <p className="mt-0.5 text-[11px] text-muted">Clic para ver pendientes de primer contacto</p>
        </button>

        <button
          type="button"
          onClick={() => setFiltro('activos')}
          className="border border-line bg-surface p-4 text-left transition-colors hover:bg-surface-2"
        >
          <p className="flex items-center justify-between text-xs uppercase tracking-wider text-muted">
            En seguimiento
            <Calendar size={14} className="text-purple-400" />
          </p>
          <p className="mt-1 font-display text-3xl text-bone tabular-nums">{conteos.seguimiento}</p>
          <p className="mt-0.5 text-[11px] text-muted">
            {conteos.contactados} contactados · {conteos.agendados} con visita agendada
          </p>
        </button>

        <button
          type="button"
          onClick={() => setFiltro('inscritos')}
          className="border border-line bg-surface p-4 text-left transition-colors hover:bg-surface-2"
        >
          <p className="flex items-center justify-between text-xs uppercase tracking-wider text-muted">
            Inscritos
            <Trophy size={14} className="text-ok" />
          </p>
          <p className="mt-1 font-display text-3xl text-ok tabular-nums">{conteos.inscritos}</p>
          <p className="mt-0.5 text-[11px] text-muted">Prospectos cerrados como socios</p>
        </button>

        <div className="border border-line bg-surface p-4">
          <p className="flex items-center justify-between text-xs uppercase tracking-wider text-muted">
            Conversión
            <UserCheck size={14} className="text-brand" />
          </p>
          <p className="mt-1 font-display text-3xl text-brand tabular-nums">{conteos.conversion}%</p>
          <p className="mt-0.5 text-[11px] text-muted">
            {conteos.inscritos} de {conteos.validos} prospectos activos/cerrados
          </p>
        </div>
      </section>

      {aviso && (
        <p
          role={aviso.tipo === 'error' ? 'alert' : 'status'}
          className={`flex items-center gap-2 border-l-2 px-3 py-2 text-sm ${
            aviso.tipo === 'ok' ? 'border-ok bg-ok/10 text-ok' : 'border-bad bg-bad/10 text-bad'
          }`}
        >
          {aviso.tipo === 'ok' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
          {aviso.texto}
        </p>
      )}

      {/* Buscador y filtros */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-sm">
          <Search
            size={16}
            strokeWidth={1.5}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, teléfono, plan o nota..."
            className="field !pl-9 !min-h-10"
          />
        </div>

        <div className="flex flex-wrap gap-1.5 text-xs" role="group" aria-label="Filtrar por etapa">
          {(
            [
              ['activos', `En proceso (${conteos.activos})`],
              ['nuevos', `Nuevos (${conteos.nuevos})`],
              ['contactados', `Contactados (${conteos.contactados})`],
              ['agendados', `Agendados (${conteos.agendados})`],
              ['inscritos', `Inscritos (${conteos.inscritos})`],
              ['descartados', `Descartados (${conteos.descartados})`],
              ['todos', `Todos (${leads.length})`],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setFiltro(id)}
              aria-pressed={filtro === id}
              className={`rounded-xs px-3 py-1.5 font-medium transition-colors ${
                filtro === id
                  ? 'bg-bone text-ink'
                  : 'bg-surface text-muted hover:text-bone'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de prospectos */}
      <div className="border border-line bg-surface">
        {cargando ? (
          <div className="flex justify-center py-12 text-muted">
            <Loader2 size={20} strokeWidth={1.5} className="animate-spin" />
          </div>
        ) : visibles.length === 0 ? (
          <div className="px-4 py-12 text-center space-y-3">
            <p className="text-sm text-muted">
              {busqueda
                ? `No hay prospectos que coincidan con "${busqueda}".`
                : filtro === 'activos'
                ? 'No tienes prospectos activos en seguimiento.'
                : 'No hay prospectos en esta etapa.'}
            </p>
            {!busqueda && (
              <button
                type="button"
                onClick={() => setModalNuevo(true)}
                className="btn btn-secondary !min-h-9 text-xs"
              >
                <Plus size={14} /> Registrar prospecto manual
              </button>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {visibles.map((l) => {
              const numWa = limpiarTelefonoWa(l.telefono);
              const estadoActual = estadoEfectivo(l);
              const badge = BADGE_ESTADO[estadoActual] ?? BADGE_ESTADO.NUEVO;
              const puedeConvertir =
                gymId && userId && estadoActual !== 'INSCRITO' && estadoActual !== 'DESCARTADO';

              let textoWa = `Hola ${l.nombre}, te escribimos de Zentra Fitness (Villa Estela). Vimos tu interés en ${l.objetivo} para entrenar en el turno ${l.horario}. ¿Cómo podemos ayudarte con tu inscripción?`;
              if (estadoActual === 'AGENDADO') {
                textoWa = `Hola ${l.nombre}, te saludamos de Zentra Fitness. Te recordamos tu visita agendada a nuestras instalaciones. ¿A qué hora te esperamos?`;
              } else if (estadoActual === 'INSCRITO') {
                textoWa = `¡Hola ${l.nombre}! Bienvenido a la familia Zentra Fitness. Ante cualquier consulta sobre tu plan o rutinas estamos para apoyarte. ¡A entrenar con todo!`;
              }

              return (
                <li
                  key={l.id}
                  className="flex flex-col justify-between gap-4 p-4 transition-colors hover:bg-surface-2/40 lg:flex-row lg:items-center"
                >
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-bone text-base">{l.nombre}</span>
                      <span className="font-mono text-xs text-muted">WA: {l.telefono}</span>
                      <span className="rounded-xs bg-surface-2 px-1.5 py-0.5 text-[10px] font-medium text-muted">
                        {l.origen ?? 'Web'}
                      </span>

                      <select
                        aria-label="Estado del prospecto"
                        value={estadoActual}
                        disabled={procesandoId === l.id}
                        onChange={(e) =>
                          void actualizarLead(l.id, { estado: e.target.value as EstadoLead })
                        }
                        className={`cursor-pointer rounded-xs border bg-surface px-2 py-0.5 text-[11px] font-semibold ${badge.cls}`}
                      >
                        <option value="NUEVO">🟡 Nuevo</option>
                        <option value="CONTACTADO">🔵 Contactado</option>
                        <option value="AGENDADO">🟣 Agendó visita</option>
                        <option value="INSCRITO">🟢 Inscrito / Socio</option>
                        <option value="DESCARTADO">⚪ Descartado</option>
                      </select>
                    </div>

                    <p className="text-xs text-muted">
                      Interés: <strong className="font-medium text-bone">{l.objetivo}</strong> ·
                      Turno preferido: <strong className="text-bone">{l.horario}</strong>
                    </p>

                    <p className="font-mono text-[11px] text-muted">
                      Registrado: {formatearFechaHora(l.creado_at)}
                      {l.contactado_at && (
                        <span className="ml-2 text-ok">
                          · Contactado el {formatearFechaHora(l.contactado_at)}
                        </span>
                      )}
                    </p>

                    {/* Notas rápidas */}
                    <div className="pt-1">
                      {editandoNotaId === l.id ? (
                        <div className="flex max-w-md items-center gap-1.5">
                          <input
                            type="text"
                            value={textoNota}
                            onChange={(e) => setTextoNota(e.target.value)}
                            placeholder="Ej: Viene el martes 7pm, prefiere plan trimestral..."
                            className="field flex-1 !min-h-7 !bg-surface-2 !text-xs"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => void actualizarLead(l.id, { notas: textoNota })}
                            className="btn btn-primary !min-h-7 !px-2 text-xs"
                            aria-label="Guardar nota"
                          >
                            <Save size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditandoNotaId(null)}
                            className="btn btn-ghost !min-h-7 !px-2 text-xs"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          {l.notas ? (
                            <span className="rounded-xs bg-surface-2 px-2 py-0.5 text-[11px] italic text-bone">
                              &ldquo;{l.notas}&rdquo;
                            </span>
                          ) : (
                            <span className="text-[11px] text-muted">Sin notas</span>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setEditandoNotaId(l.id);
                              setTextoNota(l.notas ?? '');
                            }}
                            className="inline-flex items-center gap-1 text-[11px] text-muted underline hover:text-bone"
                          >
                            <Edit2 size={10} />
                            {l.notas ? 'Editar nota' : 'Agregar nota'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex flex-wrap items-center gap-2 self-start lg:self-center">
                    <a
                      href={`https://wa.me/${numWa}?text=${encodeURIComponent(textoWa)}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => {
                        if (estadoActual === 'NUEVO') {
                          void actualizarLead(l.id, { estado: 'CONTACTADO', contactado: true });
                        }
                      }}
                      className="btn btn-secondary !min-h-8 !px-3 text-xs"
                    >
                      <MessageCircle size={14} strokeWidth={1.5} className="text-ok" />
                      WhatsApp
                    </a>

                    {puedeConvertir && (
                      <button
                        type="button"
                        onClick={() => setLeadAConvertir(l)}
                        className="btn btn-primary !min-h-8 !px-3 text-xs"
                        title="Registrar su DNI como socio oficial y asignarle plan"
                      >
                        <UserPlus size={14} strokeWidth={1.5} />
                        Inscribir socio
                      </button>
                    )}

                    {confirmarBorrarId === l.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={procesandoId === l.id}
                          onClick={() => void actualizarLead(l.id, { eliminar: true })}
                          className="btn !min-h-8 !px-2.5 bg-bad/20 text-bad text-xs hover:bg-bad hover:text-white"
                        >
                          Confirmar
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmarBorrarId(null)}
                          className="btn btn-ghost !min-h-8 !px-2 text-xs"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={procesandoId === l.id}
                        onClick={() => setConfirmarBorrarId(l.id)}
                        className="btn btn-ghost !min-h-8 !px-2 text-muted hover:text-bad"
                        title="Eliminar registro"
                        aria-label="Eliminar registro"
                      >
                        <Trash2 size={14} strokeWidth={1.5} />
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Modal: Registrar prospecto manual */}
      {modalNuevo && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 sm:items-center sm:p-6">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-nuevo-prospecto"
            className="w-full max-w-md border border-line bg-surface"
          >
            <header className="flex items-start justify-between border-b border-line/80 p-5">
              <div>
                <h2 id="modal-nuevo-prospecto" className="section-title text-xl">
                  Nuevo prospecto
                </h2>
                <p className="mt-0.5 text-xs text-muted">
                  Registra personas que preguntaron en recepción, WhatsApp o redes.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalNuevo(false)}
                className="btn btn-ghost !min-h-9 !px-2"
                aria-label="Cerrar"
              >
                <X size={18} strokeWidth={1.5} />
              </button>
            </header>

            <form onSubmit={crearProspectoManual} className="space-y-4 p-5">
              <div>
                <label htmlFor="pros-nombre" className="label">
                  Nombre completo *
                </label>
                <input
                  id="pros-nombre"
                  type="text"
                  required
                  autoFocus
                  placeholder="Ej: Andrea Castillo"
                  value={nNombre}
                  onChange={(e) => setNNombre(e.target.value)}
                  className="field"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="pros-tel" className="label">
                    WhatsApp / Teléfono *
                  </label>
                  <input
                    id="pros-tel"
                    type="tel"
                    required
                    placeholder="Ej: 987654321"
                    value={nTelefono}
                    onChange={(e) => setNTelefono(e.target.value)}
                    className="field tabular-nums"
                  />
                </div>
                <div>
                  <label htmlFor="pros-origen" className="label">
                    Origen
                  </label>
                  <select
                    id="pros-origen"
                    value={nOrigen}
                    onChange={(e) => setNOrigen(e.target.value)}
                    className="field"
                  >
                    {ORIGENES.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="pros-plan" className="label">
                    Plan o interés
                  </label>
                  <select
                    id="pros-plan"
                    value={nObjetivo}
                    onChange={(e) => setNObjetivo(e.target.value)}
                    className="field"
                  >
                    {planes.map((p) => (
                      <option key={p.id} value={p.nombre}>
                        {p.nombre}
                      </option>
                    ))}
                    <option value="Pase diario">Pase diario</option>
                    <option value="Consulta general">Consulta general</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="pros-horario" className="label">
                    Turno preferido
                  </label>
                  <select
                    id="pros-horario"
                    value={nHorario}
                    onChange={(e) => setNHorario(e.target.value)}
                    className="field"
                  >
                    {HORARIOS.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="pros-estado" className="label">
                  Estado inicial
                </label>
                <select
                  id="pros-estado"
                  value={nEstado}
                  onChange={(e) => setNEstado(e.target.value as EstadoLead)}
                  className="field"
                >
                  <option value="NUEVO">🟡 Nuevo (pendiente)</option>
                  <option value="CONTACTADO">🔵 Ya contactado / cotizado</option>
                  <option value="AGENDADO">🟣 Agendó visita / prueba</option>
                </select>
              </div>

              <div>
                <label htmlFor="pros-notas" className="label">
                  Nota (opcional)
                </label>
                <input
                  id="pros-notas"
                  type="text"
                  placeholder="Ej: Quiere empezar el lunes con su hermano"
                  value={nNotas}
                  onChange={(e) => setNNotas(e.target.value)}
                  className="field"
                />
              </div>

              {errorNuevo && (
                <p role="alert" className="border-l-2 border-bad bg-bad/10 px-3 py-2 text-xs text-bad">
                  {errorNuevo}
                </p>
              )}

              <div className="flex justify-end gap-2 border-t border-line/80 pt-4">
                <button type="button" onClick={() => setModalNuevo(false)} className="btn btn-ghost">
                  Cancelar
                </button>
                <button type="submit" disabled={guardandoNuevo} className="btn btn-primary !px-5">
                  {guardandoNuevo && <Loader2 size={16} className="animate-spin" />}
                  Guardar prospecto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Convertir prospecto a Socio oficial */}
      {leadAConvertir && gymId && userId && (
        <MemberFormModal
          gymId={gymId}
          userId={userId}
          valoresIniciales={{
            ...separarNombre(leadAConvertir.nombre),
            telefono: leadAConvertir.telefono,
          }}
          onClose={() => setLeadAConvertir(null)}
          onSaved={async (dniCreado) => {
            const leadId = leadAConvertir.id;
            const nombreLead = leadAConvertir.nombre;
            setLeadAConvertir(null);
            await actualizarLead(leadId, { estado: 'INSCRITO' });
            try {
              const encontrados = await buscarSocios(gymId, dniCreado);
              if (encontrados[0]) {
                setSocioRecienCreado(encontrados[0]);
              } else {
                setAviso({
                  tipo: 'ok',
                  texto: `¡${nombreLead} inscrito como socio (DNI ${dniCreado})!`,
                });
              }
            } catch {
              setAviso({
                tipo: 'ok',
                texto: `¡${nombreLead} inscrito como socio (DNI ${dniCreado})!`,
              });
            }
          }}
        />
      )}

      {/* Modal: Asignar y cobrar su primer plan tras inscribirlo */}
      {socioRecienCreado && gymId && (
        <QuickPaymentModal
          modo="renovar"
          socio={socioRecienCreado}
          gymId={gymId}
          hayTurno={hayTurno}
          onClose={() => {
            const nom = socioRecienCreado.nombres;
            setSocioRecienCreado(null);
            setAviso({
              tipo: 'ok',
              texto: `${nom} quedó registrado como socio. Puedes asignarle su plan luego desde Recepción o Socios.`,
            });
          }}
          onDone={(msg) => {
            const nom = socioRecienCreado.nombres;
            setSocioRecienCreado(null);
            setAviso({ tipo: 'ok', texto: `¡${nom} convertido a socio! ${msg}` });
          }}
        />
      )}
    </div>
  );
}
