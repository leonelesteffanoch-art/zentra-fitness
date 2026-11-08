'use client';

import { useEffect, useState, type FormEvent, type MouseEvent } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronDown,
  Loader2,
  Lock,
  Menu,
  UserCheck,
  X,
} from 'lucide-react';
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

// ---------- 1. Header con acceso claro para Socios (/consulta) y Trabajadores/Admin (/login) ----------

const LINKS_NAV = [
  { href: '#disciplinas', label: 'Zonas' },
  { href: '#planes', label: 'Planes' },
  { href: '#metodo', label: 'El club' },
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
                className="text-sm font-medium text-muted transition-colors hover:text-bone"
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* Acciones en desktop: Consultar DNI + Panel staff + único botón primario */}
          <div className="hidden items-center gap-5 lg:flex">
            <Link
              href="/consulta"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-bone"
            >
              <UserCheck size={15} strokeWidth={1.5} />
              Consultar mi DNI
            </Link>
            <span className="h-4 w-px bg-line" aria-hidden />
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-bone"
              title="Acceso para recepción y administración"
            >
              <Lock size={14} strokeWidth={1.5} />
              Panel staff
            </Link>
            <a
              href="#contacto"
              onClick={(e) => irASeccion(e, '#contacto')}
              className="btn btn-primary !min-h-10 !px-5"
            >
              Inscríbete hoy
            </a>
          </div>

          {/* Acciones rápidas en móvil: link directo a Staff + botón de menú */}
          <div className="flex items-center gap-1.5 lg:hidden">
            <Link
              href="/consulta"
              className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-medium text-muted transition-colors hover:text-bone"
            >
              <UserCheck size={14} strokeWidth={1.5} />
              <span>Mi DNI</span>
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-medium text-muted transition-colors hover:text-bone"
              aria-label="Panel para trabajadores y administradores"
            >
              <Lock size={13} strokeWidth={1.5} />
              <span>Staff</span>
            </Link>
            <button
              type="button"
              onClick={() => setMenuAbierto(true)}
              className="btn btn-ghost !min-h-10 !px-2.5"
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

          <div className="space-y-3 border-t border-line/70 pt-5">
            <div className="grid grid-cols-2 gap-2.5">
              <Link
                href="/consulta"
                onClick={() => setMenuAbierto(false)}
                className="flex items-center justify-center gap-2 bg-surface px-3 py-3 text-xs font-medium text-bone transition-colors hover:bg-surface-2"
              >
                <UserCheck size={15} strokeWidth={1.5} className="text-muted" />
                Consultar mi DNI
              </Link>
              <Link
                href="/login"
                onClick={() => setMenuAbierto(false)}
                className="flex items-center justify-center gap-2 bg-surface px-3 py-3 text-xs font-medium text-bone transition-colors hover:bg-surface-2"
              >
                <Lock size={14} strokeWidth={1.5} className="text-muted" />
                Panel staff / Admin
              </Link>
            </div>
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

// ---------- 2. Zonas de entrenamiento: sin duración ni horarios; ficha técnica editorial ----------

export interface DisciplinaItem {
  num: string;
  nombre: string;
  enfoque: string;
  detalle: string;
  intensidad: string;
  modalidad: string;
  equipamiento: string[];
}

export function DisciplinasAccordion({ items }: { items: DisciplinaItem[] }) {
  const [activa, setActiva] = useState<number>(0);
  const actual = items[activa] ?? items[0];

  return (
    <div className="grid items-start gap-8 lg:grid-cols-12 lg:gap-10">
      {/* Columna izquierda: filas limpias SOLO con número + nombre (en móvil expande acordeón) */}
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
                className="flex w-full items-center justify-between gap-4 py-4 text-left transition-colors sm:py-4.5"
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

              {/* Acordeón exclusivo para móvil */}
              {abierta && (
                <div className="space-y-4 pb-5 pl-7 pr-1 text-sm lg:hidden">
                  <span className="inline-block rounded-xs bg-surface-2 px-2.5 py-0.5 text-xs font-medium text-muted">
                    {d.enfoque}
                  </span>
                  <p className="leading-relaxed text-bone/90">{d.detalle}</p>

                  <div className="space-y-1.5 pt-1">
                    <p className="text-xs font-medium text-muted">Equipamiento en zona</p>
                    <ul className="grid grid-cols-1 gap-1.5 text-xs text-bone sm:grid-cols-2">
                      {d.equipamiento.map((eq) => (
                        <li key={eq} className="flex items-center gap-2">
                          <Check size={13} strokeWidth={1.75} className="shrink-0 text-muted" />
                          <span>{eq}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex flex-wrap gap-x-6 gap-y-2 border-t border-line/60 pt-3 text-xs text-muted">
                    <span>
                      Intensidad: <strong className="font-medium text-bone">{d.intensidad}</strong>
                    </span>
                    <span>
                      Acceso: <strong className="font-medium text-bone">{d.modalidad}</strong>
                    </span>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {/* Panel derecho exclusivo en desktop: Ficha técnica editorial (sin repetir la imagen con el logo) */}
      {actual && (
        <aside className="relative hidden flex-col justify-between overflow-hidden bg-surface p-8 lg:col-span-7 lg:flex">
          {/* Cabecera técnica de la zona */}
          <div className="flex items-start justify-between border-b border-line/70 pb-6">
            <div>
              <span className="inline-block rounded-xs bg-surface-2 px-2.5 py-1 text-xs font-medium text-muted">
                {actual.enfoque}
              </span>
              <h3 className="section-title mt-3 text-2xl sm:text-3xl">{actual.nombre}</h3>
            </div>
            <span className="font-mono text-4xl font-bold leading-none text-bone/20 select-none">
              {actual.num}
            </span>
          </div>

          {/* Descripción principal */}
          <p className="mt-6 text-base leading-relaxed text-muted">{actual.detalle}</p>

          {/* Estaciones y máquinas de la zona */}
          <div className="mt-7 bg-ink/60 p-5">
            <p className="text-xs font-medium text-muted">Estaciones y equipamiento disponible</p>
            <ul className="mt-3 grid grid-cols-2 gap-3 text-sm text-bone">
              {actual.equipamiento.map((eq) => (
                <li key={eq} className="flex items-center gap-2.5">
                  <Check size={15} strokeWidth={1.75} className="shrink-0 text-muted" />
                  <span>{eq}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Metadatos reales: Intensidad + Tiempo libre (sin límite de duración ni horarios fijos) */}
          <dl className="mt-7 grid grid-cols-2 gap-6 border-t border-line/70 pt-5 text-xs">
            <div>
              <dt className="text-muted">Intensidad de trabajo</dt>
              <dd className="mt-1 text-sm font-semibold text-bone">{actual.intensidad}</dd>
            </div>
            <div>
              <dt className="text-muted">Modalidad y permanencia</dt>
              <dd className="mt-1 text-sm font-semibold text-bone">{actual.modalidad}</dd>
            </div>
          </dl>

          <div className="mt-6 flex items-center justify-between border-t border-line/50 pt-4 text-xs text-muted">
            <span>Incluida en todos los planes y pases diarios</span>
            <a
              href="#planes"
              onClick={(e) => irASeccion(e, '#planes')}
              className="inline-flex items-center gap-1 font-medium text-bone hover:underline"
            >
              Ver planes compatibles <ArrowUpRight size={14} strokeWidth={1.5} />
            </a>
          </div>
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
    <form onSubmit={onSubmit} className="space-y-4 bg-surface p-5 sm:p-8">
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
            Turno en el que sueles entrenar
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
