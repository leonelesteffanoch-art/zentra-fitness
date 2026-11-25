'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { AlertTriangle, Check, Loader2, Plus, UserPlus, X } from 'lucide-react';
import { Portal } from '@/components/Portal';
import {
  capitalizarNombre,
  diffDiasISO,
  estadoDatosSocio,
  formatearFechaDMY,
  hoyLima,
  soles,
  sumarDias,
} from '@/lib/formato';
import {
  actualizarSocio,
  crearSocio,
  listarPlanes,
  registrarMembresia,
  type NuevoSocio,
} from '@/services/sociosService';
import { registrarAsistencia } from '@/services/asistenciasService';
import type { MetodoPago, PagoInput, Plan, SocioEstado } from '@/types';

export interface ResultadoGuardadoSocio {
  conMembresia: boolean;
  ingresoRegistrado: boolean;
  mensaje?: string;
}

interface Props {
  gymId: string;
  userId: string;
  hayTurno?: boolean;
  permitirIngresoHoy?: boolean;
  socioEditar?: SocioEstado | null;
  valoresIniciales?: {
    nombres?: string;
    apellidos?: string;
    telefono?: string;
  };
  onClose: () => void;
  onSaved: (dni: string, esNuevo: boolean, resultado?: ResultadoGuardadoSocio) => void;
}

type TipoCobro = 'completo' | 'adelanto' | 'dividido';

interface LineaPago {
  metodo: MetodoPago;
  monto: string;
}

const METODOS: MetodoPago[] = ['Efectivo', 'Yape', 'Plin', 'Tarjeta'];

export function MemberFormModal({
  gymId,
  userId,
  hayTurno = false,
  permitirIngresoHoy = false,
  socioEditar,
  valoresIniciales,
  onClose,
  onSaved,
}: Props) {
  const esEdicion = Boolean(socioEditar);

  const [dni, setDni] = useState(socioEditar?.dni ?? '');
  const [nombres, setNombres] = useState(socioEditar?.nombres ?? valoresIniciales?.nombres ?? '');
  const [apellidos, setApellidos] = useState(
    socioEditar?.apellidos ?? valoresIniciales?.apellidos ?? ''
  );
  const [telefono, setTelefono] = useState(
    socioEditar?.telefono ?? valoresIniciales?.telefono ?? ''
  );

  // Estado para asignación inmediata de membresía al crear nuevo socio
  const [incluirMembresia, setIncluirMembresia] = useState(!esEdicion);
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [cargandoPlanes, setCargandoPlanes] = useState(!esEdicion);
  const [planId, setPlanId] = useState<string | null>(null);
  const [fechaInicio, setFechaInicio] = useState(hoyLima);
  const [tipoCobro, setTipoCobro] = useState<TipoCobro>('completo');
  const [metodoUnico, setMetodoUnico] = useState<MetodoPago>('Efectivo');
  const [montoAdelanto, setMontoAdelanto] = useState('');
  const [lineas, setLineas] = useState<LineaPago[]>([{ metodo: 'Efectivo', monto: '' }]);
  const [registrarIngresoHoy, setRegistrarIngresoHoy] = useState(Boolean(permitirIngresoHoy));
  const [socioCreadoId, setSocioCreadoId] = useState<string | null>(null);

  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    if (esEdicion) return;
    listarPlanes(gymId)
      .then(setPlanes)
      .catch((err: Error) => setError(err.message))
      .finally(() => setCargandoPlanes(false));
  }, [esEdicion, gymId]);

  const plan = planes.find((p) => p.id === planId) ?? null;
  const fechaFin = plan && fechaInicio ? sumarDias(fechaInicio, plan.duracion_dias) : '';
  const diasVigencia = fechaFin ? diffDiasISO(fechaFin) : null;
  const total = plan?.precio ?? 0;

  const pagado =
    !incluirMembresia || !plan
      ? 0
      : tipoCobro === 'completo'
      ? total
      : tipoCobro === 'adelanto'
      ? Math.round(Math.max(0, Number(montoAdelanto) || 0) * 100) / 100
      : Math.round(lineas.reduce((acc, l) => acc + Math.max(0, Number(l.monto) || 0), 0) * 100) /
        100;

  const pendiente = Math.max(0, Math.round((total - pagado) * 100) / 100);
  const sinTurnoParaCobrar = !esEdicion && incluirMembresia && Boolean(plan) && pagado > 0 && !hayTurno;
  const layoutAmplio = !esEdicion && incluirMembresia;

  function actualizarLinea(i: number, cambio: Partial<LineaPago>) {
    setLineas((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...cambio } : l)));
  }

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

    if (!esEdicion && incluirMembresia) {
      if (!plan) {
        setError('Elige un plan para asignar la membresía');
        return;
      }
      if (!fechaInicio) {
        setError('Ingresa la fecha de inicio');
        return;
      }
      if (pagado > total) {
        setError('El monto ingresado supera el precio del plan');
        return;
      }
      if (pagado > 0 && !hayTurno) {
        setError(
          'Abre un turno en Caja y ventas para registrar cobros, o usa "Con deuda / Adelanto" con S/ 0 hoy'
        );
        return;
      }
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
        return;
      }

      let idSocio: string;
      if (socioCreadoId) {
        idSocio = socioCreadoId;
      } else {
        const payload: NuevoSocio = {
          dni: dniLimpio,
          nombres: nomLimpio,
          apellidos: apeLimpio,
          telefono: telLimpio || null,
        };
        const creado = await crearSocio(gymId, userId, payload);
        idSocio = String(creado.id);
        setSocioCreadoId(idSocio);
      }

      if (!incluirMembresia || !plan) {
        onSaved(dniLimpio, true, {
          conMembresia: false,
          ingresoRegistrado: false,
          mensaje: 'Socio registrado (sin membresía asignada aún).',
        });
        return;
      }

      let pagos: PagoInput[] = [];
      if (tipoCobro === 'completo' && total > 0) {
        pagos = [{ metodo: metodoUnico, monto: total }];
      } else if (tipoCobro === 'adelanto' && pagado > 0) {
        pagos = [{ metodo: metodoUnico, monto: pagado }];
      } else if (tipoCobro === 'dividido') {
        pagos = lineas
          .filter((l) => Number(l.monto) > 0)
          .map((l) => ({ metodo: l.metodo, monto: Number(l.monto) }));
      }

      await registrarMembresia(idSocio, plan.id, fechaInicio, pagos);

      let ingresoRegistrado = false;
      if (permitirIngresoHoy && registrarIngresoHoy) {
        try {
          await registrarAsistencia(idSocio);
          ingresoRegistrado = true;
        } catch {
          // Si falla la asistencia, no invalidar la inscripción ya guardada
        }
      }

      const detalleSaldo =
        pendiente > 0 ? ` Saldo pendiente: ${soles(pendiente)}.` : ' Pagado completo.';
      const detalleIngreso = ingresoRegistrado ? ' Ingreso de hoy registrado.' : '';

      onSaved(dniLimpio, true, {
        conMembresia: true,
        ingresoRegistrado,
        mensaje: `Socio registrado con ${plan.nombre}.${detalleSaldo}${detalleIngreso}`,
      });
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

  const textoBotonCrear = !incluirMembresia
    ? 'Registrar solo datos'
    : pagado === 0
    ? 'Registrar socio a cuenta'
    : pendiente > 0
    ? 'Registrar socio y saldo'
    : 'Registrar socio y cobrar';

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-xs sm:items-center sm:p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="socio-modal-titulo"
          className={`modal-animate max-h-[94vh] w-full overflow-y-auto rounded-lg border border-line bg-surface ${
            layoutAmplio ? 'max-w-4xl' : 'max-w-md'
          }`}
        >
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line/80 px-5 py-3.5">
            <div>
              <h2 id="socio-modal-titulo" className="section-title text-xl">
                {socioEditar
                  ? datos.incompleto
                    ? 'Completar datos del socio'
                    : 'Editar socio'
                  : 'Nuevo socio'}
              </h2>
              {!esEdicion && (
                <p className="text-xs text-muted">
                  Completa sus datos personales y asigna su membresía en una sola vista.
                </p>
              )}
            </div>

            <div className="flex items-center gap-3">
              {!esEdicion && (
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-line/80 bg-surface-2/60 px-3 py-1.5 text-xs font-medium text-bone hover:border-brand/50">
                  <input
                    type="checkbox"
                    checked={incluirMembresia}
                    onChange={(e) => {
                      setIncluirMembresia(e.target.checked);
                      setError(null);
                    }}
                    className="h-3.5 w-3.5 accent-brand"
                  />
                  Asignar plan ahora
                </label>
              )}
              <button onClick={onClose} className="btn btn-ghost !min-h-8 !px-2" aria-label="Cerrar">
                <X size={18} strokeWidth={1.5} />
              </button>
            </div>
          </header>

          <form onSubmit={handleSubmit}>
            {layoutAmplio ? (
              <div className="grid gap-5 p-5 lg:grid-cols-12">
                {/* Columna izquierda: Datos personales + Resumen */}
                <div className="space-y-3.5 lg:col-span-5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-brand">
                    1. Datos del socio
                  </p>

                  {socioCreadoId && (
                    <div className="flex items-center gap-2 rounded-md border-l-4 border-ok bg-ok/10 px-3 py-2 text-xs text-ok">
                      <Check size={14} strokeWidth={2} className="shrink-0" />
                      <span>Datos guardados. Confirma la membresía para finalizar.</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
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
                        disabled={Boolean(socioCreadoId)}
                        maxLength={12}
                        placeholder="Ej: 74859612"
                        value={dni}
                        onChange={(e) => setDni(e.target.value.replace(/\D/g, ''))}
                        className="field !min-h-9 !py-1.5 font-mono"
                      />
                    </div>
                    <div>
                      <label htmlFor="socio-telefono" className="label">
                        Teléfono / WhatsApp
                      </label>
                      <input
                        id="socio-telefono"
                        type="tel"
                        disabled={Boolean(socioCreadoId)}
                        placeholder="Ej: 987654321"
                        value={telefono}
                        onChange={(e) => setTelefono(e.target.value)}
                        className="field !min-h-9 !py-1.5 tabular-nums"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="socio-nombres" className="label">
                      Nombres *
                    </label>
                    <input
                      id="socio-nombres"
                      type="text"
                      required
                      disabled={Boolean(socioCreadoId)}
                      placeholder="Ej: Carlos Alberto"
                      value={nombres}
                      onChange={(e) => setNombres(e.target.value)}
                      className="field !min-h-9 !py-1.5"
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
                      disabled={Boolean(socioCreadoId)}
                      placeholder="Ej: Mendoza Quispe"
                      value={apellidos}
                      onChange={(e) => setApellidos(e.target.value)}
                      className="field !min-h-9 !py-1.5"
                    />
                  </div>

                  {/* Resumen financiero del registro */}
                  <div className="space-y-2 rounded-md border border-line/80 bg-surface-2/60 p-3.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted">Plan seleccionado</span>
                      <span className="font-semibold text-bone">
                        {plan ? plan.nombre : 'Elige un plan a la derecha →'}
                      </span>
                    </div>
                    <dl className="grid grid-cols-3 gap-2 border-t border-line/60 pt-2 text-sm">
                      <div>
                        <dt className="text-[11px] text-muted">Total</dt>
                        <dd className="font-mono font-bold text-bone tabular-nums">
                          {soles(total)}
                        </dd>
                      </div>
                      <div className="text-center">
                        <dt className="text-[11px] text-muted">Abona hoy</dt>
                        <dd className="font-mono font-bold text-bone tabular-nums">
                          {soles(pagado)}
                        </dd>
                      </div>
                      <div className="text-right">
                        <dt className="text-[11px] text-muted">Saldo</dt>
                        <dd
                          className={`font-mono font-bold tabular-nums ${
                            pendiente > 0 ? 'text-warn' : 'text-ok'
                          }`}
                        >
                          {soles(pendiente)}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  {permitirIngresoHoy && (
                    <label className="flex cursor-pointer items-center gap-2.5 rounded-md border border-line/70 bg-surface-2/40 px-3 py-2 text-xs text-bone">
                      <input
                        type="checkbox"
                        checked={registrarIngresoHoy}
                        onChange={(e) => setRegistrarIngresoHoy(e.target.checked)}
                        className="h-4 w-4 accent-brand"
                      />
                      <span>Registrar ingreso de hoy automáticamente</span>
                    </label>
                  )}

                  {sinTurnoParaCobrar && (
                    <div className="flex items-start gap-2 rounded-md border-l-4 border-warn bg-warn/10 px-3 py-2 text-xs text-warn">
                      <AlertTriangle size={14} strokeWidth={1.75} className="mt-0.5 shrink-0" />
                      <p className="text-bone/90">
                        <strong className="text-warn">Caja cerrada:</strong> abre un turno para cobrar hoy o usa{' '}
                        <strong>Con deuda / Adelanto</strong> con S/ 0.
                      </p>
                    </div>
                  )}
                </div>

                {/* Columna derecha: Plan, fechas y forma de cobro */}
                <div className="space-y-3.5 lg:col-span-7 lg:border-l lg:border-line/70 lg:pl-5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-brand">
                    2. Membresía y cobro
                  </p>

                  <fieldset>
                    <legend className="label">Plan *</legend>
                    {cargandoPlanes ? (
                      <div className="flex items-center gap-2 py-2 text-xs text-muted">
                        <Loader2 size={15} className="animate-spin" /> Cargando planes...
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-1.5">
                        {planes.map((p) => {
                          const activo = planId === p.id;
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                setPlanId(p.id);
                                if (
                                  tipoCobro === 'dividido' &&
                                  lineas.length === 1 &&
                                  !lineas[0].monto
                                ) {
                                  setLineas([{ metodo: lineas[0].metodo, monto: p.precio.toFixed(2) }]);
                                }
                              }}
                              aria-pressed={activo}
                              className={`rounded-md px-3 py-2 text-left transition-colors ${
                                activo
                                  ? 'bg-surface-2 ring-1 ring-brand'
                                  : 'bg-surface-2/60 hover:bg-surface-2'
                              }`}
                            >
                              <div className="flex items-baseline justify-between gap-2">
                                <span className="truncate text-xs font-semibold text-bone sm:text-sm">
                                  {p.nombre}
                                </span>
                                <span className="shrink-0 text-xs font-bold text-bone tabular-nums sm:text-sm">
                                  {soles(p.precio)}
                                </span>
                              </div>
                              <span className="block text-[11px] text-muted">
                                {p.duracion_dias === 1 ? '1 día' : `${p.duracion_dias} días`}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </fieldset>

                  <div className="grid grid-cols-2 items-end gap-3">
                    <div>
                      <label htmlFor="nuevo-fecha-inicio" className="label">
                        Fecha de inicio
                      </label>
                      <input
                        id="nuevo-fecha-inicio"
                        type="date"
                        value={fechaInicio}
                        onChange={(e) => setFechaInicio(e.target.value)}
                        className="field !min-h-9 !py-1.5 font-mono"
                      />
                    </div>
                    <div className="rounded-md border border-line/70 bg-surface-2/50 px-3 py-2 text-xs">
                      {plan && fechaFin ? (
                        <>
                          <span className="text-muted">Vence: </span>
                          <strong className="font-mono text-bone">
                            {formatearFechaDMY(fechaFin)}
                          </strong>
                          {diasVigencia !== null && (
                            <span
                              className={`ml-1.5 ${
                                diasVigencia < 0
                                  ? 'text-bad'
                                  : diasVigencia <= 3
                                  ? 'text-warn'
                                  : 'text-ok'
                              }`}
                            >
                              ({diasVigencia > 0 ? `${diasVigencia}d` : diasVigencia === 0 ? 'hoy' : `-${Math.abs(diasVigencia)}d`})
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-muted">Elige un plan para ver vencimiento</span>
                      )}
                    </div>
                  </div>

                  <fieldset>
                    <legend className="label">Forma de cobro</legend>
                    <div className="grid grid-cols-3 gap-2">
                      {(
                        [
                          { id: 'completo', label: 'Pago completo' },
                          { id: 'adelanto', label: 'Con deuda / Adelanto' },
                          { id: 'dividido', label: 'Pago dividido' },
                        ] as Array<{ id: TipoCobro; label: string }>
                      ).map((op) => (
                        <button
                          key={op.id}
                          type="button"
                          onClick={() => setTipoCobro(op.id)}
                          aria-pressed={tipoCobro === op.id}
                          className={`btn btn-secondary !min-h-9 !px-2 text-xs ${
                            tipoCobro === op.id ? '!border-brand !bg-brand/15 !text-brand' : ''
                          }`}
                        >
                          {op.label}
                        </button>
                      ))}
                    </div>
                  </fieldset>

                  {tipoCobro === 'completo' && (
                    <fieldset>
                      <legend className="label">Método de pago</legend>
                      <div className="grid grid-cols-4 gap-2">
                        {METODOS.map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setMetodoUnico(m)}
                            aria-pressed={metodoUnico === m}
                            className={`btn btn-secondary !min-h-9 text-xs ${
                              metodoUnico === m ? '!border-brand !bg-brand/15 !text-brand' : ''
                            }`}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </fieldset>
                  )}

                  {tipoCobro === 'adelanto' && (
                    <div className="space-y-2.5 rounded-md border border-line/80 bg-surface-2/40 p-3">
                      <div className="flex flex-wrap items-end gap-2">
                        <div className="flex-1">
                          <label htmlFor="nuevo-adelanto" className="label">
                            ¿Cuánto abona hoy? (S/)
                          </label>
                          <input
                            id="nuevo-adelanto"
                            type="number"
                            inputMode="decimal"
                            min="0"
                            step="0.50"
                            placeholder="0.00"
                            value={montoAdelanto}
                            onChange={(e) => setMontoAdelanto(e.target.value)}
                            className="field !min-h-9 !py-1.5 tabular-nums"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setMontoAdelanto('0')}
                          className={`btn btn-secondary !min-h-9 text-xs ${
                            montoAdelanto === '0' || montoAdelanto === ''
                              ? '!border-warn/60 !bg-warn/10 !text-warn'
                              : ''
                          }`}
                        >
                          S/ 0 (todo a cuenta)
                        </button>
                      </div>

                      {(Number(montoAdelanto) || 0) > 0 && (
                        <div className="grid grid-cols-4 gap-2">
                          {METODOS.map((m) => (
                            <button
                              key={m}
                              type="button"
                              onClick={() => setMetodoUnico(m)}
                              aria-pressed={metodoUnico === m}
                              className={`btn btn-secondary !min-h-8 text-xs ${
                                metodoUnico === m ? '!border-brand !bg-brand/15 !text-brand' : ''
                              }`}
                            >
                              {m}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {tipoCobro === 'dividido' && (
                    <fieldset className="space-y-2 rounded-md border border-line/80 bg-surface-2/40 p-3">
                      <legend className="label">Detalle por método (puedes dejar saldo pendiente)</legend>
                      {lineas.map((l, i) => (
                        <div key={i} className="flex gap-2">
                          <select
                            aria-label={`Método de pago ${i + 1}`}
                            value={l.metodo}
                            onChange={(e) =>
                              actualizarLinea(i, { metodo: e.target.value as MetodoPago })
                            }
                            className="field !min-h-9 !w-32 !py-1.5"
                          >
                            {METODOS.map((m) => (
                              <option key={m}>{m}</option>
                            ))}
                          </select>
                          <input
                            aria-label={`Monto ${i + 1}`}
                            type="number"
                            inputMode="decimal"
                            min="0"
                            step="0.50"
                            placeholder="0.00"
                            value={l.monto}
                            onChange={(e) => actualizarLinea(i, { monto: e.target.value })}
                            className="field !min-h-9 !py-1.5 tabular-nums"
                          />
                          {lineas.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setLineas((ls) => ls.filter((_, idx) => idx !== i))}
                              className="btn btn-ghost !min-h-9 !px-2.5"
                              aria-label="Quitar método"
                            >
                              <X size={15} strokeWidth={1.5} />
                            </button>
                          )}
                        </div>
                      ))}
                      {lineas.length < METODOS.length && (
                        <button
                          type="button"
                          onClick={() => {
                            const usados = lineas.map((l) => l.metodo);
                            const libre = METODOS.find((m) => !usados.includes(m)) ?? 'Yape';
                            setLineas((ls) => [
                              ...ls,
                              { metodo: libre, monto: pendiente > 0 ? pendiente.toFixed(2) : '' },
                            ]);
                          }}
                          className="inline-flex items-center gap-1 text-xs font-medium text-bone hover:underline"
                        >
                          <Plus size={14} strokeWidth={1.5} /> Agregar otro método
                        </button>
                      )}
                    </fieldset>
                  )}
                </div>
              </div>
            ) : (
              /* Modo compacto: Edición o Solo datos */
              <div className="space-y-3.5 p-5">
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
                    disabled={Boolean(socioCreadoId)}
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
                    disabled={Boolean(socioCreadoId)}
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
                    disabled={Boolean(socioCreadoId)}
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
                    disabled={Boolean(socioCreadoId)}
                    placeholder="Ej: 987654321"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    className={`field tabular-nums ${telFalta ? '!border-warn/50' : ''}`}
                  />
                </div>
              </div>
            )}

            <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line/80 px-5 py-3.5">
              <div className="min-w-0 flex-1">
                {error && (
                  <p role="alert" className="rounded-md border-l-2 border-bad bg-bad/10 px-3 py-1.5 text-xs text-bad">
                    {error}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button type="button" onClick={onClose} className="btn btn-ghost !min-h-10">
                  Cancelar
                </button>
                <button type="submit" disabled={guardando} className="btn btn-primary !min-h-10 !px-6">
                  {guardando ? (
                    <Loader2 size={16} strokeWidth={1.5} className="animate-spin" />
                  ) : (
                    <UserPlus size={16} strokeWidth={1.5} />
                  )}
                  {esEdicion ? 'Guardar cambios' : textoBotonCrear}
                </button>
              </div>
            </footer>
          </form>
        </div>
      </div>
    </Portal>
  );
}
