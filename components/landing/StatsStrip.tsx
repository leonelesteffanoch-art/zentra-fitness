import { HeartHandshake, UserCheck } from 'lucide-react';
import { CountUp, RevealOnScroll } from '@/components/landing/Motion';

/** Fila de 4 cifras bajo el hero + cinta marquee decorativa. */
export function StatsStrip() {
  const cifra =
    'font-[family-name:var(--font-archivo)] text-5xl font-black italic leading-none text-bone sm:text-6xl';

  return (
    <section aria-label="Zentra en cifras" className="relative overflow-hidden border-y border-line/70 bg-surface">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(255,194,26,0.06),_transparent_65%)]"
      />
      <RevealOnScroll className="relative mx-auto max-w-6xl px-5 sm:px-8">
        <dl className="grid grid-cols-2 lg:grid-cols-4">
          <div className="group border-b border-r border-line/60 py-8 pr-4 sm:py-10 lg:border-b-0">
            <dt className="sr-only">Clientes activos</dt>
            <dd>
              <div className="mb-3 h-0.5 w-8 rounded-full bg-brand transition-all duration-300 group-hover:w-14" />
              <span className={cifra} style={{ fontStretch: '120%' }}>
                <span className="text-brand">+</span>
                <CountUp valor={170} />
              </span>
              <p className="mt-3 text-sm text-bone/80">clientes activos</p>
            </dd>
          </div>

          <div className="group border-b border-line/60 py-8 pl-5 sm:py-10 lg:border-b-0 lg:border-r lg:px-6">
            <dt className="sr-only">Máquinas de entrenamiento</dt>
            <dd>
              <div className="mb-3 h-0.5 w-8 rounded-full bg-ok transition-all duration-300 group-hover:w-14" />
              <span className={cifra} style={{ fontStretch: '120%' }}>
                <span className="text-brand">+</span>
                <CountUp valor={20} />
              </span>
              <p className="mt-3 text-sm text-bone/80">máquinas de entrenamiento</p>
            </dd>
          </div>

          <div className="group border-r border-line/60 py-8 pr-4 sm:py-10 lg:px-6">
            <dt className="sr-only">Entrenamiento personalizado</dt>
            <dd>
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-brand/30 bg-brand/10 text-brand shadow-inner sm:h-14 sm:w-14">
                <UserCheck aria-hidden="true" strokeWidth={1.6} className="h-6 w-6 sm:h-7 sm:w-7" />
              </div>
              <p className="mt-3.5 text-sm font-medium text-bone/85">Entrenamiento personalizado</p>
            </dd>
          </div>

          <div className="group py-8 pl-5 sm:py-10 lg:pl-6">
            <dt className="sr-only">Comunidad</dt>
            <dd>
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-ok/30 bg-ok/10 text-ok shadow-inner sm:h-14 sm:w-14">
                <HeartHandshake aria-hidden="true" strokeWidth={1.6} className="h-6 w-6 sm:h-7 sm:w-7" />
              </div>
              <p className="mt-3.5 text-sm font-medium text-bone/85">
                Comunidad activa por un mejor estilo de vida
              </p>
            </dd>
          </div>
        </dl>
      </RevealOnScroll>

      <Marquee />
    </section>
  );
}

const FRASES = ['Peso libre', 'Cardio', 'Fuerza funcional', 'Core'];

function Marquee() {
  // Se repite el grupo para que el desplazamiento -50% sea continuo
  const grupo = [...FRASES, ...FRASES, ...FRASES];
  return (
    <div aria-hidden="true" className="marquee overflow-hidden border-t border-line/60 bg-ink/40 py-5 sm:py-6">
      <div className="marquee-track">
        {[0, 1].map((copia) => (
          <div key={copia} className="flex shrink-0 items-center">
            {grupo.map((f, i) => (
              <span
                key={`${copia}-${i}`}
                className="flex items-center whitespace-nowrap font-[family-name:var(--font-archivo)] text-4xl font-black uppercase italic leading-none sm:text-6xl"
                style={{ fontStretch: '120%' }}
              >
                <span className={i % 2 === 0 ? 'text-outline px-6 sm:px-10' : 'px-6 sm:px-10 text-bone/15'}>
                  {f}
                </span>
                <span className="text-2xl text-brand/70 sm:text-4xl">·</span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
