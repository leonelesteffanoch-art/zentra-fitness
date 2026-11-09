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

/** Selecciona un plan en el formulario de inscripción y desplaza suavemente hacia #contacto. */
export function elegirPlanEIrAContacto(planLabel: string) {
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
              href="#contacto"
              onClick={(e) => irASeccion(e, '#contacto')}
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

// ---------- 2. Pieza visual del Hero (foto real del gimnasio) ----------

export function HeroVisualCard() {
  return (
    <div className="relative overflow-hidden border border-line/80 bg-surface">
      <div className="relative aspect-[4/3] lg:aspect-[4/4.6]">
        <Image
          src="/brand/hero.jpg"
          alt="Socios entrenando en la sala de Zentra Fitness, Villa Estela"
          fill
          priority
          sizes="(min-width: 1024px) 460px, 100vw"
          className="object-cover saturate-[.85]"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink via-ink/10 to-transparent" />

        {/* Diferencial único del DNI */}
        <div className="absolute bottom-4 left-4 right-4 border border-line/80 bg-ink/85 p-4 backdrop-blur-sm sm:bottom-5 sm:left-5 sm:right-5">
          <p className="flex items-center gap-2 text-sm font-medium text-bone">
            <UserCheck size={16} strokeWidth={1.5} className="shrink-0 text-muted" aria-hidden="true" />
            Consulta tus días y tu vencimiento con tu DNI.
          </p>
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
  const [abierta, setAbierta] = useState<number | null>(0);

  return (
    <div className="divide-y divide-line/80 border-y border-line/80">
      {PREGUNTAS_FAQ.map((item, idx) => {
        const activa = abierta === idx;
        const panelId = `faq-panel-${idx}`;
        return (
          <div key={item.pregunta}>
            <h3>
              <button
                type="button"
                onClick={() => setAbierta(activa ? null : idx)}
                aria-expanded={activa}
                aria-controls={panelId}
                className="flex min-h-16 w-full items-center justify-between gap-4 py-4 text-left"
              >
                <span className="flex items-baseline gap-4">
                  <span className="font-mono text-xs text-muted">0{idx + 1}</span>
                  <span className="text-base font-semibold text-bone sm:text-lg">{item.pregunta}</span>
                </span>
                <ChevronDown
                  size={18}
                  strokeWidth={1.5}
                  aria-hidden="true"
                  className={`shrink-0 text-muted transition-transform duration-200 ${
                    activa ? 'rotate-180 text-bone' : ''
                  }`}
                />
              </button>
            </h3>
            {activa && (
              <div id={panelId} className="anim-swap pb-5 pl-9 pr-8 text-sm leading-relaxed text-muted">
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
      <div role="status" aria-live="polite" className="border border-line/80 bg-ink p-6 sm:p-8">
        <div className="flex items-center gap-2.5 text-ok">
          <CheckCircle2 size={20} strokeWidth={1.5} />
          <p className="text-base font-semibold text-bone">Listo, te escribimos por WhatsApp en breve.</p>
        </div>
        <button type="button" onClick={() => setExito(false)} className="btn btn-secondary mt-5">
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
          autoComplete="name"
          placeholder="Tu nombre y apellido"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="field"
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
          autoComplete="tel"
          inputMode="tel"
          placeholder="Ej: 987 654 321"
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          className="field tabular-nums"
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
            className="field tabular-nums"
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
            className="field"
          >
            <option value="">Sin preferencia</option>
            <option value="Mañana (6:00 am - 11:00 am)">Mañana (6:00 am - 11:00 am)</option>
            <option value="Mediodía (11:00 am - 4:00 pm)">Mediodía (11:00 am - 4:00 pm)</option>
            <option value="Tarde / Noche (4:00 pm - 10:30 pm)">Tarde / Noche (4:00 pm - 10:30 pm)</option>
            <option value="Fin de semana">Fin de semana</option>
          </select>
        </div>
      </div>

      {error && (
        <p role="alert" className="border-l-2 border-bad bg-bad/10 px-3 py-2 text-sm text-bad">
          {error}
        </p>
      )}

      <button type="submit" disabled={enviando} className="btn btn-primary w-full !min-h-12">
        {enviando && <Loader2 size={16} strokeWidth={1.5} className="animate-spin" />}
        Quiero inscribirme
      </button>
    </form>
  );
}
