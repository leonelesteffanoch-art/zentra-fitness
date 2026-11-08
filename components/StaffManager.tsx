'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { KeyRound, Loader2, Plus, RotateCcw, Shield, UserPlus, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Rol } from '@/types';

interface TrabajadorItem {
  id: string;
  gym_id: string;
  nombre: string;
  email: string;
  rol: Rol;
  activo: boolean;
  created_at?: string;
}

interface Props {
  adminId: string;
  onSuccess: (mensaje: string) => void;
  onError: (mensaje: string) => void;
  onResetComplete?: () => Promise<void>;
}

async function obtenerToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? '';
}

export function StaffManager({ adminId, onSuccess, onError, onResetComplete }: Props) {
  const [personal, setPersonal] = useState<TrabajadorItem[]>([]);
  const [cargando, setCargando] = useState(true);

  // Modal de creación de nuevo trabajador
  const [modalNuevo, setModalNuevo] = useState(false);
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rol, setRol] = useState<Rol>('recepcionista');
  const [guardando, setGuardando] = useState(false);

  // Modal para cambiar contraseña / rol de un trabajador existente
  const [editando, setEditando] = useState<TrabajadorItem | null>(null);
  const [editNombre, setEditNombre] = useState('');
  const [editRol, setEditRol] = useState<Rol>('recepcionista');
  const [editActivo, setEditActivo] = useState(true);
  const [editPassword, setEditPassword] = useState('');

  // Modal de confirmación para limpiar datos de prueba
  const [modalReset, setModalReset] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [limpiando, setLimpiando] = useState(false);

  const cargarPersonal = useCallback(async () => {
    try {
      const token = await obtenerToken();
      if (!token) return;
      const res = await fetch('/api/admin/personal', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.personal)) {
        setPersonal(data.personal);
      }
    } catch {
      // Silencioso en carga inicial
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    obtenerToken()
      .then((token) =>
        token
          ? fetch('/api/admin/personal', {
              headers: { Authorization: `Bearer ${token}` },
            }).then((r) => r.json())
          : null
      )
      .then((data) => {
        if (data && Array.isArray(data.personal)) {
          setPersonal(data.personal);
        }
      })
      .catch(() => {})
      .finally(() => setCargando(false));
  }, []);

  async function crearTrabajador(e: FormEvent) {
    e.preventDefault();
    setGuardando(true);
    try {
      const token = await obtenerToken();
      const res = await fetch('/api/admin/personal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ nombre, email, password, rol }),
      });
      const data = await res.json();
      if (!res.ok) {
        onError(data.error ?? 'No se pudo crear la cuenta de personal');
        return;
      }
      onSuccess(
        `Usuario "${nombre}" (${rol === 'recepcionista' ? 'Recepcionista' : 'Admin'}) creado y listo para ingresar.`
      );
      setModalNuevo(false);
      setNombre('');
      setEmail('');
      setPassword('');
      setRol('recepcionista');
      await cargarPersonal();
    } catch {
      onError('Error de red al crear trabajador');
    } finally {
      setGuardando(false);
    }
  }

  function abrirEdicion(t: TrabajadorItem) {
    setEditando(t);
    setEditNombre(t.nombre);
    setEditRol(t.rol);
    setEditActivo(t.activo);
    setEditPassword('');
  }

  async function guardarEdicion(e: FormEvent) {
    e.preventDefault();
    if (!editando) return;
    setGuardando(true);
    try {
      const token = await obtenerToken();
      const res = await fetch('/api/admin/personal', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: editando.id,
          nombre: editNombre,
          rol: editRol,
          activo: editActivo,
          password: editPassword.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        onError(data.error ?? 'No se pudo actualizar el trabajador');
        return;
      }
      onSuccess(`Datos de "${editNombre}" actualizados.`);
      setEditando(null);
      await cargarPersonal();
    } catch {
      onError('Error de red al actualizar trabajador');
    } finally {
      setGuardando(false);
    }
  }

  async function ejecutarLimpiezaPruebas(e: FormEvent) {
    e.preventDefault();
    if (confirmText.trim().toUpperCase() !== 'LIMPIAR') return;
    setLimpiando(true);
    try {
      const { error } = await supabase.rpc('reiniciar_datos_operativos');
      if (error) {
        onError(
          error.message.includes('reiniciar_datos_operativos')
            ? 'Primero ejecuta una vez el script 04_limpiar_pruebas.sql en Supabase SQL Editor.'
            : error.message
        );
        return;
      }
      setModalReset(false);
      setConfirmText('');
      onSuccess(
        'Datos de prueba limpiados (socios, asistencias, membresías, ventas y turnos de caja reiniciados).'
      );
      await onResetComplete?.();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'No se pudo reiniciar los datos');
    } finally {
      setLimpiando(false);
    }
  }

  return (
    <div className="space-y-10">
      {/* Bloque 1: Gestión de personal y roles */}
      <section aria-label="Personal y accesos" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="section-title text-lg">Personal y permisos de acceso</h2>
            <p className="mt-0.5 text-xs text-muted">
              El rol <strong className="font-medium text-bone">Recepcionista</strong> solo accede a
              Recepción, Caja/POS y Socios (no puede ver ni editar Administración).
            </p>
          </div>

          <button
            type="button"
            onClick={() => setModalNuevo(true)}
            className="btn btn-secondary !min-h-9 !px-3.5 text-xs"
          >
            <Plus size={14} strokeWidth={1.5} />
            Nuevo personal
          </button>
        </div>

        <div className="overflow-x-auto border border-line bg-surface">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="border-b border-line bg-surface-2 text-xs font-medium text-muted">
              <tr>
                <th className="px-4 py-2.5">Nombre</th>
                <th className="px-4 py-2.5">Correo de acceso</th>
                <th className="px-4 py-2.5">Rol y alcance</th>
                <th className="px-4 py-2.5">Estado</th>
                <th className="px-4 py-2.5 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {cargando ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-muted">
                    <Loader2 size={16} strokeWidth={1.5} className="mx-auto animate-spin" />
                  </td>
                </tr>
              ) : personal.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-muted">
                    No se encontraron usuarios de personal.
                  </td>
                </tr>
              ) : (
                personal.map((t) => {
                  const esYo = t.id === adminId;
                  return (
                    <tr key={t.id}>
                      <td className="px-4 py-3 font-medium text-bone">
                        {t.nombre}
                        {esYo && (
                          <span className="ml-2 rounded-xs bg-surface-2 px-1.5 py-0.5 text-[11px] font-normal text-muted">
                            Tú
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted">{t.email}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-bone">
                          <Shield size={13} strokeWidth={1.5} className="text-muted" />
                          {t.rol === 'admin'
                            ? 'Administrador (Acceso total)'
                            : 'Recepcionista (Recepción, Caja y Socios)'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-xs px-2 py-0.5 text-xs font-semibold ${
                            t.activo ? 'bg-ok/15 text-ok' : 'bg-bad/15 text-bad'
                          }`}
                        >
                          {t.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => abrirEdicion(t)}
                          className="btn btn-ghost !min-h-8 !px-2.5 text-xs"
                        >
                          <KeyRound size={13} strokeWidth={1.5} />
                          Editar / Clave
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Bloque 2: Limpieza de pruebas operativas */}
      <section aria-label="Mantenimiento de datos" className="bg-surface p-5 sm:p-6">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="section-title text-base">Reiniciar datos de prueba</h2>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted">
              Limpia todos los socios registrados de prueba, membresías, asistencias, ventas y
              cierra/elimina los turnos de caja abiertos. Conserva intactos tus planes, productos y
              cuentas de personal.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setConfirmText('');
              setModalReset(true);
            }}
            className="btn btn-secondary shrink-0 !min-h-9 !px-3.5 text-xs"
          >
            <RotateCcw size={14} strokeWidth={1.5} />
            Limpiar registros de prueba
          </button>
        </div>
      </section>

      {/* Modal: Crear nuevo trabajador */}
      {modalNuevo && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Registrar nuevo personal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-md bg-surface p-6">
            <div className="flex items-center justify-between border-b border-line/70 pb-3">
              <h3 className="section-title flex items-center gap-2 text-lg">
                <UserPlus size={18} strokeWidth={1.5} className="text-muted" />
                Nuevo personal
              </h3>
              <button
                type="button"
                onClick={() => setModalNuevo(false)}
                className="btn btn-ghost !min-h-8 !px-2"
                aria-label="Cerrar"
              >
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>

            <form onSubmit={crearTrabajador} className="mt-5 space-y-4">
              <div>
                <label htmlFor="staff-nombre" className="label">
                  Nombre y apellido *
                </label>
                <input
                  id="staff-nombre"
                  type="text"
                  required
                  placeholder="Ej: Lucía Gómez (Turno Mañana)"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="field !bg-surface-2"
                />
              </div>

              <div>
                <label htmlFor="staff-email" className="label">
                  Correo para iniciar sesión *
                </label>
                <input
                  id="staff-email"
                  type="email"
                  required
                  placeholder="Ej: recepcion@zentrafitness.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="field !bg-surface-2"
                />
              </div>

              <div>
                <label htmlFor="staff-password" className="label">
                  Contraseña inicial (mín. 6 caracteres) *
                </label>
                <input
                  id="staff-password"
                  type="password"
                  required
                  minLength={6}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="field !bg-surface-2"
                />
              </div>

              <div>
                <label htmlFor="staff-rol" className="label">
                  Rol en el sistema *
                </label>
                <select
                  id="staff-rol"
                  value={rol}
                  onChange={(e) => setRol(e.target.value as Rol)}
                  className="field !bg-surface-2"
                >
                  <option value="recepcionista">
                    Recepcionista (Solo Recepción, Caja/POS y Socios)
                  </option>
                  <option value="admin">
                    Administrador (Acceso completo a finanzas y catálogo)
                  </option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setModalNuevo(false)}
                  className="btn btn-ghost !min-h-10"
                >
                  Cancelar
                </button>
                <button type="submit" disabled={guardando} className="btn btn-primary !min-h-10">
                  {guardando && <Loader2 size={15} strokeWidth={1.5} className="animate-spin" />}
                  Crear cuenta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar trabajador / cambiar contraseña */}
      {editando && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Editar personal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-md bg-surface p-6">
            <div className="flex items-center justify-between border-b border-line/70 pb-3">
              <h3 className="section-title text-lg">Editar acceso de personal</h3>
              <button
                type="button"
                onClick={() => setEditando(null)}
                className="btn btn-ghost !min-h-8 !px-2"
                aria-label="Cerrar"
              >
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>

            <form onSubmit={guardarEdicion} className="mt-5 space-y-4">
              <div>
                <label htmlFor="edit-staff-nombre" className="label">
                  Nombre
                </label>
                <input
                  id="edit-staff-nombre"
                  type="text"
                  required
                  value={editNombre}
                  onChange={(e) => setEditNombre(e.target.value)}
                  className="field !bg-surface-2"
                />
              </div>

              <div>
                <label htmlFor="edit-staff-rol" className="label">
                  Rol
                </label>
                <select
                  id="edit-staff-rol"
                  value={editRol}
                  disabled={editando.id === adminId}
                  onChange={(e) => setEditRol(e.target.value as Rol)}
                  className="field !bg-surface-2"
                >
                  <option value="recepcionista">
                    Recepcionista (Solo Recepción, Caja/POS y Socios)
                  </option>
                  <option value="admin">Administrador (Acceso total)</option>
                </select>
              </div>

              {editando.id !== adminId && (
                <div>
                  <label htmlFor="edit-staff-activo" className="label">
                    Estado de la cuenta
                  </label>
                  <select
                    id="edit-staff-activo"
                    value={editActivo ? 'activo' : 'inactivo'}
                    onChange={(e) => setEditActivo(e.target.value === 'activo')}
                    className="field !bg-surface-2"
                  >
                    <option value="activo">Activo (Puede iniciar sesión)</option>
                    <option value="inactivo">Inactivo (Acceso bloqueado)</option>
                  </select>
                </div>
              )}

              <div>
                <label htmlFor="edit-staff-pass" className="label">
                  Nueva contraseña (dejar vacío para no cambiar)
                </label>
                <input
                  id="edit-staff-pass"
                  type="password"
                  minLength={6}
                  placeholder="Escribe solo si deseas cambiar su clave"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  className="field !bg-surface-2"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEditando(null)}
                  className="btn btn-ghost !min-h-10"
                >
                  Cancelar
                </button>
                <button type="submit" disabled={guardando} className="btn btn-primary !min-h-10">
                  {guardando && <Loader2 size={15} strokeWidth={1.5} className="animate-spin" />}
                  Guardar cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirmar reinicio de datos de prueba */}
      {modalReset && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Confirmar limpieza de datos de prueba"
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-md bg-surface p-6">
            <div className="flex items-center justify-between border-b border-line/70 pb-3">
              <h3 className="section-title text-lg">Limpiar datos de prueba</h3>
              <button
                type="button"
                onClick={() => setModalReset(false)}
                className="btn btn-ghost !min-h-8 !px-2"
                aria-label="Cerrar"
              >
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>

            <form onSubmit={ejecutarLimpiezaPruebas} className="mt-4 space-y-4">
              <p className="text-sm leading-relaxed text-muted">
                Esta acción eliminará todos los <strong className="text-bone">socios</strong>,{' '}
                <strong className="text-bone">asistencias</strong>,{' '}
                <strong className="text-bone">membresías</strong>,{' '}
                <strong className="text-bone">ventas</strong> y{' '}
                <strong className="text-bone">turnos de caja (incluido el turno abierto)</strong>.
              </p>

              <div>
                <label htmlFor="reset-confirm" className="label">
                  Escribe <span className="font-mono text-bone">LIMPIAR</span> para confirmar
                </label>
                <input
                  id="reset-confirm"
                  type="text"
                  required
                  placeholder="LIMPIAR"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  className="field !bg-surface-2 font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalReset(false)}
                  className="btn btn-ghost !min-h-10"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={limpiando || confirmText.trim().toUpperCase() !== 'LIMPIAR'}
                  className="btn btn-primary !min-h-10"
                >
                  {limpiando && <Loader2 size={15} strokeWidth={1.5} className="animate-spin" />}
                  Confirmar limpieza
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
