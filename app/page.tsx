import Link from 'next/link';
import { cacheLife } from 'next/cache';
import { ArrowUpRight, Clock, Lock, MapPin, MessageCircle, UserCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Logo } from '@/components/Logo';
import {
  DisciplinasAccordion,
  LandingHeader,
  LeadContactForm,
  PlanesPricingSection,
  type DisciplinaItem,
} from '@/components/LandingInteractive';

interface PlanLanding {
  id: string;
  nombre: string;
  descripcion: string | null;
  duracion_dias: number;
  precio: number;
}

const PLANES_FALLBACK: PlanLanding[] = [
  {
    id: 'por-dia',
    nombre: 'Por día',
    descripcion: 'Pase por el día con acceso completo a todas las zonas de entrenamiento.',
    duracion_dias: 1,
    precio: 10,
  },
  {
    id: 'semanal',
    nombre: 'Semanal',
    descripcion: '7 días continuos de entrenamiento con acceso a todas las máquinas.',
    duracion_dias: 7,
    precio: 25,
  },
  {
    id: 'mensual-interdiario',
    nombre: 'Mensual (Interdiario)',
    descripcion: '30 días dejando un día de por medio (3 veces por semana).',
    duracion_dias: 30,
    precio: 60,
  },
  {
    id: 'mensual-diario',
    nombre: 'Mensual (Diario)',
    descripcion: '30 días con ingreso todos los días y acceso completo a todas las salas.',
    duracion_dias: 30,
    precio: 80,
  },
  {
    id: '2-meses-interdiario',
    nombre: '2 meses (Interdiario)',
    descripcion: '60 días en modalidad interdiaria con tarifa promocional.',
    duracion_dias: 60,
    precio: 100,
  },
  {
    id: '2-meses-diario',
    nombre: '2 meses (Diario)',
    descripcion: '60 días con asistencia todos los días a tarifa reducida.',
    duracion_dias: 60,
    precio: 140,
  },
  {
    id: '3-meses-interdiario',
    nombre: '3 meses (Interdiario)',
    descripcion: '90 días en modalidad interdiaria (S/ 50 por mes).',
    duracion_dias: 90,
    precio: 150,
  },
  {
    id: '3-meses-diario',
    nombre: '3 meses (Diario)',
    descripcion: '90 días con asistencia diaria libre y el mayor ahorro por mes.',
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
      'Área principal con jaulas de potencia, bancas olímpicas, mancuernas pesadas y máquinas de palanca convergente para progresión real de cargas.',
    intensidad: 'Alta / Progresiva',
    modalidad: 'Tiempo libre · Sala abierta todo el día',
    equipamiento: [
      'Racks de sentadilla y jaulas de potencia',
      'Bancas olímpicas planas, inclinadas y declinadas',
      'Set completo de mancuernas y barras olímpicas',
      'Máquinas de palanca y poleas duales',
    ],
  },
  {
    num: '02',
    nombre: 'Tren inferior y glúteos',
    enfoque: 'Fuerza específica · Técnica',
    detalle:
      'Circuito dedicado al desarrollo técnico de pierna y glúteo sin hacer fila, con ángulos biomecánicos seguros para cargas altas.',
    intensidad: 'Alta',
    modalidad: 'Tiempo libre · Sala abierta todo el día',
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
      'Espacio despejado para trabajo multiarticular con barras libres, kettlebells y peso corporal enfocado en coordinación y transferencia atlética.',
    intensidad: 'Media / Alta',
    modalidad: 'Tiempo libre · Sala abierta todo el día',
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
      'Línea cardiovascular lista en cualquier momento para calentar antes de las pesas, hacer intervalos intensos o volver en la noche para tu segunda sesión si tienes plan diario.',
    intensidad: 'Adaptable a tu ritmo',
    modalidad: 'Tiempo libre · Sin reserva de máquina',
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
      'Combinación práctica de sobrecarga en máquinas guiadas y gasto calórico continuo, con orientación del entrenador de planta según tu punto de partida.',
    intensidad: 'Progresiva',
    modalidad: 'Asesoría de entrenador en turno mañana y tarde/noche',
    equipamiento: [
      'Circuito completo de máquinas selectorizadas',
      'Estaciones de torso, espalda y hombro',
      'Pesos libres ligeros y medianos',
      'Guía técnica de Lucas y Juan en sala',
    ],
  },
  {
    num: '06',
    nombre: 'Movilidad, abdomen y core',
    enfoque: 'Prevención · Rango articular',
    detalle:
      'Área para activación articular previa al levantamiento, descompresión lumbar y fortalecimiento de la zona media al finalizar tu rutina.',
    intensidad: 'Media / Controlada',
    modalidad: 'Tiempo libre · Uso libre antes o después',
    equipamiento: [
      'Colchonetas de alta densidad y rodillos',
      'Bancas abdominales y soporte de lumbares',
      'Bandas elásticas de activación y movilidad',
      'Rueda abdominal y barras de suspensión',
    ],
  },
];

async function obtenerPlanesPublicos(): Promise<PlanLanding[]> {
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
      'Gimnasio de musculación, peso libre y entrenamiento funcional en Av. Arquitectos (a la espalda de la Loza 4), Villa Estela - Ancón.',
    telephone: '+51998180873',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'A la espalda de la Loza 4 – Av. Arquitectos, Villa Estela',
      addressLocality: 'Ancón',
      addressRegion: 'Lima',
      addressCountry: 'PE',
    },
    priceRange: 'S/ 10 - S/ 200',
  };

  return (
    <div className="min-h-screen bg-ink text-bone">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <LandingHeader />

      {/* 1. HERO CON PERSONALIDAD EDITORIAL */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(244,196,48,0.08),_transparent_55%)]"
        />

        <div className="relative mx-auto grid max-w-6xl gap-10 px-5 pb-14 pt-10 sm:px-8 sm:py-16 lg:grid-cols-12 lg:items-center lg:gap-12 lg:py-24">
          <div className="flex flex-col justify-between lg:col-span-7">
            <div>
              <div className="inline-flex flex-wrap items-center gap-2 bg-surface px-3 py-1.5 text-xs font-medium text-muted">
                <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                <span>Av. Arquitectos · Espalda de la Loza 4, Villa Estela</span>
              </div>

              <h1 className="font-display mt-5 text-[3.25rem] leading-[0.9] tracking-tight sm:text-7xl lg:text-8xl">
                Hierro real.
                <br />
                Tu propio ritmo.
                <br />
                <span className="text-brand">Fuerza pura.</span>
              </h1>

              <p className="mt-5 max-w-xl text-base leading-relaxed text-muted sm:mt-6 sm:text-lg">
                Equipamiento de peso libre, máquinas de palanca y entrenadores en planta. Elige tu
                modalidad <strong className="font-medium text-bone">Diaria</strong> o{' '}
                <strong className="font-medium text-bone">Interdiaria</strong> y controla tus
                asistencias solo con tu DNI.
              </p>
            </div>

            <div className="mt-8 flex flex-col gap-3.5 sm:mt-10 sm:flex-row sm:flex-wrap sm:items-center sm:gap-6">
              <a href="#planes" className="btn btn-primary w-full !min-h-12 !px-7 sm:w-auto">
                Ver planes desde S/ 10
              </a>
              <Link
                href="/consulta"
                className="inline-flex items-center justify-center gap-1.5 py-2 text-sm font-medium text-muted transition-colors hover:text-bone sm:justify-start"
              >
                Soy socio · Consultar mis días <ArrowUpRight size={16} strokeWidth={1.5} />
              </Link>
            </div>
          </div>

          {/* Pieza visual única del Hero */}
          <div className="relative overflow-hidden bg-surface lg:col-span-5">
            <div className="relative aspect-[16/10] sm:aspect-[4/3] lg:aspect-[4/4.6]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/brand/zentra-cover.jpg"
                alt="Instalaciones de Zentra Fitness en Villa Estela - Ancón"
                className="h-full w-full object-cover opacity-80 saturate-50"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/25 to-transparent" />

              <div className="absolute bottom-4 left-4 right-4 bg-ink/90 p-4 backdrop-blur-xs sm:bottom-5 sm:left-5 sm:right-5">
                <div className="flex items-center justify-between text-xs text-muted">
                  <span>Check-in rápido con DNI</span>
                  <span className="font-mono text-bone">ABIERTO LUN – DOM</span>
                </div>
                <p className="mt-1 text-sm font-semibold text-bone">
                  1 ingreso por día según tu modalidad (pase por día disponible para reingresos).
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Franja inferior de datos reales */}
        <div className="border-y border-line/70 bg-surface">
          <dl className="mx-auto grid max-w-6xl grid-cols-1 divide-y divide-line/60 px-5 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:px-8">
            <div className="py-4 sm:py-5 sm:pr-6">
              <dt className="text-xs text-muted">Ubicación exacta</dt>
              <dd className="mt-0.5 text-sm font-semibold text-bone">
                Espalda de la Loza 4 – Av. Arquitectos, Villa Estela
              </dd>
            </div>
            <div className="py-4 sm:px-6 sm:py-5">
              <dt className="text-xs text-muted">Lunes a sábado</dt>
              <dd className="mt-0.5 text-sm font-semibold text-bone tabular-nums">
                6:00 am a 10:30 pm (Sáb 7:00 am a 10:00 pm)
              </dd>
            </div>
            <div className="py-4 sm:py-5 sm:pl-6">
              <dt className="text-xs text-muted">Domingos y WhatsApp</dt>
              <dd className="mt-0.5 text-sm font-semibold text-bone tabular-nums">
                Dom 9:00 am a 2:00 pm (Solo por día) · 998 180 873
              </dd>
            </div>
          </dl>
        </div>
      </section>

      {/* 2. ZONAS DE ENTRENAMIENTO */}
      <section id="disciplinas" className="scroll-mt-24 py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="mb-8 flex flex-col justify-between gap-3 sm:mb-12 sm:flex-row sm:items-end">
            <div>
              <h2 className="section-title text-2xl sm:text-3xl">
                Seis zonas, un solo acceso libre
              </h2>
              <p className="mt-2 max-w-xl text-sm text-muted">
                Todas las áreas están disponibles para tu rutina sin necesidad de separar máquinas.
              </p>
            </div>
            <p className="font-mono text-xs text-muted">01 — 06 · EQUIPAMIENTO EN PLANTA</p>
          </div>

          <DisciplinasAccordion items={DISCIPLINAS} />
        </div>
      </section>

      {/* 3. PLANES Y MEMBRESÍAS (Selector Diario / Interdiario + 3 Tarjetas + Pases) */}
      <section id="planes" className="scroll-mt-24 bg-surface py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="mb-10 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div className="max-w-xl">
              <h2 className="section-title text-2xl sm:text-3xl">Planes de entrenamiento</h2>
              <p className="mt-2 text-sm text-muted">
                Elige entre entrenar a diario de lunes a sábado o en modalidad interdiaria (3 días por semana).
              </p>
            </div>
            <p className="text-xs text-muted">
              Tarifas transparentes · Sin cobro de matrícula
            </p>
          </div>

          <PlanesPricingSection planes={planes} />
        </div>
      </section>

      {/* 4. HORARIOS DE ATENCIÓN Y ENTRENADORES EN PLANTA */}
      <section id="horarios" className="scroll-mt-24 py-16 sm:py-24">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 sm:px-8 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-5">
            <h2 className="section-title text-2xl sm:text-3xl">
              Horarios de atención y entrenadores
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Contamos con bloques supervisados con entrenador en sala y una franja de mediodía para
              entrenamiento libre.
            </p>

            <div className="mt-6 space-y-3 bg-surface p-5 text-sm">
              <p className="text-xs font-medium text-muted">Entrenadores en planta</p>
              <div className="space-y-2">
                <div className="flex items-baseline justify-between border-b border-line/60 pb-2">
                  <span className="font-semibold text-bone">Lucas</span>
                  <span className="text-xs text-muted">Entrenador principal · Lun a Vie</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="font-semibold text-bone">Juan</span>
                  <span className="text-xs text-muted">Entrenador · Sábados y cobertura</span>
                </div>
              </div>
            </div>
          </div>

          <div className="divide-y divide-line/80 border-y border-line/80 lg:col-span-7">
            <article className="grid gap-2 py-5 sm:grid-cols-[170px_1fr] sm:gap-4">
              <span className="font-mono text-xs font-semibold text-bone sm:pt-1">
                LUNES A VIERNES
              </span>
              <div>
                <h3 className="section-title text-base">
                  6:00 a.m. – 11:00 a.m. y 4:00 p.m. – 10:30 p.m.
                </h3>
                <p className="mt-1 text-xs text-ok">Con entrenador en sala</p>
                <p className="mt-1 text-sm text-muted">
                  Supervisión de técnica, rutinas y acompañamiento en piso.
                </p>
              </div>
            </article>

            <article className="grid gap-2 py-5 sm:grid-cols-[170px_1fr] sm:gap-4">
              <span className="font-mono text-xs font-semibold text-bone sm:pt-1">SÁBADOS</span>
              <div>
                <h3 className="section-title text-base">
                  7:00 a.m. – 11:00 a.m. y 4:00 p.m. – 10:00 p.m.
                </h3>
                <p className="mt-1 text-xs text-ok">Con entrenador en sala</p>
                <p className="mt-1 text-sm text-muted">
                  Entrenamiento de fin de semana con asesoría de planta.
                </p>
              </div>
            </article>

            <article className="grid gap-2 py-5 sm:grid-cols-[170px_1fr] sm:gap-4">
              <span className="font-mono text-xs font-semibold text-muted sm:pt-1">
                LUNES A SÁBADO (MEDIODÍA)
              </span>
              <div>
                <h3 className="section-title text-base">11:00 a.m. – 4:00 p.m.</h3>
                <p className="mt-1 text-xs text-muted">Entrenamiento libre sin entrenador</p>
                <p className="mt-1 text-sm text-muted">
                  Sala abierta con menor afluencia para quienes entrenan por su cuenta al mediodía.
                </p>
              </div>
            </article>

            <article className="grid gap-2 py-5 sm:grid-cols-[170px_1fr] sm:gap-4">
              <span className="font-mono text-xs font-semibold text-warn sm:pt-1">DOMINGOS</span>
              <div>
                <h3 className="section-title text-base">9:00 a.m. – 2:00 p.m.</h3>
                <p className="mt-1 text-xs text-warn">Únicamente pago por día (S/ 10)</p>
                <p className="mt-1 text-sm text-muted">
                  Apertura especial dominical en modalidad de pase diario en recepción.
                </p>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* 5. CONTACTO + UBICACIÓN + FORMULARIO DE INSCRIPCIÓN */}
      <section id="contacto" className="scroll-mt-24 bg-surface py-16 sm:py-24">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 sm:px-8 lg:grid-cols-12 lg:gap-12">
          <div className="flex flex-col justify-between lg:col-span-5">
            <div>
              <h2 className="section-title text-2xl sm:text-3xl">Separa tu inscripción</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Déjanos tus datos y el plan que te interesa para escribirte por WhatsApp, o acércate
                directamente a recepción.
              </p>

              <dl className="mt-8 space-y-5 border-t border-line/70 pt-6 text-sm">
                <div>
                  <dt className="text-xs text-muted">Ubicación y referencia</dt>
                  <dd className="mt-1 flex items-start gap-2 font-medium text-bone">
                    <MapPin size={16} strokeWidth={1.5} className="mt-0.5 shrink-0 text-muted" />
                    <span>
                      A la espalda de la Loza 4 – Av. Arquitectos, Villa Estela (Ancón, Lima)
                    </span>
                  </dd>
                </div>

                <div>
                  <dt className="text-xs text-muted">Teléfono / WhatsApp oficial</dt>
                  <dd className="mt-1 font-mono text-base font-semibold text-bone tabular-nums">
                    <a
                      href="https://wa.me/51998180873?text=Hola%20Zentra%20Fitness,%20quisiera%20informaci%C3%B3n%20para%20inscribirme"
                      target="_blank"
                      rel="noreferrer"
                      className="hover:underline"
                    >
                      998 180 873
                    </a>
                  </dd>
                </div>

                <div>
                  <dt className="text-xs text-muted">Resumen de horarios</dt>
                  <dd className="mt-1 flex items-start gap-2 text-xs leading-relaxed text-bone tabular-nums">
                    <Clock size={15} strokeWidth={1.5} className="mt-0.5 shrink-0 text-muted" />
                    <span>
                      Lun–Vie: 6:00 am – 10:30 pm · Sáb: 7:00 am – 10:00 pm
                      <br />
                      (11:00 am – 4:00 pm sin entrenador) · Dom: 9:00 am – 2:00 pm
                    </span>
                  </dd>
                </div>

                <div>
                  <dt className="text-xs text-muted">Redes sociales oficiales</dt>
                  <dd className="mt-1.5 flex flex-wrap gap-5 text-sm font-medium text-bone">
                    <a
                      href="https://www.tiktok.com/@zentrafitnessperu?_r=1&_t=ZS-9BFZ0vSjjqG"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 hover:underline"
                    >
                      TikTok <ArrowUpRight size={13} strokeWidth={1.5} className="text-muted" />
                    </a>
                    <a
                      href="https://www.facebook.com/share/1E53yWwEMJ/"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 hover:underline"
                    >
                      Facebook <ArrowUpRight size={13} strokeWidth={1.5} className="text-muted" />
                    </a>
                    <a
                      href="https://www.instagram.com/zentrafitnessperu?obrf=cTZmbnVzMWVmem02"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 hover:underline"
                    >
                      Instagram <ArrowUpRight size={13} strokeWidth={1.5} className="text-muted" />
                    </a>
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          <div className="lg:col-span-7">
            <LeadContactForm />
          </div>
        </div>
      </section>

      {/* 6. FOOTER CON ACCESOS DIRECTOS A PORTAL DE SOCIOS Y PANEL DE PERSONAL */}
      <footer className="border-t border-line/80 bg-ink py-12 sm:py-14">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="flex flex-col justify-between gap-8 pb-10 lg:flex-row lg:items-center">
            <div>
              <Logo className="w-40 sm:w-44" />
              <p className="mt-2.5 text-xs text-muted">
                A la espalda de la Loza 4 – Av. Arquitectos, Villa Estela · Ancón
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Link
                href="/consulta"
                className="flex items-center justify-between gap-4 bg-surface px-4 py-3 text-sm font-medium text-bone transition-colors hover:bg-surface-2"
              >
                <span className="inline-flex items-center gap-2">
                  <UserCheck size={16} strokeWidth={1.5} className="text-muted" />
                  Portal del socio (DNI)
                </span>
                <ArrowUpRight size={15} strokeWidth={1.5} className="text-muted" />
              </Link>

              <Link
                href="/login"
                className="flex items-center justify-between gap-4 bg-surface px-4 py-3 text-sm font-medium text-bone transition-colors hover:bg-surface-2"
              >
                <span className="inline-flex items-center gap-2">
                  <Lock size={15} strokeWidth={1.5} className="text-muted" />
                  Panel de trabajadores / Admin
                </span>
                <ArrowUpRight size={15} strokeWidth={1.5} className="text-muted" />
              </Link>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line/60 pt-6 text-xs text-muted">
            <p>© 2026 Zentra Fitness. Todos los derechos reservados.</p>
            <p>WhatsApp oficial: 998 180 873</p>
          </div>
        </div>
      </footer>

      {/* Botón flotante de WhatsApp con el número oficial 998180873 */}
      <a
        href="https://wa.me/51998180873?text=Hola%20Zentra%20Fitness,%20quisiera%20informaci%C3%B3n%20sobre%20los%20planes"
        target="_blank"
        rel="noreferrer"
        aria-label="Escribir por WhatsApp al 998 180 873"
        className="fixed bottom-5 right-5 z-30 flex items-center gap-2 border border-line bg-surface-2 px-4 py-2.5 text-xs font-medium text-bone transition-colors hover:border-bone"
      >
        <MessageCircle size={16} strokeWidth={1.5} className="text-ok" />
        <span className="hidden sm:inline">WhatsApp · 998 180 873</span>
      </a>
    </div>
  );
}
