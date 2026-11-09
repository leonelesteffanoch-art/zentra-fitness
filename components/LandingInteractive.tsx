'use client';

import { useEffect, useRef, useState, type FormEvent, type MouseEvent, type ReactNode } from 'react';
import Link from 'next/link';
import {
  Check,
  CheckCircle2,
  ChevronDown,
  Loader2,
  Menu,
  UserCheck,
  X,
} from 'lucide-react';
import { Logo } from '@/components/Logo';

/** Formatea montos para la landing en soles sin decimales innecesarios y con fuente sans tabular. */
export function formatoPrecioLanding(n: number): string {
  const redondeado = Math.round(n * 100) / 100;
  return Number.isInteger(redondeado) ? `S/ ${redondeado}` : `S/ ${redondeado.toFixed(2)}`;
}

/** Desplazamiento suave garantizado hacia cualquier sección #id de la landing. */
export function irASeccion(e: MouseEvent<HTMLAnchorElement>, href: string, after?: () => void) {
  if (!href.startsWith('#')) return;
  const destino = document.getElementById(href.slice(1));
  if (!destino) return;
  e.preventDefault();
  after?.();
  destino.scrollIntoView({ behavior: 'smooth', block: 'start' });
  window.history.pushState(null, '', href);
}

/** Selecciona un plan en el formulario de inscripción y desplaza suavemente hacia #contacto. */
function elegirPlanEIrAContacto(planLabel: string) {
  window.dispatchEvent(new CustomEvent('zentra:select-plan', { detail: planLabel }));
  const destino = document.getElementById('contacto');
  if (destino) {
    destino.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.history.pushState(null, '', '#contacto');
    window.setTimeout(() => {
      const inputNombre = document.getElementById('lead-nombre') as HTMLInputElement | null;
      inputNombre?.focus({ preventScroll: true });
    }, 450);
  }
}

// ---------- 0. Micro-interacción: Reveal suave al hacer scroll (1 sola vez) ----------

export function RevealOnScroll({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={`${visible ? 'reveal-visible' : 'reveal-hidden'} ${className}`}>
      {children}
    </div>
  );
}

// ---------- 1. Header: Zonas, Planes, Horarios, Ubicación + Mi DNI + Inscríbete hoy ----------

const LINKS_NAV = [
  { href: '#disciplinas', label: 'Zonas' },
  { href: '#planes', label: 'Planes' },
  { href: '#horarios', label: 'Horarios' },
  { href: '#contacto', label: 'Ubicación' },
];

export function LandingHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [menuAbierto, setMenuAbierto] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <header
        className={`sticky top-0 z-40 transition-colors duration-200 ${
          scrolled
            ? 'border-b border-line/80 bg-ink/95 backdrop-blur-md'
            : 'border-b border-line/40 bg-ink'
        }`}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-8 sm:py-4">
          <Link href="/" aria-label="Zentra Fitness - Inicio" className="shrink-0">
            <Logo className="w-32 sm:w-36" />
          </Link>

          <nav aria-label="Navegación principal" className="hidden items-center gap-8 lg:flex">
            {LINKS_NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={(e) => irASeccion(e, item.href)}
                className="inline-flex min-h-11 items-center text-sm font-medium text-muted transition-colors hover:text-bone"
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* Acciones en desktop: Mi DNI + único botón primario */}
          <div className="hidden items-center gap-6 lg:flex">
            <Link
              href="/consulta"
              className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-bone"
            >
              <UserCheck size={15} strokeWidth={1.5} />
              Mi DNI
            </Link>
            <a
              href="#contacto"
              onClick={(e) => irASeccion(e, '#contacto')}
              className="btn btn-primary !px-5"
            >
              Inscríbete hoy
            </a>
          </div>

          {/* Acciones en móvil: Mi DNI + botón de menú */}
          <div className="flex items-center gap-1.5 lg:hidden">
            <Link
              href="/consulta"
              className="inline-flex min-h-11 items-center gap-1.5 px-3 text-xs font-medium text-muted transition-colors hover:text-bone"
            >
              <UserCheck size={15} strokeWidth={1.5} />
              <span>Mi DNI</span>
            </Link>
            <button
              type="button"
              onClick={() => setMenuAbierto(true)}
              className="btn btn-ghost !min-h-11 !min-w-11 !px-2.5"
              aria-label="Abrir menú"
            >
              <Menu size={20} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </header>

      {/* Menú móvil a pantalla completa */}
      {menuAbierto && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Menú de navegación"
          className="fixed inset-0 z-50 flex flex-col justify-between bg-ink px-5 py-5 lg:hidden"
        >
          <div className="flex items-center justify-between border-b border-line/80 pb-4">
            <Logo className="w-32" />
            <button
              type="button"
              onClick={() => setMenuAbierto(false)}
              className="btn btn-ghost !min-h-11 !min-w-11 !px-3"
              aria-label="Cerrar menú"
            >
              <X size={20} strokeWidth={1.5} />
            </button>
          </div>

          <nav className="my-auto flex flex-col divide-y divide-line/70">
            {LINKS_NAV.map((item, idx) => (
              <a
                key={item.href}
                href={item.href}
                onClick={(e) => irASeccion(e, item.href, () => setMenuAbierto(false))}
                className="flex min-h-14 items-baseline justify-between py-4 text-xl font-semibold text-bone"
              >
                <span>{item.label}</span>
                <span className="font-mono text-xs text-muted">0{idx + 1}</span>
              </a>
            ))}
          </nav>

          <div className="space-y-3 border-t border-line/70 pt-5">
            <Link
              href="/consulta"
              onClick={() => setMenuAbierto(false)}
              className="flex min-h-11 items-center justify-center gap-2 bg-surface px-4 py-3 text-sm font-medium text-bone transition-colors hover:bg-surface-2"
            >
              <UserCheck size={16} strokeWidth={1.5} className="text-muted" />
              Mi DNI
            </Link>
            <a
              href="#contacto"
              onClick={(e) => irASeccion(e, '#contacto', () => setMenuAbierto(false))}
              className="btn btn-primary w-full"
            >
              Inscríbete hoy
            </a>
          </div>
        </div>
      )}
    </>
  );
}

// ---------- 2. Pieza visual del Hero con fallback editorial elegante ----------

export function HeroVisualCard() {
  const [srcActual, setSrcActual] = useState<string>('/brand/hero.jpg');
  const [mostrarImg, setMostrarImg] = useState(false);

  return (
    <div className="relative overflow-hidden border border-line/80 bg-surface">
      <div className="bg-grain relative aspect-[16/10] sm:aspect-[4/3] lg:aspect-[4/4.5]">
        {/* Composición atmosférica base: luce completa aunque no exista fotografía */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_70%_25%,_rgba(255,194,26,0.12),_transparent_60%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 flex items-center justify-center p-8 select-none"
        >
          <Logo className="w-3/4 max-w-xs opacity-20" />
        </div>

        {/* Fotografía con ruta lista (/brand/hero.jpg -> fallback /brand/zentra-cover.jpg) */}
        {srcActual && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={srcActual}
            alt="Sala de entrenamiento de Zentra Fitness en Villa Estela, Ancón"
            onLoad={() => setMostrarImg(true)}
            onError={() => {
              if (srcActual === '/brand/hero.jpg') {
                setSrcActual('/brand/zentra-cover.jpg');
              } else {
                setSrcActual('');
                setMostrarImg(false);
              }
            }}
            className={`h-full w-full object-cover saturate-50 transition-opacity duration-500 ${
              mostrarImg ? 'opacity-80' : 'opacity-0'
            }`}
          />
        )}

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink via-ink/30 to-transparent" />

        {/* Diferencial único del DNI en tarjeta inferior */}
        <div className="absolute bottom-4 left-4 right-4 border border-line/80 bg-ink/90 p-4 backdrop-blur-xs sm:bottom-5 sm:left-5 sm:right-5">
          <div className="flex items-center justify-between text-xs text-muted">
            <span className="inline-flex items-center gap-1.5 font-medium text-bone">
              <span className="h-1.5 w-1.5 rounded-full bg-brand" />
              Portal de socio
            </span>
            <span className="font-mono text-[11px] text-muted">DNI ACTIVO</span>
          </div>
          <p className="mt-1.5 text-sm font-medium text-bone">
            Consulta tus días y tu vencimiento con tu DNI.
          </p>
        </div>
      </div>
    </div>
  );
}

// ---------- 3. Zonas de entrenamiento: lista limpia a la izquierda + detalle a la derecha ----------

export interface DisciplinaItem {
  num: string;
  nombre: string;
  enfoque: string;
  detalle: string;
  intensidad: string;
  equipamiento: string[];
  imagen?: string;
}

function ZonaImageSlot({ src, alt }: { src?: string; alt: string }) {
  const [cargada, setCargada] = useState(false);
  const [fallo, setFallo] = useState(false);

  if (!src || fallo) return null;

  return (
    <div
      className={`overflow-hidden transition-all duration-300 ${
        cargada ? 'mb-6 aspect-[21/9] border border-line/70 bg-ink' : 'h-0'
      }`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        onLoad={() => setCargada(true)}
        onError={() => setFallo(true)}
        className="h-full w-full object-cover opacity-85 saturate-75"
      />
    </div>
  );
}

export function DisciplinasAccordion({ items }: { items: DisciplinaItem[] }) {
  const [activa, setActiva] = useState<number>(0);
  const actual = items[activa] ?? items[0];

  return (
    <div className="grid items-start gap-8 lg:grid-cols-12 lg:gap-10">
      <ul className="divide-y divide-line/80 border-y border-line/80 lg:col-span-5">
        {items.map((d, idx) => {
          const abierta = activa === idx;
          return (
            <li key={d.num}>
              <button
                type="button"
                onMouseEnter={() => setActiva(idx)}
                onFocus={() => setActiva(idx)}
                onClick={() => setActiva(idx)}
                aria-expanded={abierta}
                className={`flex min-h-14 w-full items-center justify-between gap-4 px-2 py-4 text-left transition-colors sm:px-3 ${
                  abierta ? 'bg-surface/60' : 'hover:bg-surface/30'
                }`}
              >
                <div className="flex items-baseline gap-3.5 sm:gap-4">
                  <span
                    className={`font-mono text-xs transition-colors ${
                      abierta ? 'text-brand' : 'text-muted'
                    }`}
                  >
                    {d.num}
                  </span>
                  <span
                    className={`text-base font-semibold tracking-tight transition-colors sm:text-lg ${
                      abierta ? 'text-bone' : 'text-muted hover:text-bone'
                    }`}
                  >
                    {d.nombre}
                  </span>
                </div>
                <ChevronDown
                  size={16}
                  strokeWidth={1.5}
                  className={`shrink-0 text-muted transition-transform lg:hidden ${
                    abierta ? 'rotate-180 text-bone' : ''
                  }`}
                />
              </button>

              {/* En móvil: acordeón bajo la fila */}
              {abierta && (
                <div className="space-y-4 px-3 pb-5 pt-2 text-sm lg:hidden">
                  <span className="inline-block rounded-xs bg-surface-2 px-2.5 py-0.5 text-xs font-medium text-muted">
                    {d.enfoque}
                  </span>
                  <p className="leading-relaxed text-bone/90">{d.detalle}</p>

                  <div className="space-y-1.5 pt-1">
                    <p className="text-xs font-medium text-muted">Equipamiento</p>
                    <ul className="grid grid-cols-1 gap-1.5 text-xs text-bone sm:grid-cols-2">
                      {d.equipamiento.map((eq) => (
                        <li key={eq} className="flex items-center gap-2">
                          <Check size={13} strokeWidth={1.75} className="shrink-0 text-muted" />
                          <span>{eq}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="border-t border-line/60 pt-3 text-xs text-muted">
                    Intensidad: <strong className="font-medium text-bone">{d.intensidad}</strong>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {/* En desktop: detalle solo en el panel derecho */}
      {actual && (
        <aside className="bg-grain relative hidden flex-col justify-between overflow-hidden border border-line/80 bg-surface p-8 lg:col-span-7 lg:flex">
          <ZonaImageSlot key={actual.num} src={actual.imagen} alt={actual.nombre} />

          <div className="flex items-start justify-between border-b border-line/70 pb-6">
            <div>
              <span className="inline-block rounded-xs bg-surface-2 px-2.5 py-1 text-xs font-medium text-muted">
                {actual.enfoque}
              </span>
              <h3 className="section-title mt-3 text-2xl sm:text-3xl">{actual.nombre}</h3>
            </div>
            <span className="font-mono text-4xl font-bold leading-none text-bone/15 select-none">
              {actual.num}
            </span>
          </div>

          <p className="mt-6 text-base leading-relaxed text-muted">{actual.detalle}</p>

          <div className="mt-7 border border-line/60 bg-ink/60 p-5">
            <p className="text-xs font-medium text-muted">Equipamiento</p>
            <ul className="mt-3 grid grid-cols-2 gap-3 text-sm text-bone">
              {actual.equipamiento.map((eq) => (
                <li key={eq} className="flex items-center gap-2.5">
                  <Check size={15} strokeWidth={1.75} className="shrink-0 text-muted" />
                  <span>{eq}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-7 flex items-center justify-between border-t border-line/70 pt-5 text-xs">
            <span className="text-muted">Intensidad</span>
            <span className="text-sm font-semibold text-bone">{actual.intensidad}</span>
          </div>
        </aside>
      )}
    </div>
  );
}

// ---------- 4. Planes: Toggle Diario / Interdiario + 3 tarjetas de datos + Pases ----------

export interface PlanLandingItem {
  id: string;
  nombre: string;
  descripcion: string | null;
  duracion_dias: number;
  precio: number;
}

/**
 * Busca el plan correspondiente en Supabase evitando que 'interdiario' coincida con 'diario'.
 */
export function buscarPlanPorModalidad(
  planes: PlanLandingItem[],
  duracionDias: number,
  modalidad: 'diario' | 'interdiario'
): PlanLandingItem | undefined {
  return planes.find((p) => {
    if (p.duracion_dias !== duracionDias) return false;
    const nombre = p.nombre.toLowerCase();
    if (modalidad === 'interdiario') {
      return nombre.includes('interdiario');
    }
    return nombre.includes('diario') && !nombre.includes('interdiario');
  });
}

export function PlanesPricingSection({ planes }: { planes: PlanLandingItem[] }) {
  const [modalidad, setModalidad] = useState<'diario' | 'interdiario'>('diario');

  const plan1Mes = buscarPlanPorModalidad(planes, 30, modalidad) ?? {
    id: `m-30-${modalidad}`,
    nombre: modalidad === 'diario' ? 'Mensual (Diario)' : 'Mensual (Interdiario)',
    precio: modalidad === 'diario' ? 80 : 60,
    duracion_dias: 30,
    descripcion: null,
  };

  const plan2Meses = buscarPlanPorModalidad(planes, 60, modalidad) ?? {
    id: `m-60-${modalidad}`,
    nombre: modalidad === 'diario' ? '2 meses (Diario)' : '2 meses (Interdiario)',
    precio: modalidad === 'diario' ? 140 : 100,
    duracion_dias: 60,
    descripcion: null,
  };

  const plan3Meses = buscarPlanPorModalidad(planes, 90, modalidad) ?? {
    id: `m-90-${modalidad}`,
    nombre: modalidad === 'diario' ? '3 meses (Diario)' : '3 meses (Interdiario)',
    precio: modalidad === 'diario' ? 200 : 150,
    duracion_dias: 90,
    descripcion: null,
  };

  const planDia = planes.find((p) => p.duracion_dias === 1) ?? {
    id: 'por-dia',
    nombre: 'Por día',
    precio: 10,
    duracion_dias: 1,
    descripcion: null,
  };

  const planSemana = planes.find((p) => p.duracion_dias === 7) ?? {
    id: 'semanal',
    nombre: 'Semanal',
    precio: 25,
    duracion_dias: 7,
    descripcion: null,
  };

  // Cálculo real de costo mensual y ahorro respecto al plan de 1 mes
  const precioBaseMensual = plan1Mes.precio;
  const alMes2 = Math.round(plan2Meses.precio / 2);
  const ahorro2 = Math.max(0, precioBaseMensual * 2 - plan2Meses.precio);
  const alMes3 = Math.round(plan3Meses.precio / 3);
  const ahorro3 = Math.max(0, precioBaseMensual * 3 - plan3Meses.precio);

  const etiquetaModalidad = modalidad === 'diario' ? 'Diario' : 'Interdiario';

  const tarjetas = [
    {
      id: '1-mes',
      encabezado: '1 mes · 30 días',
      precio: plan1Mes.precio,
      detalleAhorro: null as string | null,
      destacado: true,
      tag: 'Más elegido' as string | null,
      valorFormulario: `1 mes (${etiquetaModalidad}) - ${formatoPrecioLanding(plan1Mes.precio)}`,
    },
    {
      id: '2-meses',
      encabezado: '2 meses · 60 días',
      precio: plan2Meses.precio,
      detalleAhorro: `${formatoPrecioLanding(alMes2)} al mes · ahorras ${formatoPrecioLanding(ahorro2)}`,
      destacado: false,
      tag: null as string | null,
      valorFormulario: `2 meses (${etiquetaModalidad}) - ${formatoPrecioLanding(plan2Meses.precio)}`,
    },
    {
      id: '3-meses',
      encabezado: '3 meses · 90 días',
      precio: plan3Meses.precio,
      detalleAhorro: `${formatoPrecioLanding(alMes3)} al mes · ahorras ${formatoPrecioLanding(ahorro3)}`,
      destacado: false,
      tag: null as string | null,
      valorFormulario: `3 meses (${etiquetaModalidad}) - ${formatoPrecioLanding(plan3Meses.precio)}`,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Toggle Diario | Interdiario */}
      <div className="flex flex-col items-start sm:items-center">
        <div
          role="group"
          aria-label="Modalidad de entrenamiento"
          className="inline-grid w-full grid-cols-2 rounded-xs border border-line bg-ink p-1 sm:w-auto"
        >
          <button
            type="button"
            aria-pressed={modalidad === 'diario'}
            onClick={() => setModalidad('diario')}
            className={`min-h-11 rounded-xs px-6 text-sm font-semibold transition-all duration-200 ${
              modalidad === 'diario'
                ? 'bg-brand text-brand-ink'
                : 'text-muted hover:text-bone'
            }`}
          >
            Diario
          </button>
          <button
            type="button"
            aria-pressed={modalidad === 'interdiario'}
            onClick={() => setModalidad('interdiario')}
            className={`min-h-11 rounded-xs px-6 text-sm font-semibold transition-all duration-200 ${
              modalidad === 'interdiario'
                ? 'bg-brand text-brand-ink'
                : 'text-muted hover:text-bone'
            }`}
          >
            Interdiario
          </button>
        </div>

        <p className="mt-3 text-sm text-muted">
          {modalidad === 'diario'
            ? 'Lunes a sábado, un ingreso por día.'
            : '3 veces por semana, día por medio.'}
        </p>
      </div>

      {/* 3 tarjetas limpias, solo datos */}
      <div className="grid gap-5 md:grid-cols-3">
        {tarjetas.map((t) => (
          <article
            key={`${modalidad}-${t.id}`}
            className={`flex flex-col justify-between border p-6 transition-colors duration-200 sm:p-7 ${
              t.destacado
                ? 'border-brand/70 bg-ink'
                : 'border-line/80 bg-ink/70 hover:border-muted/60'
            }`}
          >
            <div>
              <div className="flex min-h-6 items-center justify-between gap-2">
                <h3 className="text-sm font-medium text-muted">{t.encabezado}</h3>
                {t.tag && (
                  <span className="rounded-xs bg-brand px-2.5 py-0.5 text-xs font-semibold text-brand-ink">
                    {t.tag}
                  </span>
                )}
              </div>

              <div className="mt-5 tabular-nums">
                <p className="text-4xl font-bold tracking-tight text-bone sm:text-5xl">
                  {formatoPrecioLanding(t.precio)}
                </p>
                <p className="mt-2 min-h-5 text-sm text-muted">
                  {t.detalleAhorro ?? '\u00A0'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => elegirPlanEIrAContacto(t.valorFormulario)}
              className={`btn mt-8 w-full ${t.destacado ? 'btn-primary' : 'btn-secondary'}`}
            >
              Elegir plan
            </button>
          </article>
        ))}
      </div>

      {/* Única línea bajo las tarjetas */}
      <p className="text-center text-sm text-muted">
        30 · 60 · 90 días de corrido. Incluye las 6 zonas, asesoría en turno y control de
        asistencia con tu DNI.
      </p>

      {/* Pases cortos */}
      <div className="flex flex-col items-start justify-between gap-4 border border-line/80 bg-ink/70 p-5 sm:flex-row sm:items-center sm:p-6">
        <div className="flex flex-col gap-1.5 text-sm sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-8 sm:gap-y-2">
          <p className="text-bone tabular-nums">
            <strong className="font-semibold">
              Por día {formatoPrecioLanding(planDia.precio)}
            </strong>{' '}
            <span className="text-muted">· entra las veces que quieras ese día</span>
          </p>
          <p className="text-bone tabular-nums">
            <strong className="font-semibold">
              Semanal {formatoPrecioLanding(planSemana.precio)}
            </strong>{' '}
            <span className="text-muted">· 7 días seguidos</span>
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            elegirPlanEIrAContacto(`Por día - ${formatoPrecioLanding(planDia.precio)}`)
          }
          className="btn btn-secondary w-full shrink-0 sm:w-auto"
        >
          Pedir pase en recepción
        </button>
      </div>

      {/* Línea de métodos de pago */}
      <p className="text-center text-xs text-muted">
        Paga con efectivo, Yape, Plin o tarjeta.
      </p>
    </div>
  );
}

// ---------- 5. FAQ Corto (5 preguntas en acordeón) ----------

export interface FaqItem {
  pregunta: string;
  respuesta: ReactNode;
}

const PREGUNTAS_FAQ: FaqItem[] = [
  {
    pregunta: '¿Hay matrícula?',
    respuesta: 'No, sin cobro de matrícula.',
  },
  {
    pregunta: '¿Puedo entrar más de una vez al día?',
    respuesta: 'Solo con el pase por día (S/ 10). Los planes permiten 1 ingreso por día.',
  },
  {
    pregunta: '¿Cómo cuentan los días de mi plan?',
    respuesta: 'De corrido, desde el día de inicio.',
  },
  {
    pregunta: '¿Cómo sé cuándo vence mi plan?',
    respuesta: (
      <>
        Ingresa tu DNI en{' '}
        <Link href="/consulta" className="font-medium text-bone underline underline-offset-2">
          Consultar mi DNI
        </Link>{' '}
        y verás tus días y tu vencimiento.
      </>
    ),
  },
  {
    pregunta: '¿Cómo puedo pagar?',
    respuesta: 'Efectivo, Yape, Plin o tarjeta en recepción.',
  },
];

export function FaqAccordion() {
  const [abierta, setAbierta] = useState<number | null>(0);

  return (
    <div className="divide-y divide-line/80 border-y border-line/80">
      {PREGUNTAS_FAQ.map((item, idx) => {
        const activa = abierta === idx;
        return (
          <div key={item.pregunta}>
            <button
              type="button"
              onClick={() => setAbierta(activa ? null : idx)}
              aria-expanded={activa}
              className="flex min-h-14 w-full items-center justify-between gap-4 py-4 text-left transition-colors hover:text-bone"
            >
              <span className="text-base font-semibold text-bone">{item.pregunta}</span>
              <ChevronDown
                size={18}
                strokeWidth={1.5}
                className={`shrink-0 text-muted transition-transform duration-200 ${
                  activa ? 'rotate-180 text-bone' : ''
                }`}
              />
            </button>
            {activa && (
              <div className="pb-5 pr-8 text-sm leading-relaxed text-muted">{item.respuesta}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------- 6. Formulario de Contacto / Inscripción ----------

export function LeadContactForm({ planes }: { planes: PlanLandingItem[] }) {
  const p1Diario = buscarPlanPorModalidad(planes, 30, 'diario')?.precio ?? 80;
  const p1Inter = buscarPlanPorModalidad(planes, 30, 'interdiario')?.precio ?? 60;
  const p2Diario = buscarPlanPorModalidad(planes, 60, 'diario')?.precio ?? 140;
  const p2Inter = buscarPlanPorModalidad(planes, 60, 'interdiario')?.precio ?? 100;
  const p3Diario = buscarPlanPorModalidad(planes, 90, 'diario')?.precio ?? 200;
  const p3Inter = buscarPlanPorModalidad(planes, 90, 'interdiario')?.precio ?? 150;
  const pSemana = planes.find((p) => p.duracion_dias === 7)?.precio ?? 25;
  const pDia = planes.find((p) => p.duracion_dias === 1)?.precio ?? 10;

  const opcionesPlanes = [
    `1 mes (Diario) - ${formatoPrecioLanding(p1Diario)}`,
    `1 mes (Interdiario) - ${formatoPrecioLanding(p1Inter)}`,
    `2 meses (Diario) - ${formatoPrecioLanding(p2Diario)}`,
    `2 meses (Interdiario) - ${formatoPrecioLanding(p2Inter)}`,
    `3 meses (Diario) - ${formatoPrecioLanding(p3Diario)}`,
    `3 meses (Interdiario) - ${formatoPrecioLanding(p3Inter)}`,
    `Semanal - ${formatoPrecioLanding(pSemana)}`,
    `Por día - ${formatoPrecioLanding(pDia)}`,
  ];

  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [objetivo, setObjetivo] = useState(opcionesPlanes[0]);
  const [horario, setHorario] = useState('');
  const [empresa, setEmpresa] = useState(''); // Honeypot
  const [enviando, setEnviando] = useState(false);
  const [exito, setExito] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onSelectPlan = (ev: Event) => {
      const custom = ev as CustomEvent<string>;
      if (typeof custom.detail === 'string' && custom.detail) {
        setObjetivo(custom.detail);
        setExito(false);
      }
    };
    window.addEventListener('zentra:select-plan', onSelectPlan);
    return () => window.removeEventListener('zentra:select-plan', onSelectPlan);
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      const horarioEnvio = horario.trim() || 'Por definir';
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre,
          telefono,
          objetivo,
          horario: horarioEnvio,
          empresa,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'No se pudo enviar tu solicitud. Revisa tus datos e intenta de nuevo.');
      } else {
        setExito(true);
        setNombre('');
        setTelefono('');
        setHorario('');
      }
    } catch {
      setError('Error de conexión. Verifica tu red e intenta nuevamente.');
    } finally {
      setEnviando(false);
    }
  }

  if (exito) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="border border-line/80 bg-ink p-6 sm:p-8"
      >
        <div className="flex items-center gap-2.5 text-ok">
          <CheckCircle2 size={20} strokeWidth={1.5} />
          <p className="text-base font-semibold text-bone">
            Listo, te escribimos por WhatsApp en breve.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setExito(false)}
          className="btn btn-secondary mt-5"
        >
          Enviar otra consulta
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 border border-line/80 bg-ink p-5 sm:p-8">
      <input
        type="text"
        name="empresa"
        tabIndex={-1}
        autoComplete="off"
        value={empresa}
        onChange={(e) => setEmpresa(e.target.value)}
        className="hidden"
        aria-hidden="true"
      />

      <div>
        <label htmlFor="lead-nombre" className="label">
          Nombre *
        </label>
        <input
          id="lead-nombre"
          type="text"
          required
          placeholder="Tu nombre y apellido"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="field !bg-surface"
        />
      </div>

      <div>
        <label htmlFor="lead-telefono" className="label">
          Celular / WhatsApp *
        </label>
        <input
          id="lead-telefono"
          type="tel"
          required
          placeholder="Ej: 998 180 873"
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          className="field !bg-surface tabular-nums"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="lead-objetivo" className="label">
            Plan de interés
          </label>
          <select
            id="lead-objetivo"
            value={objetivo}
            onChange={(e) => setObjetivo(e.target.value)}
            className="field !bg-surface tabular-nums"
          >
            {opcionesPlanes.map((op) => (
              <option key={op} value={op}>
                {op}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="lead-horario" className="label">
            Horario en el que sueles entrenar <span className="text-muted/70">(opcional)</span>
          </label>
          <select
            id="lead-horario"
            value={horario}
            onChange={(e) => setHorario(e.target.value)}
            className="field !bg-surface"
          >
            <option value="">Sin preferencia</option>
            <option value="Mañana (6:00 am - 11:00 am)">Mañana (6:00 am - 11:00 am)</option>
            <option value="Mediodía (11:00 am - 4:00 pm)">Mediodía (11:00 am - 4:00 pm)</option>
            <option value="Tarde / Noche (4:00 pm - 10:30 pm)">
              Tarde / Noche (4:00 pm - 10:30 pm)
            </option>
            <option value="Fin de semana">Fin de semana</option>
          </select>
        </div>
      </div>

      {error && (
        <p role="alert" className="border-l-2 border-bad bg-bad/10 px-3 py-2 text-xs text-bad">
          {error}
        </p>
      )}

      <button type="submit" disabled={enviando} className="btn btn-primary w-full">
        {enviando && <Loader2 size={16} strokeWidth={1.5} className="animate-spin" />}
        Separa tu inscripción
      </button>
    </form>
  );
}
