'use client';

import { useEffect, useState, type FormEvent, type MouseEvent, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { CheckCircle2, ChevronDown, Loader2, Menu, UserCheck, X } from 'lucide-react';
import { Logo } from '@/components/Logo';
import {
  formatoPrecioLanding,
  precioPase,
  precioPlan,
  type PlanLandingItem,
} from '@/lib/planes-landing';

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

/** Selecciona un plan en el formulario de inscripción y desplaza suavemente directo al formulario. */
export function elegirPlanEIrAContacto(planLabel: string) {
  window.dispatchEvent(new CustomEvent('zentra:select-plan', { detail: planLabel }));
  const destino = document.getElementById('inscripcion') || document.getElementById('contacto');
  if (destino) {
    destino.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.history.pushState(null, '', '#inscripcion');
    window.setTimeout(() => {
      const inputNombre = document.getElementById('lead-nombre') as HTMLInputElement | null;
      inputNombre?.focus({ preventScroll: true });
    }, 500);
  }
}

// ---------- 1. Header: Zonas, Planes, Horarios, Ubicación + Mi DNI + Inscríbete hoy ----------

const LINKS_NAV = [
  { href: '#disciplinas', label: 'Zonas' },
  { href: '#planes', label: 'Planes' },
  { href: '#horarios', label: 'Horarios' },
  { href: '#ubicacion', label: 'Ubicación' },
];

export function LandingHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [menuAbierto, setMenuAbierto] = useState(false);

  useEffect(() => {
    // Garantiza que la página siempre inicie desde el tope al recargar
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });

    const onBeforeUnload = () => {
      window.scrollTo(0, 0);
    };
    window.addEventListener('beforeunload', onBeforeUnload);

    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      window.removeEventListener('scroll', onScroll);
    };
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
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-8">
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

          <div className="hidden items-center gap-6 lg:flex">
            <Link
              href="/consulta"
              className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-bone"
            >
              <UserCheck size={15} strokeWidth={1.5} />
              Mi DNI
            </Link>
            <a
              href="#inscripcion"
              onClick={(e) => irASeccion(e, '#inscripcion')}
              className="btn btn-primary !px-5"
            >
              Inscríbete hoy
            </a>
          </div>

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
                className="flex min-h-14 items-baseline justify-between py-4 font-[family-name:var(--font-archivo)] text-3xl font-black uppercase italic text-bone"
                style={{ fontStretch: '115%' }}
              >
                <span>{item.label}</span>
                <span className="font-mono text-xs not-italic text-muted">0{idx + 1}</span>
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
              href="#inscripcion"
              onClick={(e) => irASeccion(e, '#inscripcion', () => setMenuAbierto(false))}
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

// ---------- 2. Pieza visual del Hero (carrusel de fotos reales cada 4 segundos) ----------

const HERO_SLIDES = [
  {
    src: '/brand/hero-01.jpg',
    alt: 'Sala principal de musculación y máquinas de palanca en Zentra Fitness',
    etiqueta: 'Sala principal · Peso libre',
  },
  {
    src: '/brand/hero-02.jpg',
    alt: 'Segundo nivel con grass sintético y zona de potencia en Zentra Fitness',
    etiqueta: 'Nivel 2 · Césped funcional',
  },
  {
    src: '/brand/hero-03.jpg',
    alt: 'Rack de mancuernas de hierro y bancas olímpicas en Zentra Fitness',
    etiqueta: 'Mancuernas y bancas olímpicas',
  },
  {
    src: '/brand/hero-04.jpg',
    alt: 'Trotadoras curvas mecánicas y prensa 45° en Zentra Fitness',
    etiqueta: 'Cardio curvo y prensa 45°',
  },
];

export function HeroVisualCard() {
  const [actual, setActual] = useState(0);
  const [enPausa, setEnPausa] = useState(false);

  useEffect(() => {
    if (enPausa) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = setInterval(() => {
      setActual((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [enPausa]);

  return (
    <div className="relative">
      {/* Halo atmosférico detrás de la tarjeta de foto */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-3 rounded-3xl bg-gradient-to-tr from-brand/20 via-brand/5 to-transparent blur-xl opacity-75"
      />
      <div
        onMouseEnter={() => setEnPausa(true)}
        onMouseLeave={() => setEnPausa(false)}
        className="relative overflow-hidden rounded-2xl border border-brand/30 bg-surface shadow-2xl group"
      >
        <div className="relative aspect-[4/3] lg:aspect-[4/4.5] bg-ink">
          {HERO_SLIDES.map((slide, idx) => (
            <div
              key={slide.src}
              className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                idx === actual ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
              }`}
            >
              <Image
                src={slide.src}
                alt={slide.alt}
                fill
                priority={idx === 0}
                sizes="(min-width: 1024px) 460px, 100vw"
                className="object-cover saturate-[.95]"
              />
            </div>
          ))}

          {/* Gradiente superior e inferior para contraste de badges */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/80 via-transparent to-ink/35 z-10" />

          {/* Badge superior */}
          <div className="absolute top-3.5 left-3.5 z-20 inline-flex items-center gap-2 rounded-full border border-brand/35 bg-ink/80 px-3 py-1 text-[11px] font-semibold text-bone backdrop-blur-md shadow-lg pointer-events-none">
            <span className="h-1.5 w-1.5 rounded-full bg-ok shadow-[0_0_6px_#22c55e]" />
            <span>Villa Estela · 6 zonas</span>
          </div>

          {/* Badge descriptivo de la foto actual */}
          <div className="absolute bottom-4 left-4 z-20 flex items-center gap-2 rounded-full border border-line/80 bg-ink/85 px-3.5 py-1.5 text-xs font-semibold text-bone backdrop-blur-md shadow-lg pointer-events-none">
            <span className="h-2 w-2 rounded-full bg-brand animate-pulse" />
            <span>{HERO_SLIDES[actual].etiqueta}</span>
          </div>

          {/* Indicadores de diapositiva interactivos */}
          <div className="absolute bottom-4 right-4 z-20 flex items-center gap-1.5 rounded-full border border-line/80 bg-ink/85 px-3 py-1.5 backdrop-blur-md shadow-lg">
            {HERO_SLIDES.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActual(idx)}
                aria-label={`Ver foto ${idx + 1} del gimnasio`}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === actual
                    ? 'w-6 bg-brand shadow-[0_0_8px_rgba(255,194,26,0.6)]'
                    : 'w-2 bg-bone/35 hover:bg-bone/80'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- 3. FAQ Corto (5 preguntas en acordeón) ----------

interface FaqItem {
  pregunta: string;
  respuesta: ReactNode;
}

const PREGUNTAS_FAQ: FaqItem[] = [
  { pregunta: '¿Hay matrícula?', respuesta: 'No, sin cobro de matrícula.' },
  {
    pregunta: '¿Puedo entrar más de una vez al día?',
    respuesta: 'Solo con el pase por día (S/ 10). Los planes permiten 1 ingreso por día.',
  },
  { pregunta: '¿Cómo cuentan los días de mi plan?', respuesta: 'De corrido, desde el día de inicio.' },
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
  { pregunta: '¿Cómo puedo pagar?', respuesta: 'Efectivo, Yape, Plin o tarjeta en recepción.' },
];

export function FaqAccordion() {
  const [abierta, setAbierta] = useState<number | null>(null);

  return (
    <div className="divide-y divide-line/80 border-y border-line/80">
      {PREGUNTAS_FAQ.map((item, idx) => {
        const activa = abierta === idx;
        const panelId = `faq-panel-${idx}`;
        return (
          <div
            key={item.pregunta}
            className={`transition-colors ${
              activa ? 'bg-ink/40 border-l-2 border-l-brand' : 'hover:bg-ink/20'
            }`}
          >
            <h3>
              <button
                type="button"
                onClick={() => setAbierta(activa ? null : idx)}
                aria-expanded={activa}
                aria-controls={panelId}
                className="flex min-h-16 w-full items-center justify-between gap-4 px-3 sm:px-4 py-4 text-left"
              >
                <span className="flex items-baseline gap-4">
                  <span
                    className={`font-mono text-xs font-bold transition-colors ${
                      activa ? 'text-brand' : 'text-muted'
                    }`}
                  >
                    0{idx + 1}
                  </span>
                  <span className="text-base font-semibold text-bone sm:text-lg">{item.pregunta}</span>
                </span>
                <ChevronDown
                  size={18}
                  strokeWidth={1.75}
                  aria-hidden="true"
                  className={`shrink-0 transition-transform duration-200 ${
                    activa ? 'rotate-180 text-brand' : 'text-muted'
                  }`}
                />
              </button>
            </h3>
            {activa && (
              <div id={panelId} className="anim-swap pb-5 pl-12 pr-8 text-sm leading-relaxed text-bone/80">
                {item.respuesta}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------- 4. Formulario de Contacto / Inscripción ----------

export function LeadContactForm({ planes }: { planes: PlanLandingItem[] }) {
  const opcionesPlanes = [
    `1 mes (Diario) - ${formatoPrecioLanding(precioPlan(planes, 30, 'diario'))}`,
    `1 mes (Interdiario) - ${formatoPrecioLanding(precioPlan(planes, 30, 'interdiario'))}`,
    `2 meses (Diario) - ${formatoPrecioLanding(precioPlan(planes, 60, 'diario'))}`,
    `2 meses (Interdiario) - ${formatoPrecioLanding(precioPlan(planes, 60, 'interdiario'))}`,
    `3 meses (Diario) - ${formatoPrecioLanding(precioPlan(planes, 90, 'diario'))}`,
    `3 meses (Interdiario) - ${formatoPrecioLanding(precioPlan(planes, 90, 'interdiario'))}`,
    `Semanal - ${formatoPrecioLanding(precioPase(planes, 7))}`,
    `Por día - ${formatoPrecioLanding(precioPase(planes, 1))}`,
  ];

  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [objetivo, setObjetivo] = useState(opcionesPlanes[0]);
  const [horario, setHorario] = useState('');
  const [empresa, setEmpresa] = useState(''); // Honeypot
  const [enviando, setEnviando] = useState(false);
  const [exito, setExito] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recienSeleccionado, setRecienSeleccionado] = useState(false);

  useEffect(() => {
    const onSelectPlan = (ev: Event) => {
      const custom = ev as CustomEvent<string>;
      if (typeof custom.detail === 'string' && custom.detail) {
        setObjetivo(custom.detail);
        setExito(false);
        setRecienSeleccionado(true);
        window.setTimeout(() => setRecienSeleccionado(false), 3500);
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
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre,
          telefono,
          objetivo,
          // La API exige el campo; si el visitante no elige, se envía "Por definir"
          horario: horario.trim() || 'Por definir',
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
        className="rounded-3xl border border-ok/40 bg-surface p-8 sm:p-10 shadow-2xl text-center"
      >
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-ok/15 text-ok mb-5 shadow-inner">
          <CheckCircle2 size={36} strokeWidth={2} />
        </div>
        <h4 className="text-2xl font-bold text-bone">¡Solicitud recibida con éxito!</h4>
        <p className="mt-2 text-sm text-muted max-w-md mx-auto leading-relaxed">
          Listo, te escribiremos por WhatsApp al instante para coordinar tu primer día en el gimnasio.
        </p>
        <button
          type="button"
          onClick={() => setExito(false)}
          className="btn btn-secondary mt-7 !px-6"
        >
          Enviar otra consulta
        </button>
      </div>
    );
  }

  return (
    <div
      id="lead-form"
      className={`relative overflow-hidden rounded-3xl border bg-surface p-6 sm:p-9 shadow-2xl transition-all duration-500 ${
        recienSeleccionado
          ? 'border-brand ring-2 ring-brand/80 shadow-[0_0_50px_-10px_rgba(255,194,26,0.35)]'
          : 'border-line'
      }`}
    >
      {/* Resplandor decorativo de fondo */}
      <div className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-brand/10 blur-3xl" />

      {recienSeleccionado && (
        <div className="mb-5 flex items-center justify-between gap-2 rounded-2xl border border-brand/60 bg-brand/10 p-3.5 text-xs font-semibold text-brand animate-swap">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-brand shrink-0" />
            <span>Plan seleccionado: <strong className="text-bone">{objetivo}</strong></span>
          </div>
          <span className="text-[10px] font-black uppercase tracking-wider text-brand/80 shrink-0">Listo</span>
        </div>
      )}

      <div className="mb-6 border-b border-line/70 pb-5">
        <span className="text-xs font-semibold uppercase tracking-wider text-brand">
          Inscripción inmediata
        </span>
        <h3 className="section-title mt-1 text-2xl sm:text-3xl">¿Listo para entrenar?</h3>
        <p className="mt-1.5 text-xs sm:text-sm text-muted">
          Completa tus datos y te contactaremos por WhatsApp para separar tu vacante sin matrícula.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4 relative z-10">
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
          <label htmlFor="lead-nombre" className="label font-medium text-bone/90">
            Nombre y apellido *
          </label>
          <input
            id="lead-nombre"
            type="text"
            required
            autoComplete="name"
            placeholder="Ej: Carlos Ramírez"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="field !bg-ink/80 focus:border-brand"
          />
        </div>

        <div>
          <label htmlFor="lead-telefono" className="label font-medium text-bone/90">
            Número de celular / WhatsApp *
          </label>
          <input
            id="lead-telefono"
            type="tel"
            required
            autoComplete="tel"
            inputMode="tel"
            placeholder="Ej: 998 180 873"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            className="field !bg-ink/80 tabular-nums focus:border-brand"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="lead-objetivo" className="label font-medium text-bone/90">
              Plan de interés
            </label>
            <select
              id="lead-objetivo"
              value={objetivo}
              onChange={(e) => setObjetivo(e.target.value)}
              className="field !bg-ink/80 tabular-nums focus:border-brand"
            >
              {opcionesPlanes.map((op) => (
                <option key={op} value={op}>
                  {op}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="lead-horario" className="label font-medium text-bone/90">
              Turno preferido <span className="text-muted/70">(opcional)</span>
            </label>
            <select
              id="lead-horario"
              value={horario}
              onChange={(e) => setHorario(e.target.value)}
              className="field !bg-ink/80 focus:border-brand"
            >
              <option value="">Sin preferencia</option>
              <option value="Mañana (6:00 am - 11:00 am)">Mañana (6:00 am - 11:00 am)</option>
              <option value="Mediodía (11:00 am - 4:00 pm)">Mediodía (11:00 am - 4:00 pm)</option>
              <option value="Tarde / Noche (4:00 pm - 10:30 pm)">Tarde / Noche (4:00 pm - 10:30 pm)</option>
              <option value="Sábados">Sábados (7:00 am - 10:00 pm)</option>
            </select>
          </div>
        </div>

        {error && (
          <p role="alert" className="rounded-xl border border-bad/40 bg-bad/15 px-4 py-2.5 text-xs font-medium text-bad">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={enviando}
          className="btn btn-primary w-full !min-h-13 !text-sm font-bold shadow-lg tracking-wide mt-2"
        >
          {enviando && <Loader2 size={16} strokeWidth={2} className="animate-spin" />}
          Quiero inscribirme ahora →
        </button>

        <p className="text-center text-[11px] text-muted pt-1">
          * Pagas directamente en recepción al iniciar tu plan (Efectivo, Yape, Plin o tarjeta).
        </p>
      </form>
    </div>
  );
}
