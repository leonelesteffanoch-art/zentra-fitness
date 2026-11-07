'use client';

import { useEffect, useState, type FormEvent, type MouseEvent } from 'react';
import Link from 'next/link';
import { ArrowUpRight, CheckCircle2, ChevronDown, Loader2, Menu, UserCheck, X } from 'lucide-react';
import { Logo } from '@/components/Logo';

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

// ---------- 1. Header: máximo 4 links + link de texto "Consultar mi DNI" + 1 único botón ----------

const LINKS_NAV = [
  { href: '#disciplinas', label: 'Disciplinas' },
  { href: '#metodo', label: 'Método' },
  { href: '#planes', label: 'Planes' },
  { href: '#contacto', label: 'Contacto' },
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
            ? 'border-b border-line/80 bg-ink/95 backdrop-blur-sm'
            : 'border-b border-line/40 bg-ink'
        }`}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/" aria-label="Zentra Fitness - Inicio">
            <Logo className="w-36" />
          </Link>

          <nav aria-label="Navegación principal" className="hidden items-center gap-8 lg:flex">
            {LINKS_NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={(e) => irASeccion(e, item.href)}
                className="text-sm font-medium text-muted transition-colors hover:text-bone"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-6 lg:flex">
            <Link
              href="/consulta"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-bone"
            >
              <UserCheck size={16} strokeWidth={1.5} />
              Consultar mi DNI
            </Link>
            <a
              href="#contacto"
              onClick={(e) => irASeccion(e, '#contacto')}
              className="btn btn-primary !min-h-10 !px-5"
            >
              Inscríbete hoy
            </a>
          </div>

          <button
            type="button"
            onClick={() => setMenuAbierto(true)}
            className="btn btn-ghost !min-h-10 !px-3 lg:hidden"
            aria-label="Abrir menú"
          >
            <Menu size={20} strokeWidth={1.5} />
          </button>
        </div>
      </header>

      {/* Menú móvil a pantalla completa */}
      {menuAbierto && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Menú de navegación"
          className="fixed inset-0 z-50 flex flex-col justify-between bg-ink px-6 py-6 lg:hidden"
        >
          <div className="flex items-center justify-between border-b border-line/80 pb-4">
            <Logo className="w-36" />
            <button
              type="button"
              onClick={() => setMenuAbierto(false)}
              className="btn btn-ghost !min-h-10 !px-3"
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
                className="flex items-baseline justify-between py-4 text-xl font-semibold text-bone"
              >
                <span>{item.label}</span>
                <span className="font-mono text-xs text-muted">0{idx + 1}</span>
              </a>
            ))}
          </nav>

          <div className="space-y-4 border-t border-line/70 pt-5">
            <Link
              href="/consulta"
              onClick={() => setMenuAbierto(false)}
              className="flex items-center justify-center gap-2 py-2 text-sm font-medium text-muted hover:text-bone"
            >
              <UserCheck size={16} strokeWidth={1.5} />
              Consultar mi DNI
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

// ---------- 2. Disciplinas: izquierda solo número + nombre; derecha detalle único (acordeón en móvil) ----------

export interface DisciplinaItem {
  num: string;
  nombre: string;
  enfoque: string;
  detalle: string;
  intensidad: string;
  duracion: string;
}

export function DisciplinasAccordion({ items }: { items: DisciplinaItem[] }) {
  const [activa, setActiva] = useState<number>(0);
  const actual = items[activa] ?? items[0];

  return (
    <div className="grid items-start gap-10 lg:grid-cols-12">
      {/* Columna izquierda: filas limpias SOLO con número + nombre (en móvil expande acordeón) */}
      <ul className="divide-y divide-line/80 border-y border-line/80 lg:col-span-6">
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
                className="flex w-full items-center justify-between gap-4 py-4 text-left transition-colors"
              >
                <div className="flex items-baseline gap-4">
                  <span
                    className={`font-mono text-xs transition-colors ${
                      abierta ? 'text-brand' : 'text-muted'
                    }`}
                  >
                    {d.num}
                  </span>
                  <span
                    className={`text-lg font-semibold tracking-tight transition-colors sm:text-xl ${
                      abierta ? 'text-bone' : 'text-muted hover:text-bone'
                    }`}
                  >
                    {d.nombre}
                  </span>
                </div>
                <ChevronDown
                  size={16}
                  strokeWidth={1.5}
                  className={`text-muted transition-transform lg:hidden ${
                    abierta ? 'rotate-180 text-bone' : ''
                  }`}
                />
              </button>

              {/* Acordeón exclusivo para móvil (en desktop se oculta para no duplicar con el panel derecho) */}
              {abierta && (
                <div className=" space-y-3 pb-5 pl-8 pr-2 text-sm lg:hidden">
                  <span className="inline-block rounded-xs bg-surface-2 px-2.5 py-0.5 text-xs font-medium text-muted">
                    {d.enfoque}
                  </span>
                  <p className="leading-relaxed text-bone/90">{d.detalle}</p>
                  <div className="flex gap-6 text-xs text-muted">
                    <span>Intensidad: <strong className="font-medium text-bone">{d.intensidad}</strong></span>
                    <span>Duración: <strong className="font-medium text-bone">{d.duracion}</strong></span>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {/* Panel derecho exclusivo en desktop: descripción, intensidad, duración y tags viven ÚNICAMENTE aquí */}
      {actual && (
        <aside className="hidden flex-col justify-between bg-surface p-7 lg:col-span-6 lg:flex">
          <div className="relative aspect-[16/9] overflow-hidden bg-ink">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/zentra-cover.jpg"
              alt={actual.nombre}
              className="h-full w-full object-cover opacity-60 saturate-50"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent" />
            <span className="font-mono absolute bottom-3 left-4 text-sm font-semibold text-bone">
              {actual.num}
            </span>
          </div>

          <div className="mt-6 space-y-3">
            <span className="inline-block rounded-xs bg-surface-2 px-2.5 py-1 text-xs font-medium text-muted">
              {actual.enfoque}
            </span>
            <h3 className="section-title text-2xl">{actual.nombre}</h3>
            <p className="text-sm leading-relaxed text-muted">{actual.detalle}</p>
          </div>

          <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-line/70 pt-4 text-xs">
            <div>
              <dt className="text-muted">Intensidad</dt>
              <dd className="mt-0.5 font-semibold text-bone">{actual.intensidad}</dd>
            </div>
            <div>
              <dt className="text-muted">Duración de sesión</dt>
              <dd className="mt-0.5 font-semibold text-bone">{actual.duracion}</dd>
            </div>
          </dl>

          <a
            href="#horarios"
            onClick={(e) => irASeccion(e, '#horarios')}
            className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-bone hover:underline"
          >
            Ver horarios de sala <ArrowUpRight size={15} strokeWidth={1.5} />
          </a>
        </aside>
      )}
    </div>
  );
}

// ---------- 3. Formulario de Contacto / Leads ----------

export function LeadContactForm() {
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [objetivo, setObjetivo] = useState('Fuerza e hipertrofia');
  const [horario, setHorario] = useState('Mañana (6:00 am - 12:00 pm)');
  const [empresa, setEmpresa] = useState(''); // Honeypot
  const [enviando, setEnviando] = useState(false);
  const [exito, setExito] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, telefono, objetivo, horario, empresa }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'No se pudo enviar tu solicitud');
      } else {
        setExito(true);
        setNombre('');
        setTelefono('');
      }
    } catch {
      setError('Error de red. Intenta nuevamente.');
    } finally {
      setEnviando(false);
    }
  }

  if (exito) {
    return (
      <div className="bg-surface p-6">
        <div className="flex items-center gap-2 text-ok">
          <CheckCircle2 size={20} strokeWidth={1.5} />
          <p className="font-semibold">Datos recibidos</p>
        </div>
        <p className="mt-2 text-sm text-muted">
          Gracias por escribirnos. El equipo de recepción de Zentra Fitness te contactará por
          WhatsApp o llamada en breve.
        </p>
        <button
          type="button"
          onClick={() => setExito(false)}
          className="btn btn-secondary mt-4 !min-h-9"
        >
          Enviar otra consulta
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 bg-surface p-6 sm:p-8">
      <input
        type="text"
        name="empresa"
        tabIndex={-1}
        autoComplete="off"
        value={empresa}
        onChange={(e) => setEmpresa(e.target.value)}
        className="hidden"
      />

      <div>
        <label htmlFor="lead-nombre" className="label">
          Nombre completo *
        </label>
        <input
          id="lead-nombre"
          type="text"
          required
          placeholder="Tu nombre y apellido"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="field !bg-surface-2"
        />
      </div>

      <div>
        <label htmlFor="lead-telefono" className="label">
          Teléfono / WhatsApp *
        </label>
        <input
          id="lead-telefono"
          type="tel"
          required
          placeholder="Ej: 987 654 321"
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          className="field !bg-surface-2 tabular-nums"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="lead-objetivo" className="label">
            Objetivo principal
          </label>
          <select
            id="lead-objetivo"
            value={objetivo}
            onChange={(e) => setObjetivo(e.target.value)}
            className="field !bg-surface-2"
          >
            <option>Fuerza e hipertrofia</option>
            <option>Recomposición corporal</option>
            <option>Acondicionamiento funcional</option>
            <option>Salud y movilidad</option>
          </select>
        </div>

        <div>
          <label htmlFor="lead-horario" className="label">
            Turno de interés
          </label>
          <select
            id="lead-horario"
            value={horario}
            onChange={(e) => setHorario(e.target.value)}
            className="field !bg-surface-2"
          >
            <option>Mañana (6:00 am - 12:00 pm)</option>
            <option>Tarde (12:00 pm - 5:00 pm)</option>
            <option>Noche (5:00 pm - 10:00 pm)</option>
          </select>
        </div>
      </div>

      {error && (
        <p role="alert" className="border-l-2 border-bad bg-bad/10 px-3 py-2 text-xs text-bad">
          {error}
        </p>
      )}

      <button type="submit" disabled={enviando} className="btn btn-primary w-full !min-h-11">
        {enviando && <Loader2 size={16} strokeWidth={1.5} className="animate-spin" />}
        Solicitar información de inscripción
      </button>
    </form>
  );
}
