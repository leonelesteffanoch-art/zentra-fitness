'use client';

import { Award, Clock, Dumbbell, ShieldCheck, Sparkles, User } from 'lucide-react';

export interface EntrenadorData {
  nombre: string;
  turno: string;
  horario: string;
  bloquesHorario: { turno: string; rango: string }[];
  rol: string;
  experiencia: string;
  especialidades: string[];
  fotoUrl?: string;
  fondoDegradado: string;
}

const ENTRENADORES: EntrenadorData[] = [
  {
    nombre: 'Lucas',
    turno: 'Lunes a Viernes',
    horario: '6:00 am – 11:00 am y 4:00 pm – 10:30 pm',
    bloquesHorario: [
      { turno: 'Mañana', rango: '6:00 am – 11:00 am' },
      { turno: 'Tarde / Noche', rango: '4:00 pm – 10:30 pm' },
    ],
    rol: 'Entrenador principal & coach biomecánico',
    experiencia:
      'Especialista en sobrecarga progresiva, aumento de fuerza e hipertrofia. Te acompaña en la postura exacta de sentadillas, peso muerto y empuje en máquinas para que entrenes pesado y con total seguridad.',
    especialidades: ['Sobrecarga progresiva', 'Fuerza e hipertrofia', 'Prevención de lesiones'],
    // fotoUrl: '/brand/entrenadores/lucas.jpg', // listo para añadir foto real en el futuro
    fondoDegradado: 'from-amber-950/40 via-zinc-900 to-ink',
  },
  {
    nombre: 'Juan',
    turno: 'Sábados',
    horario: '7:00 am – 11:00 am y 4:00 pm – 10:00 pm',
    bloquesHorario: [
      { turno: 'Mañana', rango: '7:00 am – 11:00 am' },
      { turno: 'Tarde / Noche', rango: '4:00 pm – 10:00 pm' },
    ],
    rol: 'Entrenador de fin de semana & acondicionamiento',
    experiencia:
      'Especialista en acondicionamiento físico, dinámicas funcionales y motivación deportiva. Supervisa tu ritmo y técnica en los entrenamientos intensos de fin de semana.',
    especialidades: ['Acondicionamiento físico', 'Circuitos funcionales', 'Motivación & técnica'],
    // fotoUrl: '/brand/entrenadores/juan.jpg', // listo para añadir foto real en el futuro
    fondoDegradado: 'from-zinc-800/50 via-zinc-900 to-ink',
  },
];

export function EntrenadoresSection() {
  return (
    <div className="mt-16 pt-12 border-t border-line/70">
      {/* Subtítulo y encabezado propio */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-line bg-surface-2 px-3.5 py-1 text-xs font-semibold text-brand">
            <ShieldCheck size={14} strokeWidth={2} />
            <span>Asesoría personalizada en planta</span>
          </div>
          <h3 className="section-title mt-3 text-2xl sm:text-3xl">Entrenadores en sala</h3>
          <p className="mt-2 text-sm text-muted max-w-xl">
            Acompañamiento profesional, corrección biomecánica y supervisión constante en cada turno.
          </p>
        </div>
        <p className="text-xs text-muted/80 hidden md:block">
          Pasa el cursor sobre la foto para ver experiencia
        </p>
      </div>

      {/* Grid de entrenadores con diseño adaptado a desktop (4:3 hover) y móvil (legible y fluido) */}
      <div className="grid gap-6 md:grid-cols-2">
        {ENTRENADORES.map((coach) => (
          <article
            key={coach.nombre}
            className="group overflow-hidden rounded-3xl border border-line/80 bg-surface shadow-2xl transition-all duration-300 hover:border-brand/70 hover:shadow-[0_20px_50px_-20px_rgba(255,194,26,0.2)]"
          >
            {/* ========================================================
                VISTA DESKTOP (md:block hidden): Formato 4:3 con hover interactivo
               ======================================================== */}
            <div className="relative hidden md:block aspect-[4/3] w-full overflow-hidden bg-ink cursor-pointer">
              {coach.fotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={coach.fotoUrl}
                  alt={`Entrenador ${coach.nombre} en Zentra Fitness`}
                  className="h-full w-full object-cover saturate-75 transition-transform duration-700 group-hover:scale-105"
                />
              ) : (
                <div
                  className={`relative h-full w-full bg-gradient-to-b ${coach.fondoDegradado} flex flex-col items-center justify-center p-6 text-center select-none overflow-hidden`}
                >
                  <div className="bg-gridlines absolute inset-0 opacity-40" />
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,_rgba(255,194,26,0.12),_transparent_60%)]" />

                  <div className="relative z-10 flex h-28 w-28 items-center justify-center rounded-2xl border border-line/90 bg-surface-2/90 shadow-2xl backdrop-blur-md group-hover:border-brand/60 transition-colors">
                    <User
                      size={48}
                      strokeWidth={1.5}
                      className="text-bone/70 group-hover:text-brand transition-colors"
                    />
                    <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-brand text-brand-ink text-xs font-black shadow-md">
                      ✓
                    </span>
                  </div>

                  <div className="relative z-10 mt-3 flex items-center gap-1.5 text-xs font-medium text-muted/90">
                    <Dumbbell size={13} className="text-brand" />
                    <span>Coach de planta</span>
                  </div>
                </div>
              )}

              {/* Sombreado abajo oscuro */}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink via-ink/65 to-transparent transition-opacity duration-300" />

              {/* Datos visibles en reposo */}
              <div className="absolute bottom-0 inset-x-0 p-7 flex items-end justify-between gap-4 z-10 transition-transform duration-300 group-hover:-translate-y-2">
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-2/95 border border-line/80 px-3 py-1 text-xs font-semibold text-brand backdrop-blur-md shadow-md mb-2">
                    <Clock size={12} strokeWidth={2} />
                    {coach.turno}
                  </span>
                  <h4 className="font-[family-name:var(--font-archivo)] text-4xl font-black italic tracking-wide text-white drop-shadow-lg">
                    {coach.nombre}
                  </h4>
                  <p className="text-sm font-medium text-bone/90 mt-0.5 drop-shadow">
                    {coach.rol}
                  </p>
                </div>

                <span className="rounded-full bg-ink/75 border border-line px-3 py-1 text-xs font-semibold text-muted/90 backdrop-blur-xs shrink-0 group-hover:hidden inline-block">
                  + Info
                </span>
              </div>

              {/* Capa de datos completos al pasar el mouse por encima */}
              <div className="absolute inset-0 bg-ink/95 backdrop-blur-md p-7 flex flex-col justify-end z-20 opacity-0 translate-y-4 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all duration-300">
                <div className="space-y-4">
                  <div className="flex items-start justify-between border-b border-line/80 pb-3 gap-3">
                    <div>
                      <span className="text-xs font-semibold text-brand uppercase tracking-wider">
                        {coach.turno}
                      </span>
                      <h4 className="text-2xl font-black italic text-white tracking-wide">
                        {coach.nombre}
                      </h4>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      {coach.bloquesHorario.map((b) => (
                        <span
                          key={b.rango}
                          className="inline-flex items-center gap-1.5 rounded-full bg-surface-2/95 border border-line px-2.5 py-0.5 text-xs font-semibold text-bone tabular-nums"
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-ok" />
                          <span>{b.rango}</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted flex items-center gap-1.5 mb-1.5">
                      <Award size={14} className="text-brand" />
                      <span>Experiencia y técnica</span>
                    </p>
                    <p className="text-sm leading-relaxed text-bone/95 font-normal">
                      {coach.experiencia}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1 border-t border-line/50">
                    {coach.especialidades.map((esp) => (
                      <span
                        key={esp}
                        className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-bone"
                      >
                        <Sparkles size={11} className="text-brand" />
                        {esp}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ========================================================
                VISTA TELÉFONO / MOBILE (block md:hidden): Optimizado, sin recortes
               ======================================================== */}
            <div className="block md:hidden">
              {/* Cabecera visual con foto / avatar */}
              <div className="relative h-48 w-full overflow-hidden bg-ink">
                {coach.fotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={coach.fotoUrl}
                    alt={`Entrenador ${coach.nombre} en Zentra Fitness`}
                    className="h-full w-full object-cover saturate-75"
                  />
                ) : (
                  <div
                    className={`relative h-full w-full bg-gradient-to-b ${coach.fondoDegradado} flex flex-col items-center justify-center text-center select-none overflow-hidden`}
                  >
                    <div className="bg-gridlines absolute inset-0 opacity-40" />
                    <div className="relative z-10 flex h-20 w-20 items-center justify-center rounded-2xl border border-line/90 bg-surface-2/90 shadow-xl backdrop-blur-md">
                      <User size={36} strokeWidth={1.5} className="text-bone/70" />
                      <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand text-brand-ink text-[10px] font-black shadow-md">
                        ✓
                      </span>
                    </div>
                  </div>
                )}

                {/* Sombreado inferior oscuro */}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-surface via-surface/60 to-transparent" />

                {/* Nombre y turno superpuestos en la parte inferior */}
                <div className="absolute bottom-3 inset-x-4 z-10 flex items-end justify-between">
                  <div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-surface-2/95 border border-line/80 px-2.5 py-0.5 text-[11px] font-semibold text-brand backdrop-blur-md shadow-sm mb-1">
                      <Clock size={11} strokeWidth={2} />
                      {coach.turno}
                    </span>
                    <h4 className="font-[family-name:var(--font-archivo)] text-2xl font-black italic tracking-wide text-white drop-shadow">
                      {coach.nombre}
                    </h4>
                  </div>
                  <p className="text-[11px] font-medium text-bone/80 text-right max-w-[150px] leading-tight">
                    {coach.rol}
                  </p>
                </div>
              </div>

              {/* Detalle completo sin recortes para móvil */}
              <div className="p-4 sm:p-5 space-y-3.5 border-t border-line/70 bg-surface">
                {/* Bloques de horario en móvil */}
                <div className="rounded-xl border border-line/70 bg-surface-2/70 p-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-brand mb-2">
                    <Clock size={13} strokeWidth={2} />
                    <span>Horarios de atención</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {coach.bloquesHorario.map((b) => (
                      <div
                        key={b.rango}
                        className="flex items-center justify-between rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs text-bone"
                      >
                        <span className="text-muted font-medium">{b.turno}</span>
                        <span className="font-semibold tabular-nums text-bone flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-ok" />
                          {b.rango}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Experiencia */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted flex items-center gap-1.5 mb-1">
                    <Award size={13} className="text-brand" />
                    <span>Experiencia y técnica</span>
                  </p>
                  <p className="text-xs sm:text-sm leading-relaxed text-bone/90">
                    {coach.experiencia}
                  </p>
                </div>

                {/* Especialidades */}
                <div className="flex flex-wrap gap-1.5 pt-1 border-t border-line/50">
                  {coach.especialidades.map((esp) => (
                    <span
                      key={esp}
                      className="inline-flex items-center gap-1 rounded-full border border-line bg-surface-2 px-2.5 py-0.5 text-[11px] font-medium text-bone"
                    >
                      <Sparkles size={10} className="text-brand" />
                      {esp}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
