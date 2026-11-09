import { HeartHandshake, UserCheck } from 'lucide-react';
import { CountUp, RevealOnScroll } from '@/components/landing/Motion';

/** Fila de 4 cifras bajo el hero + cinta marquee decorativa. */
export function StatsStrip() {
  const cifra =
    'font-[family-name:var(--font-archivo)] text-5xl font-black italic leading-none text-bone sm:text-6xl';

  return (
    <section aria-label="Zentra en cifras" className="border-y border-line/70 bg-surface">
      <RevealOnScroll className="mx-auto max-w-6xl px-5 sm:px-8">
        <dl className="grid grid-cols-2 lg:grid-cols-4">
          <div className="border-b border-r border-line/60 py-8 pr-4 sm:py-10 lg:border-b-0">
            <dt className="sr-only">Clientes activos</dt>
            <dd>
              <span className={cifra} style={{ fontStretch: '125%' }}>
                <CountUp valor={170} prefijo="+" />
              </span>
              <p className="mt-3 text-sm text-muted">clientes activos</p>
            </dd>
          </div>

          <div className="border-b border-line/60 py-8 pl-5 sm:py-10 lg:border-b-0 lg:border-r lg:px-6">
            <dt className="sr-only">Máquinas de entrenamiento</dt>
            <dd>
              <span className={cifra} style={{ fontStretch: '125%' }}>
                <CountUp valor={20} prefijo="+" />
              </span>
              <p className="mt-3 text-sm text-muted">máquinas de entrenamiento</p>
            </dd>
          </div>

          <div className="border-r border-line/60 py-8 pr-4 sm:py-10 lg:px-6">
            <dt className="sr-only">Entrenamiento personalizado</dt>
            <dd>
              <UserCheck
                aria-hidden="true"
                strokeWidth={1.25}
                className="h-12 w-12 text-bone sm:h-[3.75rem] sm:w-[3.75rem]"
              />
              <p className="mt-3 text-sm text-muted">Entrenamiento personalizado</p>
            </dd>
          </div>

          <div className="py-8 pl-5 sm:py-10 lg:pl-6">
            <dt className="sr-only">Comunidad</dt>
            <dd>
              <HeartHandshake
                aria-hidden="true"
                strokeWidth={1.25}
                className="h-12 w-12 text-brand sm:h-[3.75rem] sm:w-[3.75rem]"
              />
              <p className="mt-3 text-sm text-muted">
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
    <div aria-hidden="true" className="marquee overflow-hidden border-t border-line/60 py-5 sm:py-6">
      <div className="marquee-track">
        {[0, 1].map((copia) => (
          <div key={copia} className="flex shrink-0 items-center">
            {grupo.map((f, i) => (
              <span
                key={`${copia}-${i}`}
                className="text-outline flex items-center whitespace-nowrap font-[family-name:var(--font-archivo)] text-4xl font-black uppercase italic leading-none sm:text-6xl"
                style={{ fontStretch: '125%' }}
              >
                <span className="px-6 sm:px-10">{f}</span>
                <span className="text-2xl sm:text-4xl">·</span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
