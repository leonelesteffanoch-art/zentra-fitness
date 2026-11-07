import Link from 'next/link';
import { cacheLife } from 'next/cache';
import { ArrowUpRight, Check, MapPin, MessageCircle } from 'lucide-react';
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
    descripcion: 'Acceso completo a sala de musculación, peso libre y zona cardio durante 7 días.',
    duracion_dias: 7,
    precio: 25,
  },
  {
    id: 'mensual',
    nombre: 'Mensual',
    descripcion: 'Plan base de entrenamiento continuo con derecho a congelamiento programado.',
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
      'Racks de sentadilla, bancas olímpicas, mancuernas pesadas y máquinas de palanca diseñadas para progresión real de cargas.',
    intensidad: 'Alta / Progresiva',
    duracion: '60 – 90 min',
  },
  {
    num: '02',
    nombre: 'Fuerza funcional',
    enfoque: 'Potencia · Estabilidad',
    detalle:
      'Trabajo multiarticular con barras, kettlebells, trineo y peso corporal para ganar fuerza aplicable y control del core.',
    intensidad: 'Alta',
    duracion: '50 min',
  },
  {
    num: '03',
    nombre: 'Zona cardio y metabólico',
    enfoque: 'Capacidad aeróbica · HIIT',
    detalle:
      'Trotadoras, elípticas y bicicletas de alto tráfico para sesiones de resistencia continua o intervalos de alta intensidad.',
    intensidad: 'Media / Alta',
    duracion: '30 – 45 min',
  },
  {
    num: '04',
    nombre: 'Tren inferior y glúteos',
    enfoque: 'Fuerza específica · Técnica',
    detalle:
      'Circuito especializado con prensa, hack squat, hip thrust y poleas para desarrollo técnico del tren inferior.',
    intensidad: 'Alta',
    duracion: '60 min',
  },
  {
    num: '05',
    nombre: 'Recomposición corporal',
    enfoque: 'Déficit · Tonificación',
    detalle:
      'Programación combinada de sobrecarga mecánica y gasto calórico estructurado por nuestros entrenadores de planta.',
    intensidad: 'Adaptable',
    duracion: '60 min',
  },
  {
    num: '06',
    nombre: 'Movilidad y core',
    enfoque: 'Prevención · Rango articular',
    detalle:
      'Rutinas de activación, descompresión lumbar y fortalecimiento de zona media antes o después de tu sesión principal.',
    intensidad: 'Media',
    duracion: '25 min',
  },
];

const ENTRENADORES = [
  {
    num: '01',
    nombre: 'Coach de planta · Turno mañana',
    especialidad: 'Fuerza e hipertrofia muscular',
    certificacion: 'Especialista en biomecánica y programación de cargas',
  },
  {
    num: '02',
    nombre: 'Coach de planta · Turno tarde',
    especialidad: 'Recomposición y tren inferior',
    certificacion: 'Entrenador certificado en acondicionamiento físico',
  },
  {
    num: '03',
    nombre: 'Coach funcional · Turno noche',
    especialidad: 'Preparación atlética y metabólico',
    certificacion: 'Instructor de entrenamiento funcional y movilidad',
  },
];

const HORARIOS_BLOQUES = [
  {
    franja: '06:00 – 10:00',
    lunesViernes: 'Sala de musculación y asesoría de planta',
    sabado: 'Musculación libre y funcional',
    domingo: 'Cerrado / Descanso',
  },
  {
    franja: '10:00 – 16:00',
    lunesViernes: 'Entrenamiento libre · Aforo fluido',
    sabado: 'Musculación y cardio (hasta 14:00)',
    domingo: 'Cerrado / Descanso',
  },
  {
    franja: '16:00 – 22:00',
    lunesViernes: 'Musculación, tren inferior y funcional',
    sabado: '—',
    domingo: '—',
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
      'Gimnasio de musculación, peso libre y entrenamiento funcional en Villa Estela Km. 39 - Ancón.',
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

      {/* 1. HERO */}
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 sm:px-8 lg:grid-cols-12 lg:py-24">
          <div className="flex flex-col justify-between lg:col-span-7">
            <div>
              <p className="text-sm font-medium text-muted">
                Villa Estela Km. 39 · Ancón
              </p>
              <h1 className="font-display mt-3 text-6xl tracking-tight sm:text-8xl">
                Hierro real.
                <br />
                Cero excusas.
                <br />
                <span className="text-brand">Fuerza pura.</span>
              </h1>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
                Equipamiento de peso libre, máquinas de palanca y programación directa en planta.
                Un espacio serio para entrenar sin distracciones.
              </p>
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-6">
              <a href="#planes" className="btn btn-primary !min-h-12 !px-7">
                Ver planes y precios
              </a>
              <Link
                href="/consulta"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-bone"
              >
                Soy socio · Consultar mis días <ArrowUpRight size={16} strokeWidth={1.5} />
              </Link>
            </div>
          </div>

          <div className="relative min-h-[340px] overflow-hidden bg-surface lg:col-span-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/zentra-cover.jpg"
              alt="Instalaciones de Zentra Fitness en Ancón"
              className="h-full w-full object-cover opacity-75 saturate-50"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/20 to-transparent" />
            <div className="absolute bottom-5 left-5 right-5">
              <p className="text-xs font-medium text-muted">Check-in digital en recepción</p>
              <p className="mt-0.5 text-sm font-semibold text-bone">
                Ingreso con tu DNI en menos de 5 segundos y control transparente de tus días.
              </p>
            </div>
          </div>
        </div>

        {/* Franja inferior de 3 datos */}
        <div className="bg-surface">
          <dl className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-5 py-6 sm:grid-cols-3 sm:px-8">
            <div>
              <dt className="text-xs text-muted">Ubicación</dt>
              <dd className="mt-0.5 text-sm font-semibold text-bone">
                Villa Estela Km. 39 - Ancón
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Horario referencial</dt>
              <dd className="mt-0.5 text-sm font-semibold text-bone tabular-nums">
                Lun – Vie 6:00 a 22:00 · Sáb 7:00 a 14:00
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Modalidades</dt>
              <dd className="mt-0.5 text-sm font-semibold text-bone">
                Pase diario, Semanal, Mensual y Trimestral
              </dd>
            </div>
          </dl>
        </div>
      </section>

      {/* 2. DISCIPLINAS / ZONAS */}
      <section id="disciplinas" className="scroll-mt-24 py-24 sm:py-28">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="mb-10">
            <h2 className="section-title text-2xl sm:text-3xl">Disciplinas y zonas de entrenamiento</h2>
          </div>

          <DisciplinasAccordion items={DISCIPLINAS} />
        </div>
      </section>

      {/* 3. MÉTODO / POR QUÉ NOSOTROS */}
      <section id="metodo" className="scroll-mt-24 bg-surface py-24 sm:py-28">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="max-w-xl">
            <h2 className="section-title text-2xl sm:text-3xl">Por qué entrenar en Zentra</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Máquinas sólidas, orden en sala y un sistema digital que respeta tu tiempo y tus días pagados.
            </p>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            <article className="bg-surface-2 p-6">
              <span className="font-mono text-xs text-muted">01</span>
              <h3 className="section-title mt-4 text-lg">Fierro y peso libre</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Jaulas, barras, discos y mancuernas suficientes para no perder media hora
                esperando turno en hora punta.
              </p>
            </article>

            <article className="bg-surface-2 p-6">
              <span className="font-mono text-xs text-muted">02</span>
              <h3 className="section-title mt-4 text-lg">Flexibilidad real</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Pagos en Efectivo, Yape, Plin o mixtos, posibilidad de abonar a cuenta y
                congelamiento de días en planes habilitados.
              </p>
            </article>

            <article className="bg-surface-2 p-6">
              <span className="font-mono text-xs text-muted">03</span>
              <h3 className="section-title mt-4 text-lg">Control por DNI</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Consulta desde tu celular cuántos días te quedan y cuántas asistencias llevas en
                el mes sin instalar aplicaciones.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* 4. PLANES Y PRECIOS (conectado en vivo a Supabase) */}
      <section id="planes" className="scroll-mt-24 py-24 sm:py-28">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="mb-10 max-w-xl">
            <h2 className="section-title text-2xl sm:text-3xl">Planes y membresías</h2>
            <p className="mt-2 text-sm text-muted">
              Tarifas transparentes en soles, sin costos de matrícula ocultos.
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
                  className={`flex flex-col justify-between p-7 ${
                    destacado ? 'bg-surface-2 ring-1 ring-brand' : 'bg-surface'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-muted">
                        0{idx + 1} · {p.duracion_dias} días
                      </span>
                      {destacado && (
                        <span className="rounded-xs bg-brand px-2 py-0.5 text-xs font-semibold text-brand-ink">
                          Recomendado
                        </span>
                      )}
                    </div>

                    <h3 className="section-title mt-3 text-xl">{p.nombre}</h3>

                    <div className="mt-4 flex items-baseline gap-2 border-y border-line/70 py-4 tabular-nums">
                      <span className="text-4xl font-bold text-bone">
                        {soles(p.precio)}
                      </span>
                      <span className="text-xs text-muted">
                        ({soles(costoPorDia)} / día)
                      </span>
                    </div>

                    <p className="mt-4 text-sm leading-relaxed text-muted">
                      {p.descripcion ??
                        `Acceso completo a todas las zonas de Zentra Fitness durante ${p.duracion_dias} días calendario.`}
                    </p>

                    <ul className="mt-6 space-y-2 text-xs text-bone">
                      <li className="flex items-center gap-2">
                        <Check size={14} strokeWidth={1.5} className="text-muted" />
                        Acceso libre a musculación, peso libre y cardio
                      </li>
                      <li className="flex items-center gap-2">
                        <Check size={14} strokeWidth={1.5} className="text-muted" />
                        Registro de asistencias y control por DNI
                      </li>
                      <li className="flex items-center gap-2">
                        <Check size={14} strokeWidth={1.5} className="text-muted" />
                        Pago con Efectivo, Yape, Plin o Tarjeta
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

      {/* 5. ENTRENADORES / STAFF */}
      <section id="entrenadores" className="scroll-mt-24 bg-surface py-24 sm:py-28">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="mb-10 max-w-xl">
            <h2 className="section-title text-2xl sm:text-3xl">Staff de entrenadores</h2>
            <p className="mt-2 text-sm text-muted">
              Supervisión técnica en piso para corregir ejecución y estructurar tu progresión.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {ENTRENADORES.map((e) => (
              <article key={e.num} className="flex flex-col justify-between bg-ink p-6">
                <div className="relative aspect-[4/3] overflow-hidden bg-surface-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/brand/zentra-cover.jpg"
                    alt={e.nombre}
                    className="h-full w-full object-cover opacity-55 grayscale"
                  />
                  <span className="font-mono absolute left-3 top-3 bg-ink/85 px-2 py-0.5 text-xs text-muted">
                    {e.num}
                  </span>
                </div>
                <div className="mt-5">
                  <p className="text-xs font-medium text-muted">{e.especialidad}</p>
                  <h3 className="section-title mt-1 text-lg">{e.nombre}</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted">{e.certificacion}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 6. HORARIOS */}
      <section id="horarios" className="scroll-mt-24 py-24 sm:py-28">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="mb-8">
            <h2 className="section-title text-2xl sm:text-3xl">Horarios de sala</h2>
          </div>

          <div className="overflow-x-auto border border-line bg-surface">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="border-b border-line bg-surface-2 text-xs font-medium text-muted">
                <tr>
                  <th className="px-4 py-3.5">Franja horaria</th>
                  <th className="px-4 py-3.5">Lunes a viernes</th>
                  <th className="px-4 py-3.5">Sábados</th>
                  <th className="px-4 py-3.5">Domingos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {HORARIOS_BLOQUES.map((h) => (
                  <tr key={h.franja}>
                    <td className="whitespace-nowrap px-4 py-4 font-mono text-xs font-semibold text-bone">
                      {h.franja}
                    </td>
                    <td className="px-4 py-4 font-medium text-bone">{h.lunesViernes}</td>
                    <td className="px-4 py-4 text-muted">{h.sabado}</td>
                    <td className="px-4 py-4 text-muted">{h.domingo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 7. GALERÍA / INSTALACIONES */}
      <section className="bg-surface py-24 sm:py-28">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="mb-8 flex flex-wrap items-baseline justify-between gap-4">
            <h2 className="section-title text-2xl sm:text-3xl">Nuestras instalaciones</h2>
            <p className="text-xs text-muted">Villa Estela Km. 39 · Ancón</p>
          </div>

          <div className="grid gap-6 md:grid-cols-12">
            <figure className="relative aspect-[16/10] overflow-hidden bg-ink md:col-span-8">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/brand/zentra-cover.jpg"
                alt="Zona de racks y peso libre de Zentra Fitness"
                className="h-full w-full object-cover opacity-80 saturate-50"
              />
              <figcaption className="absolute bottom-0 left-0 right-0 bg-ink/90 px-4 py-2.5 text-xs text-muted">
                Sala principal de peso libre y jaulas de potencia
              </figcaption>
            </figure>

            <div className="flex flex-col justify-between gap-6 md:col-span-4">
              <div className="flex-1 bg-ink p-6">
                <h3 className="section-title text-lg">Iluminación cálida y piso de caucho</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  Área diseñada para amortiguar impacto de peso libre, con ventilación cruzada y
                  distribución amplia entre bancos.
                </p>
              </div>
              <div className="bg-ink p-6">
                <h3 className="section-title text-lg">Hidratación en recepción</h3>
                <p className="mt-1.5 text-sm text-muted">
                  Venta directa de agua, rehidratantes y pases diarios en mostrador.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. CONTACTO + UBICACIÓN */}
      <section id="contacto" className="scroll-mt-24 py-24 sm:py-28">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 sm:px-8 lg:grid-cols-12">
          <div className="flex flex-col justify-between lg:col-span-5">
            <div>
              <h2 className="section-title text-2xl sm:text-3xl">Empieza a entrenar</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Déjanos tus datos para coordinar tu inscripción o acércate directamente a nuestra
                recepción en Villa Estela.
              </p>

              <dl className="mt-8 space-y-5 border-t border-line/70 pt-6 text-sm">
                <div>
                  <dt className="text-xs text-muted">Dirección</dt>
                  <dd className="mt-1 flex items-center gap-2 font-medium text-bone">
                    <MapPin size={16} strokeWidth={1.5} className="text-muted" />
                    Villa Estela Km. 39 - Ancón, Lima
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">WhatsApp / Teléfono</dt>
                  <dd className="mt-1 font-medium text-bone tabular-nums">+51 999 000 000</dd>
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

      {/* 9. FOOTER */}
      <footer className="border-t border-line/80 bg-ink py-14">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="flex flex-col items-start justify-between gap-8 pb-10 sm:flex-row sm:items-end">
            <div>
              <Logo className="w-44" />
              <p className="mt-3 text-xs text-muted">
                Villa Estela Km. 39 - Ancón · Lima, Perú
              </p>
            </div>

            <div className="flex flex-wrap gap-6 text-sm">
              <Link href="/consulta" className="text-muted transition-colors hover:text-bone">
                Portal del socio
              </Link>
              <Link href="/login" className="text-muted transition-colors hover:text-bone">
                Acceso del personal
              </Link>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line/60 pt-6 text-xs text-muted">
            <p>© 2026 Zentra Fitness. Todos los derechos reservados.</p>
            <p>Sistema de gestión y recepción en tiempo real</p>
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
