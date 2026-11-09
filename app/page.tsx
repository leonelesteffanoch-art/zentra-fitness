import Link from 'next/link';
import { cacheLife } from 'next/cache';
import { ArrowUpRight, Lock, MapPin, MessageCircle, UserCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  DIRECCION,
  ETIQUETA_TIPO,
  GOOGLE_MAPS_EMBED_URL,
  GOOGLE_MAPS_URL,
  HORARIOS,
  REDES,
  SITE_URL,
  WHATSAPP_NUMERO,
  WHATSAPP_VISIBLE,
  formatoHora,
  horariosSchema,
} from '@/lib/landing-config';
import type { PlanLandingItem } from '@/lib/planes-landing';
import { Logo } from '@/components/Logo';
import {
  FaqAccordion,
  HeroVisualCard,
  LandingHeader,
  LeadContactForm,
} from '@/components/LandingInteractive';
import { RevealOnScroll } from '@/components/landing/Motion';
import { SectionHeading } from '@/components/landing/SectionHeading';
import { StatsStrip } from '@/components/landing/StatsStrip';
import { ZonasShowcase, type ZonaItem } from '@/components/landing/ZonasShowcase';
import { PlanesSection } from '@/components/landing/PlanesSection';
import { HorariosTimeline } from '@/components/landing/HorariosTimeline';
import { ComoFunciona } from '@/components/landing/ComoFunciona';

const PLANES_FALLBACK: PlanLandingItem[] = [
  { id: 'por-dia', nombre: 'Por día', descripcion: null, duracion_dias: 1, precio: 10 },
  { id: 'semanal', nombre: 'Semanal', descripcion: null, duracion_dias: 7, precio: 25 },
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

const ZONAS: ZonaItem[] = [
  {
    num: '01',
    nombre: 'Musculación y peso libre',
    enfoque: 'Hipertrofia · Fuerza base',
    detalle:
      'Jaulas de potencia, bancas olímpicas, mancuernas pesadas y máquinas de palanca convergente para progresión real de cargas.',
    intensidad: 'Alta',
    nivel: 5,
    icono: 'dumbbell',
    imagen: '/brand/zonas/zona-01.jpg',
    equipamiento: [
      'Racks de sentadilla',
      'Jaulas de potencia',
      'Bancas olímpicas',
      'Mancuernas y barras olímpicas',
      'Máquinas de palanca',
      'Poleas duales',
    ],
  },
  {
    num: '02',
    nombre: 'Tren inferior y glúteos',
    enfoque: 'Fuerza específica · Técnica',
    detalle:
      'Circuito dedicado al desarrollo técnico de pierna y glúteo con ángulos biomecánicos seguros para cargas altas.',
    intensidad: 'Alta',
    nivel: 5,
    icono: 'footprints',
    imagen: '/brand/zonas/zona-02.jpg',
    equipamiento: [
      'Prensa 45°',
      'Hack squat',
      'Estación de Hip Thrust',
      'Camilla de femorales',
      'Sillón de cuádriceps',
      'Poleas bajas con tobilleras',
    ],
  },
  {
    num: '03',
    nombre: 'Fuerza funcional y potencia',
    enfoque: 'Potencia · Estabilidad',
    detalle:
      'Espacio despejado para trabajo multiarticular con barras libres, kettlebells y peso corporal enfocado en coordinación y potencia.',
    intensidad: 'Media–alta',
    nivel: 4,
    icono: 'zap',
    imagen: '/brand/zonas/zona-03.jpg',
    equipamiento: [
      'Kettlebells',
      'Balones medicinales',
      'Dominadas y fondos',
      'Cajones pliométricos',
      'Piso amortiguado',
      'Zona de peso muerto',
    ],
  },
  {
    num: '04',
    nombre: 'Zona cardio y metabólico',
    enfoque: 'Capacidad aeróbica · HIIT',
    detalle:
      'Línea cardiovascular lista para entrar en calor antes de las pesas, sostener ritmo continuo o trabajar intervalos de alta intensidad.',
    intensidad: 'Adaptable',
    nivel: 3,
    icono: 'heart',
    imagen: '/brand/zonas/zona-04.jpg',
    equipamiento: [
      'Trotadoras con inclinación',
      'Bicicletas de spinning',
      'Bicicletas estacionarias',
      'Elípticas',
      'Cuerdas de salto',
    ],
  },
  {
    num: '05',
    nombre: 'Recomposición corporal',
    enfoque: 'Déficit · Tonificación',
    detalle:
      'Combinación práctica de sobrecarga en máquinas guiadas y trabajo continuo, con guía técnica del entrenador en turno.',
    intensidad: 'Progresiva',
    nivel: 3,
    icono: 'activity',
    imagen: '/brand/zonas/zona-05.jpg',
    equipamiento: [
      'Máquinas selectorizadas',
      'Estaciones de torso y espalda',
      'Press de hombro guiado',
      'Pesos libres medianos',
      'Guía de entrenador en sala',
    ],
  },
  {
    num: '06',
    nombre: 'Movilidad, abdomen y core',
    enfoque: 'Prevención · Rango articular',
    detalle:
      'Área para activación articular previa al levantamiento, descompresión lumbar y fortalecimiento de la zona media.',
    intensidad: 'Controlada',
    nivel: 2,
    icono: 'person',
    imagen: '/brand/zonas/zona-06.jpg',
    equipamiento: [
      'Colchonetas y rodillos',
      'Bancas abdominales',
      'Soporte de lumbares',
      'Bandas de activación',
      'Rueda abdominal',
      'Barras de suspensión',
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
    // especialidad: '...',
    // fotoUrl: '/brand/entrenadores/lucas.jpg',
  },
  {
    nombre: 'Juan',
    turno: 'Sábados',
    // especialidad: '...',
    // fotoUrl: '/brand/entrenadores/juan.jpg',
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
    url: SITE_URL,
    image: `${SITE_URL}/brand/hero.jpg`,
    telephone: `+${WHATSAPP_NUMERO}`,
    priceRange: 'S/ 10 - S/ 200',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'A la espalda de la Loza 4 – Av. Arquitectos, Villa Estela',
      addressLocality: 'Ancón',
      addressRegion: 'Lima',
      addressCountry: 'PE',
    },
    openingHoursSpecification: horariosSchema(),
  };

  return (
    <div className="min-h-screen bg-ink text-bone">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <LandingHeader />

      <main>
        {/* 1. HERO (bg-ink) */}
        <section className="relative overflow-hidden bg-ink">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(255,194,26,0.08),_transparent_55%)]"
          />

          <div className="relative mx-auto grid max-w-6xl gap-10 px-5 pb-16 pt-10 sm:px-8 sm:py-20 lg:grid-cols-12 lg:items-center lg:gap-12 lg:py-24">
            <div className="flex flex-col justify-between lg:col-span-7">
              <div>
                <h1 className="font-display text-[3.35rem] leading-[0.9] tracking-tight sm:text-7xl lg:text-8xl">
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
        </section>

        {/* 2. FRANJA DE 4 CIFRAS + MARQUEE (bg-surface) */}
        <StatsStrip />

        {/* 3. ZONAS (bg-ink) */}
        <section id="disciplinas" className="scroll-mt-20 bg-ink py-16 lg:py-28">
          <RevealOnScroll className="mx-auto max-w-6xl px-5 sm:px-8">
            <SectionHeading
              num="01"
              antes="Seis zonas, un solo"
              destacado="acceso"
            >
              <p className="max-w-xl text-sm text-muted">
                Entrena a tu ritmo y sin separar máquinas.
              </p>
            </SectionHeading>

            <ZonasShowcase items={ZONAS} />
          </RevealOnScroll>
        </section>

        {/* 4. PLANES (bg-surface) */}
        <section
          id="planes"
          className="scroll-mt-20 border-y border-line/60 bg-surface py-16 lg:py-28"
        >
          <RevealOnScroll className="mx-auto max-w-6xl px-5 sm:px-8">
            <SectionHeading num="02" destacado="Planes" centrado>
              <p className="text-sm text-muted">Sin matrícula · Todas las zonas incluidas</p>
            </SectionHeading>

            <PlanesSection planes={planes} />
          </RevealOnScroll>
        </section>

        {/* 5. HORARIOS Y ENTRENADORES (bg-ink) */}
        <section id="horarios" className="scroll-mt-20 bg-ink py-16 lg:py-28">
          <RevealOnScroll className="mx-auto max-w-6xl px-5 sm:px-8">
            <SectionHeading num="03" destacado="Horarios" />

            <div className="grid items-start gap-8 lg:grid-cols-12 lg:gap-10">
              <div className="lg:col-span-8">
                <HorariosTimeline />

                {/* Tabla semántica accesible de respaldo (sr-only) */}
                <table className="sr-only">
                  <caption>Horarios de atención de Zentra Fitness</caption>
                  <thead>
                    <tr>
                      <th scope="col">Día</th>
                      <th scope="col">Rango</th>
                      <th scope="col">Tipo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {HORARIOS.map((dia) =>
                      dia.bloques.map((b) => (
                        <tr key={`${dia.id}-${b.desde}`}>
                          <td>{dia.etiquetaLarga}</td>
                          <td>
                            {formatoHora(b.desde)} – {formatoHora(b.hasta)}
                          </td>
                          <td>{ETIQUETA_TIPO[b.tipo]}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Tarjeta compacta de entrenadores, lista para foto + especialidad */}
              <aside className="border border-line/80 bg-surface p-6 lg:col-span-4 lg:mt-16">
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

        {/* 6. ASÍ FUNCIONA (bg-surface) */}
        <section
          id="como-funciona"
          className="scroll-mt-20 border-y border-line/60 bg-surface py-16 lg:py-28"
        >
          <RevealOnScroll className="mx-auto max-w-6xl px-5 sm:px-8">
            <SectionHeading num="04" antes="Así" destacado="funciona" />
            <ComoFunciona />
          </RevealOnScroll>
        </section>

        {/* 7. FAQ CORTO (bg-ink) */}
        <section id="preguntas" className="scroll-mt-20 bg-ink py-16 lg:py-24">
          <RevealOnScroll className="mx-auto max-w-3xl px-5 sm:px-8">
            <SectionHeading num="05" antes="Preguntas" destacado="frecuentes" />
            <FaqAccordion />
          </RevealOnScroll>
        </section>

        {/* 8. UBICACIÓN Y CONTACTO (bg-surface) */}
        <section
          id="contacto"
          className="scroll-mt-20 border-t border-line/60 bg-surface py-16 lg:py-28"
        >
          <RevealOnScroll className="mx-auto max-w-6xl px-5 sm:px-8">
            <SectionHeading num="06" antes="Separa tu" destacado="inscripción">
              <p className="text-sm text-muted">
                Déjanos tus datos y te escribimos por WhatsApp.
              </p>
            </SectionHeading>

            <div className="grid items-start gap-10 lg:grid-cols-12 lg:gap-12">
              <div className="space-y-6 lg:col-span-5">
                {/* Mapa embebido estilizado en oscuro (TODO: ver lib/landing-config.ts para pin exacto) */}
                <div className="overflow-hidden border border-line/80 bg-ink">
                  <div className="relative aspect-[16/10] w-full bg-ink">
                    <iframe
                      title="Ubicación de Zentra Fitness en Villa Estela, Ancón"
                      src={GOOGLE_MAPS_EMBED_URL}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      className="h-full w-full border-0 opacity-80 grayscale invert contrast-125"
                    />
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line/70 p-4">
                    <p className="flex items-start gap-2 text-xs text-bone sm:text-sm">
                      <MapPin
                        size={16}
                        strokeWidth={1.5}
                        className="mt-0.5 shrink-0 text-muted"
                        aria-hidden="true"
                      />
                      <span>{DIRECCION}</span>
                    </p>
                    <a
                      href={GOOGLE_MAPS_URL}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-secondary !min-h-11 shrink-0 gap-1.5 text-xs"
                    >
                      Cómo llegar <ArrowUpRight size={14} strokeWidth={1.5} />
                    </a>
                  </div>
                </div>

                <dl className="grid gap-6 border border-line/80 bg-ink p-5 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs text-muted">WhatsApp</dt>
                    <dd className="mt-1 text-base font-semibold text-bone tabular-nums">
                      <a
                        href={`https://wa.me/${WHATSAPP_NUMERO}?text=Hola%20Zentra%20Fitness,%20quisiera%20inscribirme`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-h-11 items-center transition-colors hover:text-brand"
                      >
                        {WHATSAPP_VISIBLE}
                      </a>
                    </dd>
                  </div>

                  <div>
                    <dt className="text-xs text-muted">Redes sociales</dt>
                    <dd className="mt-1 flex flex-wrap gap-4 text-sm font-medium text-bone">
                      {REDES.map((red) => (
                        <a
                          key={red.nombre}
                          href={red.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex min-h-11 items-center gap-1 transition-colors hover:text-brand"
                        >
                          {red.nombre}{' '}
                          <ArrowUpRight size={13} strokeWidth={1.5} className="text-muted" />
                        </a>
                      ))}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="lg:col-span-7">
                <LeadContactForm planes={planes} />
              </div>
            </div>
          </RevealOnScroll>
        </section>
      </main>

      {/* 9. FOOTER (bg-ink) */}
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
        href={`https://wa.me/${WHATSAPP_NUMERO}?text=Hola%20Zentra%20Fitness,%20quisiera%20informaci%C3%B3n%20sobre%20los%20planes`}
        target="_blank"
        rel="noreferrer"
        aria-label={`Escribir por WhatsApp al ${WHATSAPP_VISIBLE}`}
        className="fixed bottom-5 right-5 z-30 flex min-h-11 items-center gap-2 border border-line bg-surface-2 px-4 py-2.5 text-xs font-medium text-bone transition-colors hover:border-bone"
      >
        <MessageCircle size={16} strokeWidth={1.5} className="text-ok" />
        <span className="hidden sm:inline">WhatsApp</span>
      </a>
    </div>
  );
}
