'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Activity,
  Check,
  ChevronDown,
  Dumbbell,
  Footprints,
  HeartPulse,
  PersonStanding,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { usePrefersReducedMotion, useInViewOnce } from '@/components/landing/Motion';

export type IconoZona = 'dumbbell' | 'footprints' | 'zap' | 'heart' | 'activity' | 'person';

export interface ZonaItem {
  num: string;
  nombre: string;
  enfoque: string;
  detalle: string;
  /** Texto corto de intensidad, p. ej. "Alta" */
  intensidad: string;
  /** Medidor de 1 a 5 */
  nivel: 1 | 2 | 3 | 4 | 5;
  icono: IconoZona;
  equipamiento: string[];
  /** Ruta pública opcional (/brand/zonas/zona-0X.jpg); si no existe se muestra el patrón. */
  imagen?: string;
}

const ICONOS: Record<IconoZona, LucideIcon> = {
  dumbbell: Dumbbell,
  footprints: Footprints,
  zap: Zap,
  heart: HeartPulse,
  activity: Activity,
  person: PersonStanding,
};

const AVANCE_MS = 6000;

function MedidorIntensidad({ nivel, texto }: { nivel: number; texto: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex gap-1" role="img" aria-label={`Intensidad ${nivel} de 5`}>
        {[1, 2, 3, 4, 5].map((i) => (
          <span
            key={i}
            className={`h-2.5 w-6 rounded-[2px] sm:w-7 transition-colors ${
              i <= nivel
                ? 'bg-brand shadow-[0_0_10px_rgba(255,194,26,0.35)]'
                : 'bg-line/80'
            }`}
          />
        ))}
      </div>
      <span className="text-sm font-semibold text-brand">{texto}</span>
    </div>
  );
}

function Chips({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((eq) => (
        <li
          key={eq}
          className="inline-flex items-center gap-1.5 rounded-full border border-line bg-ink/80 px-3 py-1.5 text-xs font-medium text-bone transition-colors hover:border-brand/40"
        >
          <Check size={12} strokeWidth={2.5} className="shrink-0 text-brand" aria-hidden="true" />
          {eq}
        </li>
      ))}
    </ul>
  );
}

/** Muestra la foto de la zona si existe en /public/brand/zonas/; si no, queda el patrón. */
function FotoZona({ src, alt }: { src: string; alt: string }) {
  const [estado, setEstado] = useState<'cargando' | 'ok' | 'error'>('cargando');
  if (estado === 'error') return null;
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        ref={(el) => {
          // Si la imagen ya estaba en caché antes de hidratar, onLoad no se dispara
          if (el?.complete && el.naturalWidth > 0) setEstado((e) => (e === 'cargando' ? 'ok' : e));
        }}
        onLoad={() => setEstado('ok')}
        onError={() => setEstado('error')}
        className={`absolute inset-0 h-full w-full object-cover saturate-[.88] transition-opacity duration-500 ${
          estado === 'ok' ? 'opacity-100' : 'opacity-0'
        }`}
      />
      {estado === 'ok' && (
        <div className="absolute inset-0 bg-gradient-to-t from-surface via-ink/45 to-ink/20" />
      )}
    </>
  );
}

function AreaVisual({ zona }: { zona: ZonaItem }) {
  const Icono = ICONOS[zona.icono];
  return (
    <div className="relative h-56 overflow-hidden border-b border-line/70 sm:h-64 lg:h-[17rem]">
      <div className="bg-gridlines absolute inset-0" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_30%,_rgba(255,194,26,0.10),_transparent_60%)]" />
      <Icono
        aria-hidden="true"
        strokeWidth={0.9}
        className="absolute right-6 top-1/2 h-40 w-40 -translate-y-1/2 text-bone/10 sm:h-48 sm:w-48"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-surface to-transparent" />
      {zona.imagen && (
        <FotoZona
          key={zona.imagen}
          src={zona.imagen}
          alt={`Zona de ${zona.nombre.toLowerCase()} en Zentra Fitness`}
        />
      )}
      <span
        aria-hidden="true"
        className="absolute bottom-3 left-6 font-[family-name:var(--font-archivo)] text-[6.5rem] font-black italic leading-none text-bone/20 sm:text-[8rem] pointer-events-none drop-shadow-md z-10"
        style={{ fontStretch: '125%' }}
      >
        {zona.num}
      </span>
    </div>
  );
}

export function ZonasShowcase({ items }: { items: ZonaItem[] }) {
  const [activa, setActiva] = useState(0);
  const [auto, setAuto] = useState(true);
  const reducido = usePrefersReducedMotion();
  const { ref, visto } = useInViewOnce<HTMLDivElement>(0.3);
  const timer = useRef<number | null>(null);

  const autoActivo = auto && !reducido && visto;

  // Avance automático cada 6 s hasta que el usuario interactúe
  useEffect(() => {
    if (!autoActivo) return;
    // En móvil (acordeón) no se avanza solo para no mover el contenido bajo el dedo
    if (!window.matchMedia('(min-width: 1024px)').matches) return;
    timer.current = window.setTimeout(() => {
      setActiva((a) => (a + 1) % items.length);
    }, AVANCE_MS);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [activa, autoActivo, items.length]);

  const seleccionar = (idx: number) => {
    setAuto(false);
    setActiva(idx);
  };

  const actual = items[activa] ?? items[0];

  return (
    <div ref={ref} className="grid items-start gap-8 lg:grid-cols-12 lg:gap-10">
      <div className="lg:col-span-5">
        <ul className="divide-y divide-line/80 border-y border-line/80">
          {items.map((d, idx) => {
            const abierta = activa === idx;
            const Icono = ICONOS[d.icono];
            return (
              <li key={d.num} className="relative">
                <button
                  type="button"
                  onClick={() => seleccionar(idx)}
                  onMouseEnter={() => {
                    if (window.matchMedia('(min-width: 1024px)').matches) seleccionar(idx);
                  }}
                  aria-expanded={abierta}
                  className={`group relative flex min-h-14 w-full items-center justify-between gap-4 border-l-2 px-4 py-4 text-left transition-all ${
                    abierta
                      ? 'border-l-brand bg-gradient-to-r from-brand/10 via-surface to-surface'
                      : 'border-l-transparent hover:bg-surface/50'
                  }`}
                >
                  <span className="flex items-baseline gap-4">
                    <span
                      className={`font-mono text-xs font-bold transition-colors ${
                        abierta ? 'text-brand' : 'text-muted'
                      }`}
                    >
                      {d.num}
                    </span>
                    <span
                      className={`text-base font-semibold tracking-tight transition-all duration-200 sm:text-lg ${
                        abierta ? 'translate-x-1 text-bone' : 'text-muted group-hover:text-bone'
                      }`}
                    >
                      {d.nombre}
                    </span>
                  </span>
                  <Icono
                    aria-hidden="true"
                    size={18}
                    strokeWidth={1.75}
                    className={`hidden shrink-0 transition-opacity lg:block ${
                      abierta ? 'text-brand opacity-100' : 'opacity-0'
                    }`}
                  />
                  <ChevronDown
                    aria-hidden="true"
                    size={16}
                    strokeWidth={1.5}
                    className={`shrink-0 transition-transform lg:hidden ${
                      abierta ? 'rotate-180 text-brand' : 'text-muted'
                    }`}
                  />
                  {abierta && autoActivo && (
                    <span
                      key={`prog-${d.num}`}
                      aria-hidden="true"
                      className="anim-progress hidden lg:block absolute inset-x-0 bottom-0 h-[2px] bg-brand/70"
                      style={{ animationDuration: `${AVANCE_MS}ms` }}
                    />
                  )}
                </button>

                {/* Móvil: acordeón bajo la fila */}
                {abierta && (
                  <div className="anim-swap overflow-hidden border-t border-line/60 bg-surface lg:hidden">
                    <AreaVisual zona={d} />
                    <div className="space-y-5 p-5">
                      <span className="inline-flex items-center rounded-full border border-brand/30 bg-brand/10 px-2.5 py-0.5 text-[11px] font-semibold text-brand">
                        {d.enfoque}
                      </span>
                      <p className="text-sm leading-relaxed text-bone/90">{d.detalle}</p>
                      <MedidorIntensidad nivel={d.nivel} texto={d.intensidad} />
                      <Chips items={d.equipamiento} />
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {/* Desktop: panel derecho con cross-fade */}
      <aside
        className="relative hidden overflow-hidden rounded-2xl border border-line/80 bg-surface shadow-2xl lg:col-span-7 lg:block"
      >
        <div key={actual.num} className="anim-swap">
          <AreaVisual zona={actual} />
          <div className="space-y-6 p-8">
            <div>
              <span className="inline-flex items-center rounded-full border border-brand/30 bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">
                {actual.enfoque}
              </span>
              <h3 className="section-title mt-2.5 text-2xl">{actual.nombre}</h3>
              <p className="mt-2.5 text-base leading-relaxed text-bone/80">{actual.detalle}</p>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-4 border-y border-line/60 py-4">
              <span className="text-xs font-medium uppercase tracking-wider text-muted">Nivel de exigencia</span>
              <MedidorIntensidad nivel={actual.nivel} texto={actual.intensidad} />
            </div>
            <Chips items={actual.equipamiento} />
          </div>
        </div>
      </aside>
    </div>
  );
}
