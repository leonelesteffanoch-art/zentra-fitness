import Link from 'next/link';
import { cacheLife } from 'next/cache';
import { ArrowUpRight, Check, Lock, MapPin, MessageCircle, UserCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Logo } from '@/components/Logo';
import {
  DisciplinasAccordion,
  LandingHeader,
  LeadContactForm,
  type DisciplinaItem,
} from '@/components/LandingInteractive';
import { soles } from '@/lib/formato';

interface PlanLanding {
  id: string;
  nombre: string;
  descripcion: string | null;
  duracion_dias: number;
  precio: number;
}

const PLANES_FALLBACK: PlanLanding[] = [
  {
    id: 'semanal',
    nombre: 'Semanal',
    descripcion: 'Acceso libre y sin límite de tiempo por sesión a todas las salas durante 7 días.',
    duracion_dias: 7,
    precio: 25,
  },
  {
    id: 'mensual',
    nombre: 'Mensual',
    descripcion: 'Plan base de entrenamiento continuo con acceso total y opción de congelamiento.',
    duracion_dias: 30,
    precio: 80,
  },
  {
    id: 'trimestral',
    nombre: 'Trimestral',
    descripcion: 'Bloque de 90 días con mejor tarifa mensual y hasta 15 días de congelamiento.',
    duracion_dias: 90,
    precio: 210,
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
      'Línea cardiovascular lista en cualquier momento para calentar antes de las pesas, hacer intervalos intensos o cerrar tu sesión con cardio continuo.',
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
    modalidad: 'Tiempo libre · Asesoría en piso incluida',
    equipamiento: [
      'Circuito completo de máquinas selectorizadas',
      'Estaciones de torso, espalda y hombro',
      'Pesos libres ligeros y medianos',
      'Guía técnica de nuestro staff en sala',
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

const PILARES_CLUB = [
  {
    num: '01',
    titulo: 'Tiempo libre real, sin reloj',
    descripcion:
      'Entrena 45 minutos o quédate 2 horas. No limitamos la duración de tu sesión ni te pedimos reservar turno por aplicación.',
  },
  {
    num: '02',
    titulo: 'Todas las salas siempre abiertas',
    descripcion:
      'Tu membresía o pase diario te da acceso directo a musculación, peso libre, tren inferior, funcional y cardio durante todo el horario del club.',
  },
  {
    num: '03',
    titulo: 'Control transparente con tu DNI',
    descripcion:
      'Ingresa en menos de 5 segundos en recepción y consulta desde tu celular cuántos días vigentes te quedan y cuántas asistencias llevas en el mes.',
  },
  {
    num: '04',
    titulo: 'Flexibilidad de pago y congelamiento',
    descripcion:
      'Paga con Efectivo, Yape, Plin o tarjeta, abona a cuenta si lo necesitas y congela tus días en planes mensuales o trimestrales.',
  },
];

async function obtenerPlanesPublicos(): Promise<PlanLanding[]> {
  'use cache';
  cacheLife('hours');
  try {
    const { data, error } = await supabase
      .from('v_landing_planes')
      .select('id, nombre, descripcion, duracion_dias, precio')
      .order('duracion_dias')
      .limit(10);
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
      'Gimnasio de musculación, peso libre y entrenamiento de tiempo libre en Villa Estela Km. 39 - Ancón.',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Villa Estela Km. 39',
      addressLocality: 'Ancón',
      addressRegion: 'Lima',
      addressCountry: 'PE',
    },
    priceRange: 'S/ 25 - S/ 210',
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
        {/* Luz ambiental cálida sutil para dar profundidad sin sobrecargar */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(244,196,48,0.08),_transparent_55%)]"
        />

        <div className="relative mx-auto grid max-w-6xl gap-10 px-5 pb-14 pt-10 sm:px-8 sm:py-16 lg:grid-cols-12 lg:items-center lg:gap-12 lg:py-24">
          <div className="flex flex-col justify-between lg:col-span-7">
            <div>
              <div className="inline-flex flex-wrap items-center gap-2 bg-surface px-3 py-1.5 text-xs font-medium text-muted">
                <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                <span>Villa Estela Km. 39 · Ancón</span>
                <span className="text-line">·</span>
                <span className="text-bone">Tiempo libre sin reservas</span>
              </div>

              <h1 className="font-display mt-5 text-[3.25rem] leading-[0.9] tracking-tight sm:text-7xl lg:text-8xl">
                Hierro real.
                <br />
                Tu propio ritmo.
                <br />
                <span className="text-brand">Fuerza pura.</span>
              </h1>

              <p className="mt-5 max-w-xl text-base leading-relaxed text-muted sm:mt-6 sm:text-lg">
                Sin turnos cerrados ni límite de duración por sesión. Todas nuestras salas de
                musculación, peso libre, tren inferior y cardio están siempre abiertas para que
                entrenes a tu manera.
              </p>
            </div>

            <div className="mt-8 flex flex-col gap-3.5 sm:mt-10 sm:flex-row sm:flex-wrap sm:items-center sm:gap-6">
              <a href="#planes" className="btn btn-primary w-full !min-h-12 !px-7 sm:w-auto">
                Ver planes y precios
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
                alt="Instalaciones de Zentra Fitness en Ancón"
                className="h-full w-full object-cover opacity-80 saturate-50"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/25 to-transparent" />

              <div className="absolute bottom-4 left-4 right-4 bg-ink/90 p-4 backdrop-blur-xs sm:bottom-5 sm:left-5 sm:right-5">
                <div className="flex items-center justify-between text-xs text-muted">
                  <span>Acceso directo con DNI</span>
                  <span className="font-mono text-bone">6 ZONAS ACTIVAS</span>
                </div>
                <p className="mt-1 text-sm font-semibold text-bone">
                  Pasa de las jaulas de potencia a cardio o peso libre cuando tu rutina lo pida.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Franja inferior de datos clave del gimnasio */}
        <div className="border-y border-line/70 bg-surface">
          <dl className="mx-auto grid max-w-6xl grid-cols-1 divide-y divide-line/60 px-5 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:px-8">
            <div className="py-4 sm:py-5 sm:pr-6">
              <dt className="text-xs text-muted">Modalidad de entrenamiento</dt>
              <dd className="mt-0.5 text-sm font-semibold text-bone">
                Tiempo libre · Todas las salas incluidas
              </dd>
            </div>
            <div className="py-4 sm:px-6 sm:py-5">
              <dt className="text-xs text-muted">Horario corrido de atención</dt>
              <dd className="mt-0.5 text-sm font-semibold text-bone tabular-nums">
                Lun – Vie 6:00 a 22:00 · Sáb 7:00 a 14:00
              </dd>
            </div>
            <div className="py-4 sm:py-5 sm:pl-6">
              <dt className="text-xs text-muted">Ubicación e ingreso</dt>
              <dd className="mt-0.5 text-sm font-semibold text-bone">
                Villa Estela Km. 39 - Ancón · Check-in con DNI
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
                Todas las áreas están abiertas en simultáneo. Sin horarios fijos de sala ni límite
                de permanencia.
              </p>
            </div>
            <p className="font-mono text-xs text-muted">01 — 06 · EQUIPAMIENTO EN PLANTA</p>
          </div>

          <DisciplinasAccordion items={DISCIPLINAS} />
        </div>
      </section>

      {/* 3. PLANES Y MEMBRESÍAS (conectado en vivo a Supabase) */}
      <section id="planes" className="scroll-mt-24 bg-surface py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="mb-8 flex flex-col justify-between gap-3 sm:mb-12 sm:flex-row sm:items-end">
            <div className="max-w-xl">
              <h2 className="section-title text-2xl sm:text-3xl">Planes y membresías</h2>
              <p className="mt-2 text-sm text-muted">
                Tarifas transparentes en soles, sin cobros de matrícula ni costos ocultos.
              </p>
            </div>
            <p className="text-xs text-muted">
              También contamos con <strong className="font-medium text-bone">Pase diario</strong> en
              recepción
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {planes.map((p, idx) => {
              const destacado =
                p.nombre.toLowerCase().includes('mensual') || (planes.length >= 2 && idx === 1);
              const costoPorDia = Math.round((p.precio / Math.max(1, p.duracion_dias)) * 100) / 100;

              return (
                <article
                  key={p.id}
                  className={`flex flex-col justify-between p-6 sm:p-7 ${
                    destacado ? 'bg-ink ring-1 ring-brand' : 'bg-ink/70'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-muted">
                        0{idx + 1} · {p.duracion_dias} días
                      </span>
                      {destacado && (
                        <span className="rounded-xs bg-brand px-2 py-0.5 text-xs font-semibold text-brand-ink">
                          Más elegido
                        </span>
                      )}
                    </div>

                    <h3 className="section-title mt-3 text-xl">{p.nombre}</h3>

                    <div className="mt-4 flex items-baseline gap-2 border-y border-line/70 py-4 tabular-nums">
                      <span className="text-4xl font-bold text-bone">{soles(p.precio)}</span>
                      <span className="text-xs text-muted">({soles(costoPorDia)} / día)</span>
                    </div>

                    <p className="mt-4 text-sm leading-relaxed text-muted">
                      {p.descripcion ??
                        `Acceso libre a todas las zonas de Zentra Fitness durante ${p.duracion_dias} días calendario.`}
                    </p>

                    <ul className="mt-6 space-y-2.5 text-xs text-bone">
                      <li className="flex items-center gap-2">
                        <Check size={14} strokeWidth={1.5} className="shrink-0 text-muted" />
                        <span>Tiempo libre sin límite de duración por sesión</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check size={14} strokeWidth={1.5} className="shrink-0 text-muted" />
                        <span>Acceso total a las 6 zonas y asesoría en planta</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check size={14} strokeWidth={1.5} className="shrink-0 text-muted" />
                        <span>Control de días y asistencias con tu DNI</span>
                      </li>
                    </ul>
                  </div>

                  <a
                    href="#contacto"
                    className={`btn mt-8 w-full ${destacado ? 'btn-primary' : 'btn-secondary'}`}
                  >
                    Elegir plan {p.nombre}
                  </a>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* 4. EL CLUB / POR QUÉ ENTRENAR EN ZENTRA (Diseño editorial asimétrico, sin relleno genérico) */}
      <section id="metodo" className="scroll-mt-24 py-16 sm:py-24">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 sm:px-8 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-5">
            <h2 className="section-title text-2xl sm:text-3xl">
              Entrena sin reservas ni letras pequeñas
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Diseñamos Zentra Fitness para que vengas a levantar, progresar y aprovechar cada día
              de tu membresía con equipamiento sólido y reglas claras.
            </p>

            {/* Bloque de métricas operativas reales */}
            <div className="mt-8 grid grid-cols-2 gap-4 bg-surface p-5">
              <div>
                <p className="text-2xl font-bold text-bone tabular-nums">&lt; 5 seg</p>
                <p className="mt-0.5 text-xs text-muted">Ingreso rápido en recepción con tu DNI</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-bone tabular-nums">100% libre</p>
                <p className="mt-0.5 text-xs text-muted">Sin turnos cerrados ni tope de horas</p>
              </div>
            </div>
          </div>

          <div className="divide-y divide-line/80 border-y border-line/80 lg:col-span-7">
            {PILARES_CLUB.map((pilar) => (
              <article
                key={pilar.num}
                className="grid gap-2 py-6 sm:grid-cols-[48px_1fr] sm:gap-4"
              >
                <span className="font-mono text-xs text-muted sm:pt-1">{pilar.num}</span>
                <div>
                  <h3 className="section-title text-lg">{pilar.titulo}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">{pilar.descripcion}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 5. CONTACTO + UBICACIÓN */}
      <section id="contacto" className="scroll-mt-24 bg-surface py-16 sm:py-24">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 sm:px-8 lg:grid-cols-12 lg:gap-12">
          <div className="flex flex-col justify-between lg:col-span-5">
            <div>
              <h2 className="section-title text-2xl sm:text-3xl">Empieza a entrenar hoy</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Déjanos tus datos para separar tu inscripción por WhatsApp o acércate directamente
                a nuestro mostrador en Villa Estela.
              </p>

              <dl className="mt-8 space-y-5 border-t border-line/70 pt-6 text-sm">
                <div>
                  <dt className="text-xs text-muted">Dirección</dt>
                  <dd className="mt-1 flex items-center gap-2 font-medium text-bone">
                    <MapPin size={16} strokeWidth={1.5} className="shrink-0 text-muted" />
                    Villa Estela Km. 39 - Ancón, Lima
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Horario general del gimnasio</dt>
                  <dd className="mt-1 font-medium text-bone tabular-nums">
                    Lunes a viernes: 6:00 am – 10:00 pm
                    <br />
                    Sábados: 7:00 am – 2:00 pm
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Medios de pago aceptados en caja</dt>
                  <dd className="mt-1 text-bone">Efectivo, Yape, Plin y Tarjeta</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Redes sociales</dt>
                  <dd className="mt-1 flex gap-5 text-sm font-medium text-bone">
                    <a
                      href="https://facebook.com"
                      target="_blank"
                      rel="noreferrer"
                      className="hover:underline"
                    >
                      Facebook
                    </a>
                    <a
                      href="https://instagram.com"
                      target="_blank"
                      rel="noreferrer"
                      className="hover:underline"
                    >
                      Instagram
                    </a>
                    <a
                      href="https://tiktok.com"
                      target="_blank"
                      rel="noreferrer"
                      className="hover:underline"
                    >
                      TikTok
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
                Villa Estela Km. 39 - Ancón · Lima, Perú
              </p>
            </div>

            {/* Accesos rápidos diferenciados para socios y para trabajadores/administradores */}
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
            <p>Sistema de recepción, socios y caja en tiempo real</p>
          </div>
        </div>
      </footer>

      {/* Botón flotante discreto de WhatsApp */}
      <a
        href="https://wa.me/51999000000?text=Hola%20Zentra%20Fitness,%20quisiera%20informaci%C3%B3n%20sobre%20los%20planes"
        target="_blank"
        rel="noreferrer"
        aria-label="Escribir por WhatsApp"
        className="fixed bottom-5 right-5 z-30 flex items-center gap-2 border border-line bg-surface-2 px-4 py-2.5 text-xs font-medium text-bone transition-colors hover:border-bone"
      >
        <MessageCircle size={16} strokeWidth={1.5} className="text-ok" />
        <span className="hidden sm:inline">WhatsApp</span>
      </a>
    </div>
  );
}
