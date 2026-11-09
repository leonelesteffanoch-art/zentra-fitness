'use client';

import { useState } from 'react';
import {
  BadgeCheck,
  Banknote,
  CreditCard,
  IdCard,
  InfinityIcon,
  LayoutGrid,
  Smartphone,
  CalendarDays,
  Users,
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

const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const DIAS_LARGOS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const ACTIVOS: Record<Modalidad, number[]> = {
  diario: [0, 1, 2, 3, 4, 5],
  interdiario: [0, 2, 4],
};

function ChipsDias({ modalidad }: { modalidad: Modalidad }) {
  const activos = ACTIVOS[modalidad];
  const descripcion =
    modalidad === 'diario'
      ? 'Lunes a sábado, un ingreso por día'
      : 'Ejemplo: lunes, miércoles y viernes, día por medio';
  return (
    <div className="flex flex-col items-start gap-2 sm:items-center">
      <div className="flex gap-1.5" role="img" aria-label={descripcion}>
        {DIAS.map((d, i) => {
          const on = activos.includes(i);
          return (
            <span
              key={d}
              title={DIAS_LARGOS[i]}
              style={{ transitionDelay: `${i * 35}ms` }}
              className={`flex h-10 w-10 items-center justify-center rounded-full border text-sm font-semibold transition-colors duration-300 sm:h-11 sm:w-11 ${
                on ? 'border-bone bg-bone text-ink' : 'border-line text-muted/60'
              }`}
            >
              {d}
            </span>
          );
        })}
      </div>
      <p
        className={`text-xs text-muted transition-opacity duration-300 ${
          modalidad === 'interdiario' ? 'opacity-100' : 'opacity-0'
        }`}
        aria-hidden={modalidad !== 'interdiario'}
      >
        ejemplo, día por medio
      </p>
    </div>
  );
}

function PuntosVigencia({ dias, destacado }: { dias: number; destacado: boolean }) {
  return (
    <div>
      <div
        aria-hidden="true"
        className="grid w-fit gap-1"
        style={{ gridTemplateColumns: 'repeat(15, 6px)' }}
      >
        {Array.from({ length: dias }).map((_, i) => (
          <span
            key={i}
            className={`h-1.5 w-1.5 rounded-full ${destacado ? 'bg-bone/70' : 'bg-bone/35'}`}
          />
        ))}
      </div>
      <p className="mt-2.5 text-xs text-muted">{dias} días de corrido</p>
    </div>
  );
}

function Precio({ monto }: { monto: number }) {
  return (
    <p
      className="flex items-start font-[family-name:var(--font-archivo)] font-black italic leading-none text-bone"
      style={{ fontStretch: '115%', fontVariantNumeric: 'tabular-nums' }}
    >
      <span className="mr-1.5 mt-2 text-xl not-italic sm:text-2xl">S/</span>
      <span className="text-[4rem] tracking-tight sm:text-[4.5rem]">{montoSinMoneda(monto)}</span>
    </p>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-line bg-surface-2 px-2.5 py-1 text-xs font-medium text-bone tabular-nums">
      {children}
    </span>
  );
}

const INCLUYE = [
  { icono: LayoutGrid, texto: '6 zonas' },
  { icono: Users, texto: 'Asesoría en turno' },
  { icono: IdCard, texto: 'Control con tu DNI' },
  { icono: BadgeCheck, texto: 'Sin matrícula' },
];

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
    { id: '1', meses: '1 mes', dias: 30, precio: p1, alMes: null, ahorro: null, destacado: true },
    {
      id: '2',
      meses: '2 meses',
      dias: 60,
      precio: p2,
      alMes: Math.round(p2 / 2),
      ahorro: Math.max(0, p1 * 2 - p2),
      destacado: false,
    },
    {
      id: '3',
      meses: '3 meses',
      dias: 90,
      precio: p3,
      alMes: Math.round(p3 / 3),
      ahorro: Math.max(0, p1 * 3 - p3),
      destacado: false,
    },
  ];

  const pDia = precioPase(planes, 1);
  const pSemana = precioPase(planes, 7);

  return (
    <div className="space-y-12 sm:space-y-14">
      {/* Toggle + chips de días */}
      <div className="flex flex-col items-start gap-5 sm:items-center">
        <div
          role="group"
          aria-label="Modalidad de entrenamiento"
          className="grid w-full grid-cols-2 rounded-full border border-line bg-ink p-1 sm:w-auto"
        >
          {(['diario', 'interdiario'] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={modalidad === m}
              onClick={() => setModalidad(m)}
              className={`min-h-11 rounded-full px-8 text-sm font-semibold transition-colors duration-200 ${
                modalidad === m ? 'bg-bone text-ink' : 'text-muted hover:text-bone'
              }`}
            >
              {m === 'diario' ? 'Diario' : 'Interdiario'}
            </button>
          ))}
        </div>
        <ChipsDias modalidad={modalidad} />
      </div>

      {/* Tarjetas */}
      <div className="grid gap-5 md:grid-cols-3 md:items-stretch md:gap-6">
        {tarjetas.map((t) => (
          <article
            key={t.id}
            className={`relative flex flex-col border p-6 transition-transform duration-200 hover:-translate-y-1 sm:p-7 ${
              t.destacado
                ? 'border-brand/80 bg-ink shadow-[0_0_60px_-20px_rgba(255,194,26,0.35)] md:-my-5 md:py-11'
                : 'border-line/80 bg-ink/60 hover:border-muted/50'
            }`}
          >
            <div className="flex min-h-7 items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-bone">
                {t.meses} <span className="font-normal text-muted">· {t.dias} días</span>
              </h3>
              {t.destacado && (
                <span className="rounded-full bg-brand px-2.5 py-1 text-xs font-semibold text-brand-ink">
                  Más elegido
                </span>
              )}
            </div>

            <div key={`${modalidad}-${t.id}`} className="anim-swap mt-6">
              <Precio monto={t.precio} />
              <div className="mt-4 flex min-h-7 flex-wrap gap-2">
                {t.alMes !== null && <Pill>{formatoPrecioLanding(t.alMes)} al mes</Pill>}
                {t.ahorro ? <Pill>ahorras {formatoPrecioLanding(t.ahorro)}</Pill> : null}
              </div>
            </div>

            <div className="mt-8 flex flex-1 items-end">
              <PuntosVigencia dias={t.dias} destacado={t.destacado} />
            </div>

            <button
              type="button"
              onClick={() =>
                elegirPlanEIrAContacto(`${t.meses} (${etiqueta}) - ${formatoPrecioLanding(t.precio)}`)
              }
              className={`btn mt-8 w-full ${t.destacado ? 'btn-primary' : 'btn-secondary'}`}
            >
              Elegir plan
            </button>
          </article>
        ))}
      </div>

      {/* Qué incluye: 4 ítems con icono */}
      <ul className="grid grid-cols-2 gap-px overflow-hidden border border-line/70 bg-line/70 lg:grid-cols-4">
        {INCLUYE.map(({ icono: Icono, texto }) => (
          <li key={texto} className="flex items-center gap-3 bg-surface px-4 py-4 sm:px-5">
            <Icono aria-hidden="true" size={20} strokeWidth={1.5} className="shrink-0 text-muted" />
            <span className="text-sm font-medium text-bone">{texto}</span>
          </li>
        ))}
      </ul>

      {/* Pases tipo ticket */}
      <div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Ticket
            nombre="Por día"
            precio={pDia}
            detalle="Entra las veces que quieras ese día"
            icono={<InfinityIcon aria-hidden="true" size={20} strokeWidth={1.5} />}
          />
          <Ticket
            nombre="Semanal"
            precio={pSemana}
            detalle="7 días seguidos"
            icono={<CalendarDays aria-hidden="true" size={18} strokeWidth={1.5} />}
          />
        </div>

        <div className="mt-6 flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
          <a
            href="#contacto"
            onClick={(e) => irASeccion(e, '#contacto')}
            className="btn btn-secondary w-full sm:w-auto"
          >
            Pedir pase en recepción
          </a>
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-xs text-muted">Paga con</span>
            {PAGOS.map(({ icono: Icono, texto }) => (
              <span
                key={texto}
                className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs text-bone"
              >
                <Icono aria-hidden="true" size={13} strokeWidth={1.5} className="text-muted" />
                {texto}
              </span>
            ))}
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
    <div className="relative flex min-h-24 border border-line/80 bg-ink">
      <div className="flex w-28 shrink-0 flex-col justify-center px-5 sm:w-32">
        <span className="text-xs text-muted">{nombre}</span>
        <span
          className="mt-0.5 font-[family-name:var(--font-archivo)] text-3xl font-black italic leading-none text-bone"
          style={{ fontStretch: '115%', fontVariantNumeric: 'tabular-nums' }}
        >
          {formatoPrecioLanding(precio)}
        </span>
      </div>

      {/* Línea punteada con muescas */}
      <div className="relative w-px shrink-0 border-l border-dashed border-line" aria-hidden="true">
        <span
          className="absolute -left-3 -top-3 h-6 w-6 rounded-full border border-line/80 bg-surface"
          style={{ clipPath: 'inset(50% 0 0 0)' }}
        />
        <span
          className="absolute -bottom-3 -left-3 h-6 w-6 rounded-full border border-line/80 bg-surface"
          style={{ clipPath: 'inset(0 0 50% 0)' }}
        />
      </div>

      <div className="flex flex-1 items-center gap-3 px-5 py-4 text-sm text-bone">
        <span className="text-muted">{icono}</span>
        <span>{detalle}</span>
      </div>
    </div>
  );
}
