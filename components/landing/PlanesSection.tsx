'use client';

import { useState } from 'react';
import {
  Banknote,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  InfinityIcon,
  Smartphone,
  Sparkles,
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
  { icono: Banknote, texto: 'Efectivo', color: 'text-ok' },
  { icono: Smartphone, texto: 'Yape', color: 'text-brand' },
  { icono: Smartphone, texto: 'Plin', color: 'text-brand' },
  { icono: CreditCard, texto: 'Tarjeta', color: 'text-bone/90' },
];

const INCLUYE_PLAN = [
  'Acceso a las 6 zonas de entrenamiento',
  'Asesoría de entrenador en turno',
  'Control de asistencias con tu DNI',
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
            <div className="inline-flex items-center gap-2 rounded-full border border-brand/40 bg-brand/10 px-5 py-2 text-sm font-bold text-bone shadow-lg">
              <span className="h-2.5 w-2.5 rounded-full bg-brand animate-pulse" />
              <span>3 días a la semana</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 rounded-full border border-ok/35 bg-ok/10 px-5 py-2 text-sm font-semibold text-bone shadow-md">
              <span className="h-2 w-2 rounded-full bg-ok shadow-[0_0_8px_#22c55e]" />
              <span>Lunes a Sábado</span>
            </div>
          )}
        </div>
      </div>

      {/* Tarjetas de planes con mayor contraste cromático y beneficios */}
      <div className="grid gap-6 md:grid-cols-3 md:items-stretch">
        {tarjetas.map((t) => (
          <article
            key={t.id}
            className={`relative flex flex-col justify-between overflow-hidden rounded-2xl border p-7 transition-all duration-200 hover:-translate-y-1 sm:p-8 ${
              t.destacado
                ? 'border-brand bg-gradient-to-b from-brand/[0.13] via-ink to-ink ring-1 ring-brand/40 shadow-[0_0_55px_-15px_rgba(255,194,26,0.35)] md:-my-3 md:py-10'
                : 'border-line/90 bg-gradient-to-b from-surface-2/40 via-ink to-ink hover:border-brand/40'
            }`}
          >
            {t.destacado && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-brand to-transparent"
              />
            )}

            <div>
              {/* Header de la tarjeta */}
              <div className="flex min-h-7 items-center justify-between gap-3">
                <h3 className="font-[family-name:var(--font-archivo)] text-xl font-black italic tracking-wide text-bone">
                  {t.meses}
                </h3>
                {t.tag && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-brand px-2.5 py-1 text-xs font-black tracking-wider text-brand-ink uppercase shadow-sm">
                    <Sparkles size={11} strokeWidth={2.5} aria-hidden="true" />
                    {t.tag}
                  </span>
                )}
                {!t.tag && t.ahorro ? (
                  <span className="rounded-md border border-ok/35 bg-ok/15 px-2.5 py-0.5 text-xs font-semibold text-ok">
                    Ahorras {formatoPrecioLanding(t.ahorro)}
                  </span>
                ) : null}
              </div>

              <p className="mt-1 text-xs font-medium uppercase tracking-wider text-muted">
                Plan {t.dias} días · {etiqueta}
              </p>

              {/* Precio grande */}
              <div key={`${modalidad}-${t.id}`} className="anim-swap mt-6 pb-2">
                <div className="flex items-baseline font-[family-name:var(--font-archivo)] font-black italic leading-none text-bone">
                  <span className="mr-1.5 text-2xl font-bold not-italic sm:text-3xl text-brand">
                    S/
                  </span>
                  <span className="text-5xl tracking-tight sm:text-6xl tabular-nums">
                    {montoSinMoneda(t.precio)}
                  </span>
                </div>

                <div className="mt-2.5 min-h-6">
                  {t.alMes !== null ? (
                    <span className="inline-flex items-center rounded-full border border-line/80 bg-surface px-2.5 py-0.5 text-xs font-semibold text-bone/90">
                      {formatoPrecioLanding(t.alMes)} / mes
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-muted">
                      Tarifa estándar sin matrícula
                    </span>
                  )}
                </div>
              </div>

              {/* Lista visual de beneficios incluidos */}
              <ul className="mt-6 space-y-2.5 border-t border-line/70 pt-5 text-sm text-bone/90">
                {INCLUYE_PLAN.map((beneficio) => (
                  <li key={beneficio} className="flex items-start gap-2.5">
                    <CheckCircle2
                      size={16}
                      strokeWidth={2}
                      aria-hidden="true"
                      className={`mt-0.5 shrink-0 ${t.destacado ? 'text-brand' : 'text-ok'}`}
                    />
                    <span className="leading-snug">{beneficio}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Botón único */}
            <button
              type="button"
              onClick={() =>
                elegirPlanEIrAContacto(`${t.meses} (${etiqueta}) - ${formatoPrecioLanding(t.precio)}`)
              }
              className={`btn mt-8 w-full !min-h-12 !text-sm ${
                t.destacado ? 'btn-primary shadow-[0_0_25px_-5px_rgba(255,194,26,0.45)] font-bold' : 'btn-secondary hover:border-brand/60 font-semibold'
              }`}
            >
              Elegir plan
            </button>
          </article>
        ))}
      </div>

      {/* Pases tipo ticket */}
      <div className="relative overflow-hidden rounded-2xl border border-line/80 bg-ink/60 p-4 sm:p-7">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 h-48 w-48 rounded-full bg-brand/[0.06] blur-3xl"
        />
        <div className="relative grid gap-4 sm:grid-cols-2">
          <Ticket
            nombre="Por día"
            precio={pDia}
            detalle="Pase libre"
            icono={<InfinityIcon aria-hidden="true" size={19} strokeWidth={1.75} />}
          />
          <Ticket
            nombre="Semanal"
            precio={pSemana}
            detalle="Lunes a Sábado"
            destacado
            icono={<CalendarDays aria-hidden="true" size={18} strokeWidth={1.75} />}
          />
        </div>

        <div className="relative mt-6 flex flex-col items-start justify-between gap-4 border-t border-line/70 pt-5 sm:flex-row sm:items-center">
          <a
            href="#inscripcion"
            onClick={(e) => irASeccion(e, '#inscripcion')}
            className="btn btn-secondary hover:border-brand/60 w-full sm:w-auto text-xs sm:text-sm font-semibold"
          >
            Pedir pase en recepción
          </a>
          <div className="flex w-full sm:w-auto items-center justify-between sm:justify-start gap-1 sm:gap-2 flex-nowrap py-0.5">
            <span className="text-[11px] sm:text-xs text-muted shrink-0 mr-0.5">Paga con</span>
            <div className="flex items-center gap-1 sm:gap-1.5 flex-nowrap shrink-0">
              {PAGOS.map(({ icono: Icono, texto, color }) => (
                <span
                  key={texto}
                  className="inline-flex items-center gap-1 rounded-full border border-line bg-surface-2 px-2 py-0.5 sm:px-2.5 sm:py-1 text-[10.5px] sm:text-xs font-medium text-bone shrink-0"
                >
                  <Icono aria-hidden="true" size={11} strokeWidth={1.8} className={color} />
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
  destacado = false,
}: {
  nombre: string;
  precio: number;
  detalle: string;
  icono: React.ReactNode;
  destacado?: boolean;
}) {
  return (
    <div
      className={`relative flex min-h-24 rounded-xl border bg-surface/90 transition-colors ${
        destacado ? 'border-brand/35 hover:border-brand/70' : 'border-line/80 hover:border-muted/60'
      }`}
    >
      <div className="flex shrink-0 flex-col justify-center px-4 sm:px-5 w-auto min-w-[104px] sm:min-w-[124px]">
        <span className="text-xs font-medium text-muted">{nombre}</span>
        <span
          className="mt-0.5 whitespace-nowrap font-[family-name:var(--font-archivo)] text-2xl sm:text-3xl font-black italic leading-none text-bone"
          style={{ fontStretch: '115%', fontVariantNumeric: 'tabular-nums' }}
        >
          {formatoPrecioLanding(precio)}
        </span>
      </div>

      {/* Línea punteada divisoria */}
      <div className="relative w-px shrink-0 border-l border-dashed border-line" aria-hidden="true" />

      <div className="flex flex-1 items-center gap-3 px-4 sm:px-5 py-4 text-xs sm:text-sm font-medium text-bone">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${
            destacado
              ? 'border-brand/30 bg-brand/10 text-brand'
              : 'border-line bg-surface-2 text-brand/90'
          }`}
        >
          {icono}
        </span>
        <span>{detalle}</span>
      </div>
    </div>
  );
}
