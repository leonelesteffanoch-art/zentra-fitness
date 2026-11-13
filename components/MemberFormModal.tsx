'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Loader2, UserPlus, X } from 'lucide-react';
import { Portal } from '@/components/Portal';
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
    const nomLimpio = nombres.trim();
    const apeLimpio = apellidos.trim();
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

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-xs sm:items-center sm:p-6">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="socio-modal-titulo"
          className="modal-animate max-h-[92vh] w-full max-w-md overflow-y-auto border border-line bg-surface"
        >
        <header className="flex items-start justify-between border-b border-line/80 p-5">
          <h2 id="socio-modal-titulo" className="section-title text-xl">
            {socioEditar ? 'Editar socio' : 'Nuevo socio'}
          </h2>
          <button onClick={onClose} className="btn btn-ghost !min-h-9 !px-2" aria-label="Cerrar">
            <X size={18} strokeWidth={1.5} />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          <div>
            <label htmlFor="socio-dni" className="label">
              DNI / Documento *
            </label>
            <input
              id="socio-dni"
              type="text"
              inputMode="numeric"
              required
              autoFocus
              maxLength={12}
              placeholder="Ej: 74859612"
              value={dni}
              onChange={(e) => setDni(e.target.value.replace(/\D/g, ''))}
              className="field font-mono"
            />
          </div>

          <div>
            <label htmlFor="socio-nombres" className="label">
              Nombres *
            </label>
            <input
              id="socio-nombres"
              type="text"
              required
              placeholder="Ej: Carlos Alberto"
              value={nombres}
              onChange={(e) => setNombres(e.target.value)}
              className="field"
            />
          </div>

          <div>
            <label htmlFor="socio-apellidos" className="label">
              Apellidos *
            </label>
            <input
              id="socio-apellidos"
              type="text"
              required
              placeholder="Ej: Mendoza Quispe"
              value={apellidos}
              onChange={(e) => setApellidos(e.target.value)}
              className="field"
            />
          </div>

          <div>
            <label htmlFor="socio-telefono" className="label">
              Teléfono / WhatsApp (opcional)
            </label>
            <input
              id="socio-telefono"
              type="tel"
              placeholder="Ej: 987654321"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              className="field tabular-nums"
            />
          </div>

          {error && (
            <p role="alert" className="border-l-2 border-bad bg-bad/10 px-3 py-2 text-xs text-bad">
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
