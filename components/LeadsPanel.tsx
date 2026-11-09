'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, CheckCircle2, Clock, Loader2, MessageCircle, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { LeadInteresado } from '@/app/api/leads/route';

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

export function LeadsPanel() {
  const [leads, setLeads] = useState<LeadInteresado[]>([]);
  const [cargando, setCargando] = useState(true);
  const [procesandoId, setProcesandoId] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<'pendientes' | 'todos'>('pendientes');

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

  const cambiarEstado = useCallback(
    async (id: string, contactado: boolean, eliminar = false) => {
      setProcesandoId(id);
      try {
        const token = await obtenerToken();
        const res = await fetch('/api/leads', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ id, contactado, eliminar }),
        });
        const data = await res.json();
        if (res.ok && Array.isArray(data.leads)) {
          setLeads(data.leads);
        }
      } catch {
        // Silencioso
      } finally {
        setProcesandoId(null);
      }
    },
    []
  );

  const pendientesCount = leads.filter((l) => !l.contactado).length;
  const visibles =
    filtro === 'pendientes' ? leads.filter((l) => !l.contactado) : leads;

  return (
    <section aria-label="Interesados inscritos desde la web" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <h2 className="section-title text-lg">Interesados desde la web</h2>
          {pendientesCount > 0 && (
            <span className="rounded-xs bg-brand px-2 py-0.5 text-xs font-semibold text-brand-ink tabular-nums">
              {pendientesCount} por escribir
            </span>
          )}
        </div>

        <div className="flex gap-1.5 text-xs">
          <button
            type="button"
            onClick={() => setFiltro('pendientes')}
            className={`rounded-xs px-2.5 py-1 font-medium transition-colors ${
              filtro === 'pendientes'
                ? 'bg-bone text-ink'
                : 'bg-surface text-muted hover:text-bone'
            }`}
          >
            Pendientes ({pendientesCount})
          </button>
          <button
            type="button"
            onClick={() => setFiltro('todos')}
            className={`rounded-xs px-2.5 py-1 font-medium transition-colors ${
              filtro === 'todos'
                ? 'bg-bone text-ink'
                : 'bg-surface text-muted hover:text-bone'
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
            {filtro === 'pendientes'
              ? 'No hay clientes pendientes por contactar desde la página web.'
              : 'Aún no se han recibido solicitudes desde el formulario de la página principal.'}
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {visibles.map((l) => {
              const numWa = limpiarTelefonoWa(l.telefono);
              const textoWa = encodeURIComponent(
                `Hola ${l.nombre}, te escribimos de Zentra Fitness (Villa Estela). Vimos tu interés en el plan ${l.objetivo} para entrenar en el turno ${l.horario}. ¿Cómo podemos ayudarte con tu inscripción?`
              );

              return (
                <li
                  key={l.id}
                  className="flex flex-col justify-between gap-4 p-4 sm:flex-row sm:items-center"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-bone">{l.nombre}</span>
                      <span className="font-mono text-xs text-bone">{l.telefono}</span>
                      <span
                        className={`inline-flex items-center gap-1 rounded-xs px-2 py-0.5 text-[11px] font-semibold ${
                          l.contactado ? 'bg-ok/15 text-ok' : 'bg-warn/15 text-warn'
                        }`}
                      >
                        {l.contactado ? (
                          <>
                            <CheckCircle2 size={11} strokeWidth={2} />
                            Ya se le escribió
                          </>
                        ) : (
                          <>
                            <Clock size={11} strokeWidth={2} />
                            Pendiente de escribir
                          </>
                        )}
                      </span>
                    </div>

                    <p className="text-xs text-muted">
                      Plan: <strong className="font-medium text-bone">{l.objetivo}</strong> ·{' '}
                      {l.horario}
                    </p>
                    <p className="font-mono text-[11px] text-muted">
                      Recibido: {formatearFechaHora(l.creado_at)}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <a
                      href={`https://wa.me/${numWa}?text=${textoWa}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => {
                        if (!l.contactado) void cambiarEstado(l.id, true);
                      }}
                      className="btn btn-secondary !min-h-8 !px-3 text-xs"
                    >
                      <MessageCircle size={14} strokeWidth={1.5} className="text-ok" />
                      Escribir por WhatsApp
                    </a>

                    <button
                      type="button"
                      disabled={procesandoId === l.id}
                      onClick={() => void cambiarEstado(l.id, !l.contactado)}
                      className="btn btn-ghost !min-h-8 !px-2.5 text-xs"
                    >
                      <Check size={14} strokeWidth={1.5} />
                      {l.contactado ? 'Marcar pendiente' : 'Ya se escribió'}
                    </button>

                    <button
                      type="button"
                      disabled={procesandoId === l.id}
                      onClick={() => void cambiarEstado(l.id, l.contactado, true)}
                      className="btn btn-ghost !min-h-8 !px-2 text-muted hover:text-bad"
                      title="Descartar registro"
                      aria-label="Descartar registro"
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
