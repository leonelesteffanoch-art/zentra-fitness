'use client';

import { useState } from 'react';
import {
  Banknote,
  CalendarDays,
  CreditCard,
  InfinityIcon,
  Smartphone,
} from 'lucide-react';
import {
  formatoPrecioLanding,
  montoSinMoneda,
  precioPase,
  precioPlan,
  type Modalidad,
  type PlanLandingItem,
} from '@/lib/planes-landing';
import { elegirPlanEIrAContacto, irASeccion } from '@/components/LandingInteractive';

const PAGOS = [
  { icono: Banknote, texto: 'Efectivo' },
  { icono: Smartphone, texto: 'Yape' },
  { icono: Smartphone, texto: 'Plin' },
  { icono: CreditCard, texto: 'Tarjeta' },
];

export function PlanesSection({ planes }: { planes: PlanLandingItem[] }) {
  const [modalidad, setModalidad] = useState<Modalidad>('diario');
  const etiqueta = modalidad === 'diario' ? 'Diario' : 'Interdiario';

  const p1 = precioPlan(planes, 30, modalidad);
  const p2 = precioPlan(planes, 60, modalidad);
  const p3 = precioPlan(planes, 90, modalidad);

  const tarjetas = [
    {
      id: '1',
      meses: '1 MES',
      dias: 30,
      precio: p1,
      alMes: null,
      ahorro: null,
      destacado: true,
      tag: 'MÁS ELEGIDO',
    },
    {
      id: '2',
      meses: '2 MESES',
      dias: 60,
      precio: p2,
      alMes: Math.round(p2 / 2),
      ahorro: Math.max(0, p1 * 2 - p2),
      destacado: false,
      tag: null,
    },
    {
      id: '3',
      meses: '3 MESES',
      dias: 90,
      precio: p3,
      alMes: Math.round(p3 / 3),
      ahorro: Math.max(0, p1 * 3 - p3),
      destacado: false,
      tag: null,
    },
  ];

  const pDia = precioPase(planes, 1);
  const pSemana = precioPase(planes, 7);

  return (
    <div className="space-y-12 sm:space-y-14">
      {/* Toggle segmentado + texto blanco destacado */}
      <div className="flex flex-col items-center gap-4 text-center">
        <div
          role="group"
          aria-label="Modalidad de entrenamiento"
          className="inline-grid w-full grid-cols-2 rounded-full border border-line bg-ink p-1 sm:w-auto"
        >
          {(['diario', 'interdiario'] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={modalidad === m}
              onClick={() => setModalidad(m)}
              className={`min-h-11 rounded-full px-8 text-sm font-semibold transition-all duration-200 ${
                modalidad === m
                  ? 'bg-bone text-ink shadow-md'
                  : 'text-muted hover:text-bone'
              }`}
            >
              {m === 'diario' ? 'Diario' : 'Interdiario'}
            </button>
          ))}
        </div>

        {/* Texto blanco de alta visibilidad que resalta la modalidad */}
        <div className="anim-swap">
          {modalidad === 'interdiario' ? (
            <div className="inline-flex items-center gap-2 rounded-full border border-bone/40 bg-surface-2 px-5 py-2 text-sm font-bold text-bone shadow-lg">
              <span className="h-2.5 w-2.5 rounded-full bg-brand animate-pulse" />
              <span>3 días a la semana</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 rounded-full border border-line bg-surface-2 px-5 py-2 text-sm font-semibold text-bone/95 shadow-md">
              <span className="h-2 w-2 rounded-full bg-ok" />
              <span>Lunes a sábado · Todos los días</span>
            </div>
          )}
        </div>
      </div>

      {/* Tarjetas estilo referencia (Planet Fitness style: limpias, rounded-2xl, fondo oscuro, precio grande) */}
      <div className="grid gap-6 md:grid-cols-3 md:items-stretch">
        {tarjetas.map((t) => (
          <article
            key={t.id}
            className={`relative flex flex-col justify-between rounded-2xl border p-7 transition-all duration-200 hover:-translate-y-1 sm:p-8 ${
              t.destacado
                ? 'border-brand bg-ink ring-1 ring-brand/40 shadow-[0_0_50px_-15px_rgba(255,194,26,0.3)] md:-my-3 md:py-10'
                : 'border-line/90 bg-ink/75 hover:border-muted/60'
            }`}
          >
            <div>
              {/* Header de la tarjeta */}
              <div className="flex min-h-7 items-center justify-between gap-3">
                <h3 className="font-[family-name:var(--font-archivo)] text-xl font-black italic tracking-wide text-bone">
                  {t.meses}
                </h3>
                {t.tag && (
                  <span className="rounded-md bg-brand px-2.5 py-1 text-xs font-black tracking-wider text-brand-ink uppercase">
                    {t.tag}
                  </span>
                )}
                {!t.tag && t.ahorro ? (
                  <span className="rounded-md border border-line bg-surface-2 px-2.5 py-0.5 text-xs font-semibold text-bone">
                    Ahorras {formatoPrecioLanding(t.ahorro)}
                  </span>
                ) : null}
              </div>

              <p className="mt-1 text-xs font-medium uppercase tracking-wider text-muted">
                Plan {t.dias} días
              </p>

              {/* Precio grande */}
              <div key={`${modalidad}-${t.id}`} className="anim-swap mt-6 pb-2">
                <div className="flex items-baseline font-[family-name:var(--font-archivo)] font-black italic leading-none text-bone">
                  <span className="mr-1.5 text-2xl font-bold not-italic sm:text-3xl text-bone/80">
                    S/
                  </span>
                  <span className="text-5xl tracking-tight sm:text-6xl tabular-nums">
                    {montoSinMoneda(t.precio)}
                  </span>
                </div>

                <div className="mt-2.5 min-h-6">
                  {t.alMes !== null ? (
                    <span className="text-xs font-semibold text-muted">
                      {formatoPrecioLanding(t.alMes)} / mes
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-muted">
                      Tarifa estándar
                    </span>
                  )}
                </div>
              </div>

              {/* Descripción única para todos los planes */}
              <div className="mt-6 border-t border-line/70 pt-5 text-sm leading-relaxed text-bone/90">
                <p>
                  Incluye acceso a todo el gimnasio, entrenamiento personalizado.
                </p>
              </div>
            </div>

            {/* Botón único (sin Learn More) */}
            <button
              type="button"
              onClick={() =>
                elegirPlanEIrAContacto(`${t.meses} (${etiqueta}) - ${formatoPrecioLanding(t.precio)}`)
              }
              className={`btn mt-8 w-full !min-h-12 !text-sm ${
                t.destacado ? 'btn-primary shadow-md font-bold' : 'btn-secondary font-semibold'
              }`}
            >
              Elegir plan
            </button>
          </article>
        ))}
      </div>

      {/* Pases tipo ticket */}
      <div className="rounded-2xl border border-line/80 bg-surface/50 p-5 sm:p-7">
        <div className="grid gap-4 sm:grid-cols-2">
          <Ticket
            nombre="Por día"
            precio={pDia}
            detalle="Pase libre"
            icono={<InfinityIcon aria-hidden="true" size={20} strokeWidth={1.5} />}
          />
          <Ticket
            nombre="Semanal"
            precio={pSemana}
            detalle="7 días seguidos"
            icono={<CalendarDays aria-hidden="true" size={18} strokeWidth={1.5} />}
          />
        </div>

        <div className="mt-6 flex flex-col items-start justify-between gap-4 border-t border-line/70 pt-5 sm:flex-row sm:items-center">
          <a
            href="#contacto"
            onClick={(e) => irASeccion(e, '#contacto')}
            className="btn btn-secondary w-full sm:w-auto text-xs sm:text-sm font-semibold"
          >
            Pedir pase en recepción
          </a>
          <div className="flex w-full sm:w-auto items-center justify-between sm:justify-start gap-1.5 sm:gap-2 flex-nowrap overflow-x-auto no-scrollbar py-0.5">
            <span className="text-xs text-muted shrink-0 mr-0.5">Paga con</span>
            <div className="flex items-center gap-1.5 flex-nowrap shrink-0">
              {PAGOS.map(({ icono: Icono, texto }) => (
                <span
                  key={texto}
                  className="inline-flex items-center gap-1 rounded-full border border-line bg-surface-2 px-2.5 py-1 text-[11px] sm:text-xs font-medium text-bone shrink-0"
                >
                  <Icono aria-hidden="true" size={12} strokeWidth={1.5} className="text-muted" />
                  {texto}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Ticket({
  nombre,
  precio,
  detalle,
  icono,
}: {
  nombre: string;
  precio: number;
  detalle: string;
  icono: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-24 rounded-xl border border-line/80 bg-ink">
      <div className="flex shrink-0 flex-col justify-center px-4 sm:px-5 w-auto min-w-[104px] sm:min-w-[124px]">
        <span className="text-xs text-muted">{nombre}</span>
        <span
          className="mt-0.5 whitespace-nowrap font-[family-name:var(--font-archivo)] text-2xl sm:text-3xl font-black italic leading-none text-bone"
          style={{ fontStretch: '115%', fontVariantNumeric: 'tabular-nums' }}
        >
          {formatoPrecioLanding(precio)}
        </span>
      </div>

      {/* Línea punteada divisoria */}
      <div className="relative w-px shrink-0 border-l border-dashed border-line" aria-hidden="true" />

      <div className="flex flex-1 items-center gap-2.5 px-4 sm:px-5 py-4 text-xs sm:text-sm font-medium text-bone">
        <span className="text-muted shrink-0">{icono}</span>
        <span>{detalle}</span>
      </div>
    </div>
  );
}
