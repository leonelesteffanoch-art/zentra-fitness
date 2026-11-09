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
import { soles } from '@/lib/formato';

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

// ---------- 2. Zonas de entrenamiento: ficha técnica editorial ----------

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

      {actual && (
        <aside className="relative hidden flex-col justify-between overflow-hidden bg-surface p-8 lg:col-span-7 lg:flex">
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

          <p className="mt-6 text-base leading-relaxed text-muted">{actual.detalle}</p>

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
            <span>1 ingreso por día incluido en todos los planes y pases</span>
            <a
              href="#planes"
              onClick={(e) => irASeccion(e, '#planes')}
              className="inline-flex items-center gap-1 font-medium text-bone hover:underline"
            >
              Ver planes de membresía <ArrowUpRight size={14} strokeWidth={1.5} />
            </a>
          </div>
        </aside>
      )}
    </div>
  );
}

// ---------- 3. Sección de Planes Simplificada (Toggle Diario / Interdiario + 3 Tarjetas + Pases) ----------

export interface PlanLandingItem {
  id: string;
  nombre: string;
  descripcion: string | null;
  duracion_dias: number;
  precio: number;
}

export function PlanesPricingSection({ planes }: { planes: PlanLandingItem[] }) {
  const [modalidad, setModalidad] = useState<'diario' | 'interdiario'>('diario');

  // Buscar el plan para cada duración y modalidad
  const plan1Mes = planes.find(
    (p) => p.duracion_dias === 30 && p.nombre.toLowerCase().includes(modalidad)
  ) ?? {
    id: `m-30-${modalidad}`,
    nombre: modalidad === 'diario' ? 'Mensual (Diario)' : 'Mensual (Interdiario)',
    precio: modalidad === 'diario' ? 80 : 60,
    duracion_dias: 30,
    descripcion: null,
  };

  const plan2Meses = planes.find(
    (p) => p.duracion_dias === 60 && p.nombre.toLowerCase().includes(modalidad)
  ) ?? {
    id: `m-60-${modalidad}`,
    nombre: modalidad === 'diario' ? '2 meses (Diario)' : '2 meses (Interdiario)',
    precio: modalidad === 'diario' ? 140 : 100,
    duracion_dias: 60,
    descripcion: null,
  };

  const plan3Meses = planes.find(
    (p) => p.duracion_dias === 90 && p.nombre.toLowerCase().includes(modalidad)
  ) ?? {
    id: `m-90-${modalidad}`,
    nombre: modalidad === 'diario' ? '3 meses (Diario)' : '3 meses (Interdiario)',
    precio: modalidad === 'diario' ? 200 : 150,
    duracion_dias: 90,
    descripcion: null,
  };

  const planDia = planes.find((p) => p.duracion_dias === 1) ?? { precio: 10 };
  const planSemana = planes.find((p) => p.duracion_dias === 7) ?? { precio: 25 };

  const tarjetas = [
    {
      meses: '1 Mes',
      nombre: plan1Mes.nombre,
      precio: plan1Mes.precio,
      duracion: 30,
      subtitulo: 'Plan base mensual',
      tag: modalidad === 'diario' ? 'Más elegido' : 'Plan inicial',
      destacado: modalidad === 'diario',
      beneficios: [
        '30 días calendario de vigencia',
        modalidad === 'diario'
          ? 'Entrenamiento de lunes a sábado (1 ingreso/día)'
          : 'Asistencia interdiaria (3 días por semana, 1 ingreso/día)',
        'Acceso total a musculación, peso libre y cardio',
        'Asesoría de entrenador en turnos mañana y noche',
        'Sin costo de matrícula',
      ],
    },
    {
      meses: '2 Meses',
      nombre: plan2Meses.nombre,
      precio: plan2Meses.precio,
      duracion: 60,
      subtitulo:
        modalidad === 'diario'
          ? `${soles(70)} / mes · Ahorras ${soles(20)}`
          : `${soles(50)} / mes · Ahorras ${soles(20)}`,
      tag: 'Ahorro promocional',
      destacado: false,
      beneficios: [
        '60 días calendario de vigencia',
        modalidad === 'diario'
          ? 'Entrenamiento continuo lunes a sábado (1 ingreso/día)'
          : 'Asistencia interdiaria (3 días por semana, 1 ingreso/día)',
        'Tarifa reducida con ahorro directo por mes',
        'Acceso total a todas las zonas y máquinas',
        'Sin costo de matrícula',
      ],
    },
    {
      meses: '3 Meses',
      nombre: plan3Meses.nombre,
      precio: plan3Meses.precio,
      duracion: 90,
      subtitulo:
        modalidad === 'diario'
          ? `${soles(66.7)} / mes · Mayor ahorro`
          : `${soles(50)} / mes · 90 días continuos`,
      tag: 'Mejor tarifa',
      destacado: modalidad === 'interdiario',
      beneficios: [
        '90 días calendario de vigencia',
        modalidad === 'diario'
          ? 'Entrenamiento diario con el costo mensual más bajo'
          : 'Asistencia interdiaria (3 días por semana, 1 ingreso/día)',
        'Mayor compromiso y progresión técnica en sala',
        'Acceso total a todas las zonas del club',
        'Sin costo de matrícula',
      ],
    },
  ];

  return (
    <div className="space-y-8">
      {/* Selector / Toggle segmentado entre Diario e Interdiario */}
      <div className="flex flex-col items-center">
        <div className="inline-flex rounded-xs border border-line bg-surface p-1">
          <button
            type="button"
            onClick={() => setModalidad('diario')}
            className={`rounded-xs px-5 py-2 text-xs font-semibold transition-all sm:text-sm ${
              modalidad === 'diario'
                ? 'bg-brand text-brand-ink shadow-xs'
                : 'text-muted hover:text-bone'
            }`}
          >
            Entrenamiento Diario (Lunes a Sábado)
          </button>
          <button
            type="button"
            onClick={() => setModalidad('interdiario')}
            className={`rounded-xs px-5 py-2 text-xs font-semibold transition-all sm:text-sm ${
              modalidad === 'interdiario'
                ? 'bg-brand text-brand-ink shadow-xs'
                : 'text-muted hover:text-bone'
            }`}
          >
            Entrenamiento Interdiario (3 días/sem)
          </button>
        </div>

        <p className="mt-3 text-center text-xs text-muted">
          {modalidad === 'diario'
            ? 'Para quienes asisten de lunes a sábado · 1 ingreso por día a todas las salas y máquinas.'
            : 'Asistencia dejando un día (3 veces por semana) · 1 ingreso por día asistido.'}
        </p>
      </div>

      {/* Exactamente 3 tarjetas limpias y legibles */}
      <div className="grid gap-6 md:grid-cols-3">
        {tarjetas.map((t) => (
          <article
            key={t.meses}
            className={`flex flex-col justify-between p-6 sm:p-7 ${
              t.destacado ? 'bg-ink ring-1 ring-brand' : 'bg-ink/70'
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-muted">{t.duracion} días</span>
                <span
                  className={`rounded-xs px-2 py-0.5 text-xs font-semibold ${
                    t.destacado ? 'bg-brand text-brand-ink' : 'bg-surface-2 text-bone'
                  }`}
                >
                  {t.tag}
                </span>
              </div>

              <h3 className="section-title mt-3 text-xl">{t.meses}</h3>

              <div className="mt-4 border-y border-line/70 py-4 tabular-nums">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-bone">{soles(t.precio)}</span>
                </div>
                <p className="mt-1 text-xs text-muted">{t.subtitulo}</p>
              </div>

              <ul className="mt-5 space-y-2.5 text-xs text-bone">
                {t.beneficios.map((b) => (
                  <li key={b} className="flex items-start gap-2">
                    <Check size={14} strokeWidth={1.5} className="mt-0.5 shrink-0 text-muted" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>

            <a
              href="#contacto"
              onClick={(e) => irASeccion(e, '#contacto')}
              className={`btn mt-8 w-full ${t.destacado ? 'btn-primary' : 'btn-secondary'}`}
            >
              Elegir {t.meses} ({modalidad === 'diario' ? 'Diario' : 'Interdiario'})
            </a>
          </article>
        ))}
      </div>

      {/* Franja compacta para Pases Cortos (Por día y Semanal) */}
      <div className="flex flex-col items-start justify-between gap-4 border border-line/70 bg-surface p-5 sm:flex-row sm:items-center sm:p-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-brand">PASES FLEXIBLES</span>
            <span className="text-xs text-muted">· Para visitas sueltas o una semana de paso</span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-baseline gap-x-6 gap-y-1 text-sm">
            <p className="text-bone">
              <strong className="font-medium text-bone">Pase por día:</strong>{' '}
              <span className="font-bold text-bone tabular-nums">{soles(planDia.precio)}</span>{' '}
              <span className="text-xs text-muted">(1 ingreso libre por el día)</span>
            </p>
            <p className="text-bone">
              <strong className="font-medium text-bone">Pase semanal:</strong>{' '}
              <span className="font-bold text-bone tabular-nums">{soles(planSemana.precio)}</span>{' '}
              <span className="text-xs text-muted">(7 días continuos)</span>
            </p>
          </div>
        </div>
        <a
          href="#contacto"
          onClick={(e) => irASeccion(e, '#contacto')}
          className="btn btn-secondary shrink-0 !min-h-9 !px-4 text-xs"
        >
          Pedir pase en recepción
        </a>
      </div>

      {/* Nota legal y operativa transparente */}
      <p className="text-center text-xs text-muted">
        * Todos los planes incluyen 1 ingreso por día. Ningún plan incluye doble ingreso en el mismo
        día (para volver a ingresar en la misma jornada aplica pase por día en recepción). Los
        planes no cuentan con congelamiento.
      </p>
    </div>
  );
}

// ---------- 4. Formulario de Inscripción / Interesados ----------

export function LeadContactForm() {
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [objetivo, setObjetivo] = useState('Mensual (Diario) - S/ 80');
  const [horario, setHorario] = useState('Mañana con entrenador (6:00 am - 11:00 am)');
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
          <p className="font-semibold">Solicitud registrada</p>
        </div>
        <p className="mt-2 text-sm text-muted">
          Tus datos ya están en el panel de recepción de Zentra Fitness. Te escribiremos por
          WhatsApp desde el <span className="font-mono text-bone">998 180 873</span> en breve.
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
          Número de celular / WhatsApp *
        </label>
        <input
          id="lead-telefono"
          type="tel"
          required
          placeholder="Ej: 998 180 873"
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          className="field !bg-surface-2 tabular-nums"
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
            className="field !bg-surface-2"
          >
            <option>Mensual (Diario) - S/ 80</option>
            <option>Mensual (Interdiario) - S/ 60</option>
            <option>2 meses (Diario) - S/ 140</option>
            <option>2 meses (Interdiario) - S/ 100</option>
            <option>3 meses (Diario) - S/ 200</option>
            <option>3 meses (Interdiario) - S/ 150</option>
            <option>Semanal - S/ 25</option>
            <option>Por día - S/ 10</option>
          </select>
        </div>

        <div>
          <label htmlFor="lead-horario" className="label">
            Horario en el que sueles entrenar
          </label>
          <select
            id="lead-horario"
            value={horario}
            onChange={(e) => setHorario(e.target.value)}
            className="field !bg-surface-2"
          >
            <option>Mañana con entrenador (6:00 am - 11:00 am)</option>
            <option>Mediodía libre sin entrenador (11:00 am - 4:00 pm)</option>
            <option>Tarde/Noche con entrenador (4:00 pm - 10:30 pm)</option>
            <option>Fin de semana (Sábado / Domingo)</option>
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
        Solicitar inscripción
      </button>
    </form>
  );
}
