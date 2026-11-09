'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, UserPlus } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { SearchBar } from '@/components/SearchBar';
import { MemberStatusCard } from '@/components/MemberStatusCard';
import { MemberFormModal } from '@/components/MemberFormModal';
import { QuickPaymentModal, type ModoCobro } from '@/components/QuickPaymentModal';
import { LeadsPanel } from '@/components/LeadsPanel';
import { buscarSocios } from '@/services/sociosService';
import { registrarAsistencia, ultimasAsistencias } from '@/services/asistenciasService';
import { turnoAbierto } from '@/services/cajaService';
import type { Asistencia, Semaforo, SocioEstado } from '@/types';

const BADGE_ESTADO: Record<Semaforo, { cls: string; txt: string }> = {
  VERDE: { cls: 'bg-ok/15 text-ok', txt: 'Activo' },
  AMBAR: { cls: 'bg-warn/15 text-warn', txt: 'Por vencer' },
  ROJO: { cls: 'bg-bad/15 text-bad', txt: 'Vencido' },
};

export default function RecepcionPage() {
  const { perfil } = useAuth();
  const gymId = perfil?.gym_id;

  const [resultados, setResultados] = useState<SocioEstado[]>([]);
  const [termino, setTermino] = useState('');
  const [seleccionado, setSeleccionado] = useState<SocioEstado | null>(null);
  const [asistenciasSocio, setAsistenciasSocio] = useState<Asistencia[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [registrando, setRegistrando] = useState(false);
  const [yaIngreso, setYaIngreso] = useState(false);
  const [hayTurno, setHayTurno] = useState<boolean | null>(null);
  const [cobro, setCobro] = useState<ModoCobro | null>(null);
  const [modalNuevoSocio, setModalNuevoSocio] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  useEffect(() => {
    if (!gymId) return;
    turnoAbierto(gymId)
      .then((t) => setHayTurno(t !== null))
      .catch(() => setHayTurno(false));
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
      const listaActualizada = await ultimasAsistencias(seleccionado.socio_id);
      setAsistenciasSocio(listaActualizada);
      setYaIngreso(true);
      setAviso({ tipo: 'ok', texto: `Ingreso registrado: ${seleccionado.nombres}` });
    } catch (e) {
      setAviso({ tipo: 'error', texto: e instanceof Error ? e.message : 'No se pudo registrar' });
    } finally {
      setRegistrando(false);
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

  return (
    <div className="mx-auto max-w-4xl space-y-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl sm:text-5xl">Recepción</h1>
          <p className="mt-1 text-xs text-muted">
            Escribe o pide el DNI al ingresar para ver su semáforo y calendario semanal.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModalNuevoSocio(true)}
          className="btn btn-secondary"
        >
          <UserPlus size={16} strokeWidth={1.5} />
          Nuevo socio
        </button>
      </div>

      {hayTurno === false && (
        <p className="flex items-start gap-3 bg-surface px-4 py-3 text-sm text-warn">
          <AlertTriangle size={18} strokeWidth={1.5} className="mt-0.5 shrink-0" />
          No hay un turno de caja abierto. Puedes registrar asistencias, pero para cobrar primero
          abre turno en Caja y POS.
        </p>
      )}

      <SearchBar
        onSearch={buscar}
        buscando={buscando}
        size="lg"
        autoFocus
        placeholder="Dictar DNI (8 dígitos) o nombre del socio..."
      />

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

      {seleccionado && gymId && (
        <MemberStatusCard
          socio={seleccionado}
          asistencias={asistenciasSocio}
          registrando={registrando}
          yaIngreso={yaIngreso}
          onCheckIn={checkIn}
          onRenovar={() => setCobro('renovar')}
          onCobrarSaldo={() => setCobro('abonar')}
        />
      )}

      {!seleccionado && resultados.length > 1 && (
        <ul className="divide-y divide-line border border-line bg-surface" aria-label="Resultados">
          {resultados.map((s) => {
            const b = BADGE_ESTADO[s.semaforo];
            return (
              <li key={s.socio_id}>
                <button
                  onClick={() => void seleccionarSocioConAsistencias(s)}
                  className="flex w-full items-center justify-between gap-4 px-4 py-3.5 text-left transition-colors hover:bg-surface-2"
                >
                  <div>
                    <span className="font-medium text-bone">
                      {s.apellidos}, {s.nombres}
                    </span>
                    <span className="ml-3 font-mono text-xs text-muted">{s.dni}</span>
                    {s.plan && <span className="ml-3 text-xs text-muted">· {s.plan}</span>}
                  </div>
                  <span className={`rounded-xs px-2 py-0.5 text-xs font-semibold ${b.cls}`}>
                    {b.txt}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {!buscando && termino.length >= 2 && resultados.length === 0 && (
        <div className="bg-surface px-6 py-10 text-center">
          <p className="text-sm text-muted">No se encontró ningún socio con “{termino}”.</p>
          <button
            type="button"
            onClick={() => setModalNuevoSocio(true)}
            className="btn btn-primary mt-4"
          >
            <UserPlus size={16} strokeWidth={1.5} />
            Registrar nuevo socio
          </button>
        </div>
      )}

      {/* Apartado de clientes interesados inscritos desde el formulario de la Landing */}
      <div className="border-t border-line/70 pt-6">
        <LeadsPanel />
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
          hayTurno={hayTurno === true}
          onClose={() => setCobro(null)}
          onDone={cobroTerminado}
        />
      )}
    </div>
  );
}
