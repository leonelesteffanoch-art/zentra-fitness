import Link from 'next/link';
import { cacheLife } from 'next/cache';
import { ArrowUpRight, Lock, MapPin, MessageCircle, UserCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Logo } from '@/components/Logo';
import {
  DisciplinasAccordion,
  FaqAccordion,
  HeroVisualCard,
  LandingHeader,
  LeadContactForm,
  PlanesPricingSection,
  RevealOnScroll,
  type DisciplinaItem,
  type PlanLandingItem,
} from '@/components/LandingInteractive';

/** Enlace a Google Maps (reemplazar por el pin exacto cuando esté confirmado). */
export const GOOGLE_MAPS_URL =
  'https://www.google.com/maps/search/?api=1&query=Zentra+Fitness+Villa+Estela+Ancón';

const PLANES_FALLBACK: PlanLandingItem[] = [
  {
    id: 'por-dia',
    nombre: 'Por día',
    descripcion: null,
    duracion_dias: 1,
    precio: 10,
  },
  {
    id: 'semanal',
    nombre: 'Semanal',
    descripcion: null,
    duracion_dias: 7,
    precio: 25,
  },
  {
    id: 'mensual-interdiario',
    nombre: 'Mensual (Interdiario)',
    descripcion: null,
    duracion_dias: 30,
    precio: 60,
  },
  {
    id: 'mensual-diario',
    nombre: 'Mensual (Diario)',
    descripcion: null,
    duracion_dias: 30,
    precio: 80,
  },
  {
    id: '2-meses-interdiario',
    nombre: '2 meses (Interdiario)',
    descripcion: null,
    duracion_dias: 60,
    precio: 100,
  },
  {
    id: '2-meses-diario',
    nombre: '2 meses (Diario)',
    descripcion: null,
    duracion_dias: 60,
    precio: 140,
  },
  {
    id: '3-meses-interdiario',
    nombre: '3 meses (Interdiario)',
    descripcion: null,
    duracion_dias: 90,
    precio: 150,
  },
  {
    id: '3-meses-diario',
    nombre: '3 meses (Diario)',
    descripcion: null,
    duracion_dias: 90,
    precio: 200,
  },
];

const DISCIPLINAS: DisciplinaItem[] = [
  {
    num: '01',
    nombre: 'Musculación y peso libre',
    enfoque: 'Hipertrofia · Fuerza base',
    detalle:
      'Jaulas de potencia, bancas olímpicas, mancuernas pesadas y máquinas de palanca convergente para progresión real de cargas.',
    intensidad: 'Alta / Progresiva',
    imagen: '/brand/zonas/zona-01.jpg',
    equipamiento: [
      'Racks de sentadilla y jaulas de potencia',
      'Bancas olímpicas planas, inclinadas y declinadas',
      'Set de mancuernas y barras olímpicas',
      'Máquinas de palanca y poleas duales',
    ],
  },
  {
    num: '02',
    nombre: 'Tren inferior y glúteos',
    enfoque: 'Fuerza específica · Técnica',
    detalle:
      'Circuito dedicado al desarrollo técnico de pierna y glúteo con ángulos biomecánicos seguros para cargas altas.',
    intensidad: 'Alta',
    imagen: '/brand/zonas/zona-02.jpg',
    equipamiento: [
      'Prensa de piernas a 45° de alto tonelaje',
      'Hack squat y estación de Hip Thrust',
      'Camilla de femorales y sillón de cuádriceps',
      'Poleas bajas con tobilleras y discos olímpicos',
    ],
  },
  {
    num: '03',
    nombre: 'Fuerza funcional y potencia',
    enfoque: 'Potencia · Estabilidad',
    detalle:
      'Espacio despejado para trabajo multiarticular con barras libres, kettlebells y peso corporal enfocado en coordinación y potencia.',
    intensidad: 'Media / Alta',
    imagen: '/brand/zonas/zona-03.jpg',
    equipamiento: [
      'Kettlebells, balones medicinales y bandas',
      'Estructura de dominadas y fondos libres',
      'Cajones pliométricos y piso amortiguado',
      'Espacio libre para peso muerto y desplantes',
    ],
  },
  {
    num: '04',
    nombre: 'Zona cardio y metabólico',
    enfoque: 'Capacidad aeróbica · HIIT',
    detalle:
      'Línea cardiovascular lista para entrar en calor antes de las pesas, sostener ritmo continuo o trabajar intervalos de alta intensidad.',
    intensidad: 'Adaptable a tu ritmo',
    imagen: '/brand/zonas/zona-04.jpg',
    equipamiento: [
      'Trotadoras de alto tráfico con inclinación',
      'Bicicletas estacionarias y de spinning',
      'Elípticas de bajo impacto articular',
      'Zona de salto con cuerda y trabajo aeróbico',
    ],
  },
  {
    num: '05',
    nombre: 'Recomposición corporal',
    enfoque: 'Déficit · Tonificación',
    detalle:
      'Combinación práctica de sobrecarga en máquinas guiadas y trabajo continuo, con guía técnica del entrenador en turno.',
    intensidad: 'Progresiva',
    imagen: '/brand/zonas/zona-05.jpg',
    equipamiento: [
      'Circuito completo de máquinas selectorizadas',
      'Estaciones de torso, espalda y hombro',
      'Pesos libres ligeros y medianos',
      'Orientación de entrenadores en sala',
    ],
  },
  {
    num: '06',
    nombre: 'Movilidad, abdomen y core',
    enfoque: 'Prevención · Rango articular',
    detalle:
      'Área para activación articular previa al levantamiento, descompresión lumbar y fortalecimiento de la zona media.',
    intensidad: 'Media / Controlada',
    imagen: '/brand/zonas/zona-06.jpg',
    equipamiento: [
      'Colchonetas de alta densidad y rodillos',
      'Bancas abdominales y soporte de lumbares',
      'Bandas elásticas de activación y movilidad',
      'Rueda abdominal y barras de suspensión',
    ],
  },
];

interface EntrenadorPlanta {
  nombre: string;
  turno: string;
  especialidad?: string;
  fotoUrl?: string;
}

const ENTRENADORES: EntrenadorPlanta[] = [
  {
    nombre: 'Lucas',
    turno: 'Lun–Vie',
    // especialidad: 'Musculación y fuerza',
    // fotoUrl: '/brand/entrenadores/lucas.jpg',
  },
  {
    nombre: 'Juan',
    turno: 'Sábados',
    // especialidad: 'Entrenamiento integral',
    // fotoUrl: '/brand/entrenadores/juan.jpg',
  },
];

interface BloqueHorario {
  dia: string;
  rangos: {
    rango: string;
    tipo: 'entrenador' | 'libre' | 'pase';
    etiqueta: string;
  }[];
}

const TABLA_HORARIOS: BloqueHorario[] = [
  {
    dia: 'Lun–Vie',
    rangos: [
      { rango: '6:00 am – 11:00 am', tipo: 'entrenador', etiqueta: 'Con entrenador' },
      { rango: '11:00 am – 4:00 pm', tipo: 'libre', etiqueta: 'Sala libre' },
      { rango: '4:00 pm – 10:30 pm', tipo: 'entrenador', etiqueta: 'Con entrenador' },
    ],
  },
  {
    dia: 'Sáb',
    rangos: [
      { rango: '7:00 am – 11:00 am', tipo: 'entrenador', etiqueta: 'Con entrenador' },
      { rango: '11:00 am – 4:00 pm', tipo: 'libre', etiqueta: 'Sala libre' },
      { rango: '4:00 pm – 10:00 pm', tipo: 'entrenador', etiqueta: 'Con entrenador' },
    ],
  },
  {
    dia: 'Dom',
    rangos: [
      { rango: '9:00 am – 2:00 pm', tipo: 'pase', etiqueta: 'Solo pase por día (S/ 10)' },
    ],
  },
];

async function obtenerPlanesPublicos(): Promise<PlanLandingItem[]> {
  'use cache';
  cacheLife('minutes');
  try {
    const { data, error } = await supabase
      .from('v_landing_planes')
      .select('id, nombre, descripcion, duracion_dias, precio')
      .order('duracion_dias', { ascending: true })
      .order('precio', { ascending: true })
      .limit(15);
    if (error || !data || data.length === 0) return PLANES_FALLBACK;
    return data.map((p) => ({
      id: String(p.id),
      nombre: String(p.nombre),
      descripcion: p.descripcion ? String(p.descripcion) : null,
      duracion_dias: Number(p.duracion_dias),
      precio: Number(p.precio),
    }));
  } catch {
    return PLANES_FALLBACK;
  }
}

export default async function HomePage() {
  const planes = await obtenerPlanesPublicos();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'HealthClub',
    name: 'Zentra Fitness',
    description:
      'Gimnasio en Villa Estela, Ancón. Peso libre, máquinas y entrenadores en sala. Sin matrícula, planes desde S/ 10.',
    url: 'https://zentrafitness.vercel.app',
    telephone: '+51998180873',
    priceRange: 'S/ 10 - S/ 200',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'A la espalda de la Loza 4 – Av. Arquitectos, Villa Estela',
      addressLocality: 'Ancón',
      addressRegion: 'Lima',
      addressCountry: 'PE',
    },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        opens: '06:00',
        closes: '22:30',
      },
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Saturday'],
        opens: '07:00',
        closes: '22:00',
      },
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Sunday'],
        opens: '09:00',
        closes: '14:00',
      },
    ],
  };

  return (
    <div className="min-h-screen bg-ink text-bone">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <LandingHeader />

      <main>
        {/* 1. HERO */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(255,194,26,0.065),_transparent_55%)]"
          />

          <div className="relative mx-auto grid max-w-6xl gap-10 px-5 pb-14 pt-10 sm:px-8 sm:py-16 lg:grid-cols-12 lg:items-center lg:gap-12 lg:py-24">
            <div className="flex flex-col justify-between lg:col-span-7">
              <div>
                <h1 className="font-display text-[3.25rem] leading-[0.9] tracking-tight sm:text-7xl lg:text-8xl">
                  Hierro real.
                  <br />
                  Tu propio ritmo.
                  <br />
                  <span className="text-brand">Fuerza pura.</span>
                </h1>

                <p className="mt-6 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
                  Peso libre, máquinas de palanca y entrenadores en sala. Sin matrícula, desde
                  S/ 10.
                </p>
              </div>

              <div className="mt-8 flex flex-col gap-3.5 sm:mt-10 sm:flex-row sm:flex-wrap sm:items-center sm:gap-6">
                <a href="#planes" className="btn btn-primary w-full !min-h-12 !px-8 sm:w-auto">
                  Ver planes
                </a>
                <Link
                  href="/consulta"
                  className="inline-flex min-h-11 items-center justify-center gap-1.5 py-2 text-sm font-medium text-muted transition-colors hover:text-bone sm:justify-start"
                >
                  Soy socio · Consultar mis días <ArrowUpRight size={16} strokeWidth={1.5} />
                </Link>
              </div>
            </div>

            <div className="lg:col-span-5">
              <HeroVisualCard />
            </div>
          </div>

          {/* Franja inferior: una línea por dato, sin etiquetas largas */}
          <div className="border-y border-line/70 bg-surface">
            <div className="mx-auto grid max-w-6xl grid-cols-1 divide-y divide-line/60 px-5 text-sm text-bone sm:px-8 lg:grid-cols-3 lg:divide-x lg:divide-y-0">
              <p className="py-3.5 lg:py-4 lg:pr-6">
                Av. Arquitectos, espalda de la Loza 4 · Villa Estela, Ancón
              </p>
              <p className="py-3.5 tabular-nums lg:px-6 lg:py-4">
                Lun–Sáb 6:00 am–10:30 pm, Sáb hasta 10:00 pm · Dom 9:00 am–2:00 pm
              </p>
              <p className="py-3.5 tabular-nums lg:py-4 lg:pl-6">
                <a
                  href="https://wa.me/51998180873?text=Hola%20Zentra%20Fitness,%20quisiera%20informaci%C3%B3n"
                  target="_blank"
                  rel="noreferrer"
                  className="transition-colors hover:text-brand"
                >
                  WhatsApp 998 180 873
                </a>
              </p>
            </div>
          </div>
        </section>

        {/* 2. ZONAS */}
        <section id="disciplinas" className="scroll-mt-20 py-16 lg:py-28">
          <RevealOnScroll className="mx-auto max-w-6xl px-5 sm:px-8">
            <div className="mb-10 sm:mb-12">
              <h2 className="section-title text-2xl sm:text-3xl">Seis zonas, un solo acceso</h2>
              <p className="mt-2 text-sm text-muted">
                Entrena a tu ritmo y sin separar máquinas.
              </p>
            </div>

            <DisciplinasAccordion items={DISCIPLINAS} />
          </RevealOnScroll>
        </section>

        {/* 3. PLANES */}
        <section id="planes" className="scroll-mt-20 border-y border-line/60 bg-surface py-16 lg:py-28">
          <RevealOnScroll className="mx-auto max-w-6xl px-5 sm:px-8">
            <div className="mb-10 sm:text-center">
              <h2 className="section-title text-2xl sm:text-3xl">Planes</h2>
              <p className="mt-2 text-sm text-muted">
                Sin matrícula · Todas las zonas incluidas
              </p>
            </div>

            <PlanesPricingSection planes={planes} />
          </RevealOnScroll>
        </section>

        {/* 4. HORARIOS Y ENTRENADORES */}
        <section id="horarios" className="scroll-mt-20 py-16 lg:py-28">
          <RevealOnScroll className="mx-auto max-w-6xl px-5 sm:px-8">
            <h2 className="section-title mb-8 text-2xl sm:mb-10 sm:text-3xl">Horarios</h2>

            <div className="grid items-start gap-8 lg:grid-cols-12 lg:gap-12">
              {/* Tabla limpia: Día · Rango · Tipo */}
              <div className="overflow-x-auto border border-line/80 bg-surface lg:col-span-8">
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-line/80 text-xs font-medium text-muted">
                      <th scope="col" className="px-4 py-3.5 sm:px-6">
                        Día
                      </th>
                      <th scope="col" className="px-4 py-3.5 sm:px-6">
                        Horario
                      </th>
                      <th scope="col" className="px-4 py-3.5 sm:px-6">
                        Modalidad
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/60">
                    {TABLA_HORARIOS.map((bloque) =>
                      bloque.rangos.map((fila, idx) => (
                        <tr key={`${bloque.dia}-${fila.rango}`} className="tabular-nums">
                          <td className="whitespace-nowrap px-4 py-3.5 font-semibold text-bone sm:px-6">
                            {idx === 0 ? bloque.dia : ''}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3.5 text-bone sm:px-6">
                            {fila.rango}
                          </td>
                          <td className="px-4 py-3.5 sm:px-6">
                            {fila.tipo === 'entrenador' && (
                              <span className="inline-flex items-center gap-2 text-bone">
                                <span
                                  className="h-2 w-2 shrink-0 rounded-full bg-ok"
                                  aria-hidden="true"
                                />
                                {fila.etiqueta}
                              </span>
                            )}
                            {fila.tipo === 'libre' && (
                              <span className="text-muted">{fila.etiqueta}</span>
                            )}
                            {fila.tipo === 'pase' && (
                              <span className="inline-flex items-center gap-2 font-medium text-warn">
                                <span
                                  className="h-2 w-2 shrink-0 rounded-full bg-warn"
                                  aria-hidden="true"
                                />
                                {fila.etiqueta}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Tarjeta compacta de entrenadores, lista para foto + especialidad */}
              <aside className="border border-line/80 bg-surface p-6 lg:col-span-4">
                <h3 className="text-xs font-medium text-muted">Entrenadores en sala</h3>
                <ul className="mt-4 divide-y divide-line/60">
                  {ENTRENADORES.map((coach) => (
                    <li
                      key={coach.nombre}
                      className="flex items-center justify-between gap-3 py-3.5 first:pt-0 last:pb-0"
                    >
                      <div className="flex items-center gap-3">
                        {coach.fotoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={coach.fotoUrl}
                            alt={coach.nombre}
                            className="h-10 w-10 rounded-xs object-cover"
                          />
                        ) : (
                          <span
                            aria-hidden="true"
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xs border border-line bg-ink text-xs font-semibold text-muted"
                          >
                            {coach.nombre.slice(0, 1)}
                          </span>
                        )}
                        <div>
                          <p className="text-sm font-semibold text-bone">{coach.nombre}</p>
                          {coach.especialidad && (
                            <p className="text-xs text-muted">{coach.especialidad}</p>
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-muted">{coach.turno}</span>
                    </li>
                  ))}
                </ul>
              </aside>
            </div>
          </RevealOnScroll>
        </section>

        {/* 5. FAQ CORTO */}
        <section id="preguntas" className="scroll-mt-20 border-t border-line/60 py-16 lg:py-24">
          <RevealOnScroll className="mx-auto max-w-3xl px-5 sm:px-8">
            <h2 className="section-title mb-8 text-2xl sm:text-3xl">Preguntas frecuentes</h2>
            <FaqAccordion />
          </RevealOnScroll>
        </section>

        {/* 6. CONTACTO / INSCRIPCIÓN */}
        <section id="contacto" className="scroll-mt-20 border-t border-line/60 bg-surface py-16 lg:py-28">
          <RevealOnScroll className="mx-auto grid max-w-6xl gap-10 px-5 sm:px-8 lg:grid-cols-12 lg:gap-12">
            <div className="flex flex-col justify-between lg:col-span-5">
              <div>
                <h2 className="section-title text-2xl sm:text-3xl">Separa tu inscripción</h2>
                <p className="mt-2 text-sm text-muted">
                  Déjanos tus datos y te escribimos por WhatsApp.
                </p>

                <dl className="mt-8 space-y-6 border-t border-line/70 pt-6 text-sm">
                  <div>
                    <dt className="text-xs text-muted">Dirección</dt>
                    <dd className="mt-1.5 flex items-start gap-2 font-medium text-bone">
                      <MapPin size={16} strokeWidth={1.5} className="mt-0.5 shrink-0 text-muted" />
                      <span>
                        A la espalda de la Loza 4 – Av. Arquitectos, Villa Estela, Ancón
                      </span>
                    </dd>
                    <div className="mt-3">
                      <a
                        href={GOOGLE_MAPS_URL}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-secondary !min-h-11 gap-1.5 text-xs"
                      >
                        Cómo llegar <ArrowUpRight size={14} strokeWidth={1.5} />
                      </a>
                    </div>
                  </div>

                  <div>
                    <dt className="text-xs text-muted">WhatsApp</dt>
                    <dd className="mt-1 text-base font-semibold text-bone tabular-nums">
                      <a
                        href="https://wa.me/51998180873?text=Hola%20Zentra%20Fitness,%20quisiera%20inscribirme"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-h-11 items-center hover:text-brand"
                      >
                        998 180 873
                      </a>
                    </dd>
                  </div>

                  <div>
                    <dt className="text-xs text-muted">Redes sociales</dt>
                    <dd className="mt-1 flex flex-wrap gap-5 text-sm font-medium text-bone">
                      <a
                        href="https://www.tiktok.com/@zentrafitnessperu?_r=1&_t=ZS-9BFZ0vSjjqG"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-h-11 items-center gap-1 hover:text-brand"
                      >
                        TikTok <ArrowUpRight size={13} strokeWidth={1.5} className="text-muted" />
                      </a>
                      <a
                        href="https://www.facebook.com/share/1E53yWwEMJ/"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-h-11 items-center gap-1 hover:text-brand"
                      >
                        Facebook <ArrowUpRight size={13} strokeWidth={1.5} className="text-muted" />
                      </a>
                      <a
                        href="https://www.instagram.com/zentrafitnessperu?obrf=cTZmbnVzMWVmem02"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-h-11 items-center gap-1 hover:text-brand"
                      >
                        Instagram <ArrowUpRight size={13} strokeWidth={1.5} className="text-muted" />
                      </a>
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            <div className="lg:col-span-7">
              <LeadContactForm planes={planes} />
            </div>
          </RevealOnScroll>
        </section>
      </main>

      {/* 7. FOOTER */}
      <footer className="border-t border-line/80 bg-ink py-10">
        <div className="mx-auto flex max-w-6xl flex-col justify-between gap-6 px-5 sm:flex-row sm:items-center sm:px-8">
          <div className="flex flex-wrap items-center gap-4">
            <Logo className="w-32" />
            <span className="text-xs text-muted">© 2026 Zentra Fitness</span>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs">
            <Link
              href="/consulta"
              className="inline-flex min-h-11 items-center gap-1.5 font-medium text-bone transition-colors hover:text-brand"
            >
              <UserCheck size={14} strokeWidth={1.5} className="text-muted" />
              Portal del socio (DNI)
            </Link>
            <Link
              href="/login"
              className="inline-flex min-h-11 items-center gap-1.5 text-muted transition-colors hover:text-bone"
            >
              <Lock size={13} strokeWidth={1.5} />
              Panel de trabajadores
            </Link>
          </div>
        </div>
      </footer>

      {/* Botón flotante de WhatsApp */}
      <a
        href="https://wa.me/51998180873?text=Hola%20Zentra%20Fitness,%20quisiera%20informaci%C3%B3n%20sobre%20los%20planes"
        target="_blank"
        rel="noreferrer"
        aria-label="Escribir por WhatsApp al 998 180 873"
        className="fixed bottom-5 right-5 z-30 flex min-h-11 items-center gap-2 border border-line bg-surface-2 px-4 py-2.5 text-xs font-medium text-bone transition-colors hover:border-bone"
      >
        <MessageCircle size={16} strokeWidth={1.5} className="text-ok" />
        <span className="hidden sm:inline">WhatsApp</span>
      </a>
    </div>
  );
}
