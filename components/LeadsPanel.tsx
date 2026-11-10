'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Calendar,
  Clock,
  Edit2,
  Loader2,
  MessageCircle,
  Save,
  Trash2,
  Trophy,
  UserCheck,
  XCircle,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { EstadoLead, LeadInteresado } from '@/app/api/leads/route';

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

const BADGE_ESTADO: Record<
  EstadoLead,
  { cls: string; txt: string; icon: typeof Clock }
> = {
  NUEVO: {
    cls: 'bg-warn/15 text-warn border-warn/30',
    txt: 'Nuevo prospecto',
    icon: Clock,
  },
  CONTACTADO: {
    cls: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    txt: 'Contactado',
    icon: MessageCircle,
  },
  AGENDADO: {
    cls: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    txt: 'Agendó visita',
    icon: Calendar,
  },
  INSCRITO: {
    cls: 'bg-ok/15 text-ok border-ok/30',
    txt: 'Inscrito / Socio',
    icon: Trophy,
  },
  DESCARTADO: {
    cls: 'bg-surface-2 text-muted border-line/60',
    txt: 'Descartado',
    icon: XCircle,
  },
};

export function LeadsPanel() {
  const [leads, setLeads] = useState<LeadInteresado[]>([]);
  const [cargando, setCargando] = useState(true);
  const [procesandoId, setProcesandoId] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<'nuevos' | 'seguimiento' | 'inscritos' | 'todos'>('nuevos');

  // Estado para edición de notas
  const [editandoNotaId, setEditandoNotaId] = useState<string | null>(null);
  const [textoNota, setTextoNota] = useState('');

  useEffect(() => {
    obtenerToken()
      .then((token) =>
        token
          ? fetch('/api/leads', {
              headers: { Authorization: `Bearer ${token}` },
            }).then((r) => r.json())
          : null
      )
      .then((data) => {
        if (data && Array.isArray(data.leads)) {
          setLeads(data.leads);
        }
      })
      .catch(() => {})
      .finally(() => setCargando(false));
  }, []);

  const actualizarLead = useCallback(
    async (
      id: string,
      cambios: { estado?: EstadoLead; contactado?: boolean; notas?: string; eliminar?: boolean }
    ) => {
      setProcesandoId(id);
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
          if (cambios.notas !== undefined) {
            setEditandoNotaId(null);
          }
        }
      } catch {
        // Silencioso
      } finally {
        setProcesandoId(null);
      }
    },
    []
  );

  const conteos = {
    nuevos: leads.filter((l) => (l.estado ?? (l.contactado ? 'CONTACTADO' : 'NUEVO')) === 'NUEVO').length,
    seguimiento: leads.filter((l) => {
      const e = l.estado ?? (l.contactado ? 'CONTACTADO' : 'NUEVO');
      return e === 'CONTACTADO' || e === 'AGENDADO';
    }).length,
    inscritos: leads.filter((l) => (l.estado ?? '') === 'INSCRITO').length,
  };

  const visibles = leads.filter((l) => {
    const estado = l.estado ?? (l.contactado ? 'CONTACTADO' : 'NUEVO');
    if (filtro === 'nuevos') return estado === 'NUEVO';
    if (filtro === 'seguimiento') return estado === 'CONTACTADO' || estado === 'AGENDADO';
    if (filtro === 'inscritos') return estado === 'INSCRITO';
    return true;
  });

  return (
    <section aria-label="Interesados inscritos desde la web" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <h2 className="section-title text-lg flex items-center gap-2">
            <UserCheck size={18} className="text-brand" />
            Seguimiento de interesados (Web)
          </h2>
          {conteos.nuevos > 0 && (
            <span className="rounded-xs bg-brand px-2 py-0.5 text-xs font-semibold text-brand-ink tabular-nums">
              {conteos.nuevos} nuevos por atender
            </span>
          )}
        </div>

        {/* Filtros de embudo */}
        <div className="flex flex-wrap gap-1.5 text-xs">
          <button
            type="button"
            onClick={() => setFiltro('nuevos')}
            className={`rounded-xs px-2.5 py-1 font-medium transition-colors ${
              filtro === 'nuevos' ? 'bg-bone text-ink shadow-xs' : 'bg-surface text-muted hover:text-bone'
            }`}
          >
            Nuevos ({conteos.nuevos})
          </button>
          <button
            type="button"
            onClick={() => setFiltro('seguimiento')}
            className={`rounded-xs px-2.5 py-1 font-medium transition-colors ${
              filtro === 'seguimiento' ? 'bg-bone text-ink shadow-xs' : 'bg-surface text-muted hover:text-bone'
            }`}
          >
            En seguimiento ({conteos.seguimiento})
          </button>
          <button
            type="button"
            onClick={() => setFiltro('inscritos')}
            className={`rounded-xs px-2.5 py-1 font-medium transition-colors ${
              filtro === 'inscritos' ? 'bg-bone text-ink shadow-xs' : 'bg-surface text-muted hover:text-bone'
            }`}
          >
            Inscritos ({conteos.inscritos})
          </button>
          <button
            type="button"
            onClick={() => setFiltro('todos')}
            className={`rounded-xs px-2.5 py-1 font-medium transition-colors ${
              filtro === 'todos' ? 'bg-bone text-ink shadow-xs' : 'bg-surface text-muted hover:text-bone'
            }`}
          >
            Todos ({leads.length})
          </button>
        </div>
      </div>

      <div className="border border-line bg-surface">
        {cargando ? (
          <div className="flex justify-center py-8 text-muted">
            <Loader2 size={18} strokeWidth={1.5} className="animate-spin" />
          </div>
        ) : visibles.length === 0 ? (
          <p className="px-4 py-8 text-center text-xs text-muted">
            {filtro === 'nuevos'
              ? 'No hay nuevos interesados pendientes de respuesta.'
              : filtro === 'seguimiento'
              ? 'No hay prospectos en seguimiento actualmente.'
              : 'No se encontraron registros en esta vista.'}
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {visibles.map((l) => {
              const numWa = limpiarTelefonoWa(l.telefono);
              const estadoActual: EstadoLead = l.estado ?? (l.contactado ? 'CONTACTADO' : 'NUEVO');
              const badge = BADGE_ESTADO[estadoActual] ?? BADGE_ESTADO.NUEVO;

              // Mensaje de WhatsApp contextual
              let textoWa = `Hola ${l.nombre}, te escribimos de Zentra Fitness (Villa Estela). Vimos tu interés en el plan ${l.objetivo} para entrenar en el turno ${l.horario}. ¿Cómo podemos ayudarte con tu inscripción?`;
              if (estadoActual === 'AGENDADO') {
                textoWa = `Hola ${l.nombre}, te saludamos de Zentra Fitness. Te recordamos tu visita agendada a nuestras instalaciones. ¿A qué hora te esperamos para coordinar tu prueba?`;
              } else if (estadoActual === 'INSCRITO') {
                textoWa = `¡Hola ${l.nombre}! Bienvenido a la familia Zentra Fitness. Recuerda que ante cualquier consulta de tu plan o rutinas estamos para apoyarte. ¡A entrenar con todo!`;
              }

              return (
                <li
                  key={l.id}
                  className="flex flex-col justify-between gap-4 p-4 transition-colors hover:bg-surface-2/40 lg:flex-row lg:items-center"
                >
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-bone text-sm">{l.nombre}</span>
                      <span className="font-mono text-xs text-muted">WA: {l.telefono}</span>

                      {/* Selector de estado directo */}
                      <select
                        aria-label="Estado del prospecto"
                        value={estadoActual}
                        disabled={procesandoId === l.id}
                        onChange={(e) =>
                          void actualizarLead(l.id, { estado: e.target.value as EstadoLead })
                        }
                        className={`rounded-xs border px-2 py-0.5 text-[11px] font-semibold bg-surface cursor-pointer ${badge.cls}`}
                      >
                        <option value="NUEVO">🟡 Nuevo</option>
                        <option value="CONTACTADO">🔵 Contactado</option>
                        <option value="AGENDADO">🟣 Agendó visita</option>
                        <option value="INSCRITO">🟢 Inscrito / Socio</option>
                        <option value="DESCARTADO">⚪ Descartado</option>
                      </select>
                    </div>

                    <p className="text-xs text-muted">
                      Plan de interés: <strong className="font-medium text-bone">{l.objetivo}</strong> ·{' '}
                      Turno: <strong className="text-bone">{l.horario}</strong>
                    </p>

                    <p className="font-mono text-[11px] text-muted">
                      Registrado: {formatearFechaHora(l.creado_at)}
                      {l.contactado_at && (
                        <span className="ml-2 text-ok">· Contactado el {formatearFechaHora(l.contactado_at)}</span>
                      )}
                    </p>

                    {/* Notas rápidas del prospecto */}
                    <div className="pt-1">
                      {editandoNotaId === l.id ? (
                        <div className="flex items-center gap-1.5 max-w-md">
                          <input
                            type="text"
                            value={textoNota}
                            onChange={(e) => setTextoNota(e.target.value)}
                            placeholder="Ej: Viene el martes 7pm, prefiere Yape..."
                            className="field !min-h-7 !text-xs !bg-surface-2 flex-1"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => void actualizarLead(l.id, { notas: textoNota })}
                            className="btn btn-primary !min-h-7 !px-2 text-xs"
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
                        <div className="flex items-center gap-1.5 text-xs">
                          {l.notas ? (
                            <span className="rounded-xs bg-surface-2 px-2 py-0.5 text-bone text-[11px] italic">
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
                            className="text-muted hover:text-bone text-[11px] inline-flex items-center gap-0.5 underline"
                          >
                            <Edit2 size={10} />
                            {l.notas ? 'Editar nota' : 'Agregar nota'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

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
                      Escribir por WhatsApp
                    </a>

                    <button
                      type="button"
                      disabled={procesandoId === l.id}
                      onClick={() => void actualizarLead(l.id, { eliminar: true })}
                      className="btn btn-ghost !min-h-8 !px-2 text-muted hover:text-bad"
                      title="Descartar y borrar registro"
                      aria-label="Descartar y borrar registro"
                    >
                      <Trash2 size={14} strokeWidth={1.5} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
