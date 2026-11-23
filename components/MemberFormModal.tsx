'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { AlertTriangle, Loader2, UserPlus, X } from 'lucide-react';
import { Portal } from '@/components/Portal';
import { capitalizarNombre, estadoDatosSocio } from '@/lib/formato';
import { crearSocio, actualizarSocio, type NuevoSocio } from '@/services/sociosService';
import type { SocioEstado } from '@/types';

interface Props {
  gymId: string;
  userId: string;
  socioEditar?: SocioEstado | null;
  valoresIniciales?: {
    nombres?: string;
    apellidos?: string;
    telefono?: string;
  };
  onClose: () => void;
  onSaved: (dni: string, esNuevo: boolean) => void;
}

export function MemberFormModal({
  gymId,
  userId,
  socioEditar,
  valoresIniciales,
  onClose,
  onSaved,
}: Props) {
  const [dni, setDni] = useState(socioEditar?.dni ?? '');
  const [nombres, setNombres] = useState(socioEditar?.nombres ?? valoresIniciales?.nombres ?? '');
  const [apellidos, setApellidos] = useState(
    socioEditar?.apellidos ?? valoresIniciales?.apellidos ?? ''
  );
  const [telefono, setTelefono] = useState(
    socioEditar?.telefono ?? valoresIniciales?.telefono ?? ''
  );
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const dniLimpio = dni.trim();
    const nomLimpio = capitalizarNombre(nombres);
    const apeLimpio = capitalizarNombre(apellidos);
    const telLimpio = telefono.trim();

    if (!/^\d{7,12}$/.test(dniLimpio)) {
      setError('Ingresa un DNI o documento válido (solo números, 7 a 12 dígitos)');
      return;
    }
    if (!nomLimpio || !apeLimpio) {
      setError('Nombres y apellidos son obligatorios');
      return;
    }

    setGuardando(true);
    try {
      if (socioEditar) {
        await actualizarSocio(socioEditar.socio_id, {
          dni: dniLimpio,
          nombres: nomLimpio,
          apellidos: apeLimpio,
          telefono: telLimpio || null,
        });
        onSaved(dniLimpio, false);
      } else {
        const payload: NuevoSocio = {
          dni: dniLimpio,
          nombres: nomLimpio,
          apellidos: apeLimpio,
          telefono: telLimpio || null,
        };
        await crearSocio(gymId, userId, payload);
        onSaved(dniLimpio, true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el socio');
      setGuardando(false);
    }
  }

  const datos = estadoDatosSocio({ dni, nombres, apellidos, telefono });
  const dniFalta = Boolean(socioEditar && datos.dniProvisional);
  const nomFalta = Boolean(socioEditar && nombres.includes('(Pendiente)'));
  const apeFalta = Boolean(socioEditar && apellidos.includes('(Pendiente)'));
  const telFalta = Boolean(socioEditar && datos.sinTelefono);

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-xs sm:items-center sm:p-6">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="socio-modal-titulo"
          className="modal-animate max-h-[92vh] w-full max-w-md overflow-y-auto rounded-lg border border-line bg-surface"
        >
        <header className="flex items-start justify-between border-b border-line/80 p-5">
          <h2 id="socio-modal-titulo" className="section-title text-xl">
            {socioEditar
              ? datos.incompleto
                ? 'Completar datos del socio'
                : 'Editar socio'
              : 'Nuevo socio'}
          </h2>
          <button onClick={onClose} className="btn btn-ghost !min-h-9 !px-2" aria-label="Cerrar">
            <X size={18} strokeWidth={1.5} />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          {socioEditar && datos.incompleto && (
            <div className="flex items-start gap-2 rounded-md border-l-4 border-warn bg-warn/10 px-3.5 py-2.5 text-xs text-warn">
              <AlertTriangle size={15} strokeWidth={1.75} className="mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">Faltan datos por completar:</p>
                <p className="mt-0.5 text-bone/90">
                  {[
                    datos.dniProvisional ? 'DNI real (actual es provisional 99...)' : null,
                    datos.nombrePendiente ? 'nombre o apellido "(Pendiente)"' : null,
                    datos.sinTelefono ? 'teléfono (opcional)' : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                  .
                </p>
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="socio-dni" className="label">
                DNI / Documento *
              </label>
              {dniFalta && (
                <span className="mb-1 rounded bg-warn/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-warn ring-1 ring-warn/40">
                  Provisional
                </span>
              )}
            </div>
            <input
              id="socio-dni"
              type="text"
              inputMode="numeric"
              required
              autoFocus
              maxLength={12}
              placeholder="Ej: 74859612"
              value={dni}
              onFocus={(e) => {
                if (/^99\d{7,}$/.test(e.target.value)) e.target.select();
              }}
              onChange={(e) => setDni(e.target.value.replace(/\D/g, ''))}
              className={`field font-mono ${dniFalta ? '!border-warn/80 !bg-warn/5' : ''}`}
            />
          </div>

          <div>
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="socio-nombres" className="label">
                Nombres *
              </label>
              {nomFalta && (
                <span className="mb-1 rounded bg-warn/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-warn ring-1 ring-warn/40">
                  Pendiente
                </span>
              )}
            </div>
            <input
              id="socio-nombres"
              type="text"
              required
              placeholder="Ej: Carlos Alberto"
              value={nombres}
              onFocus={(e) => {
                if (e.target.value.trim() === '(Pendiente)') e.target.select();
              }}
              onChange={(e) => setNombres(e.target.value)}
              className={`field ${nomFalta ? '!border-warn/80 !bg-warn/5' : ''}`}
            />
          </div>

          <div>
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="socio-apellidos" className="label">
                Apellidos *
              </label>
              {apeFalta && (
                <span className="mb-1 rounded bg-warn/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-warn ring-1 ring-warn/40">
                  Pendiente
                </span>
              )}
            </div>
            <input
              id="socio-apellidos"
              type="text"
              required
              placeholder="Ej: Mendoza Quispe"
              value={apellidos}
              onFocus={(e) => {
                if (e.target.value.trim() === '(Pendiente)') e.target.select();
              }}
              onChange={(e) => setApellidos(e.target.value)}
              className={`field ${apeFalta ? '!border-warn/80 !bg-warn/5' : ''}`}
            />
          </div>

          <div>
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="socio-telefono" className="label">
                Teléfono / WhatsApp (opcional)
              </label>
              {telFalta && (
                <span className="mb-1 rounded bg-warn/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-warn ring-1 ring-warn/30">
                  Falta
                </span>
              )}
            </div>
            <input
              id="socio-telefono"
              type="tel"
              placeholder="Ej: 987654321"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              className={`field tabular-nums ${telFalta ? '!border-warn/50' : ''}`}
            />
          </div>

          {error && (
            <p role="alert" className="rounded-md border-l-2 border-bad bg-bad/10 px-3 py-2 text-xs text-bad">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 border-t border-line/80 pt-4">
            <button type="button" onClick={onClose} className="btn btn-ghost">
              Cancelar
            </button>
            <button type="submit" disabled={guardando} className="btn btn-primary !px-6">
              {guardando ? (
                <Loader2 size={16} strokeWidth={1.5} className="animate-spin" />
              ) : (
                <UserPlus size={16} strokeWidth={1.5} />
              )}
              {socioEditar ? 'Guardar cambios' : 'Registrar socio'}
            </button>
          </div>
        </form>
        </div>
      </div>
    </Portal>
  );
}
