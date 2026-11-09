'use client';

import { useState } from 'react';
import { Award, Clock, ShieldCheck, User } from 'lucide-react';

export interface EntrenadorData {
  nombre: string;
  turno: string;
  horario: string;
  rol: string;
  experiencia: string;
  especialidades: string[];
  fotoUrl?: string;
}

const ENTRENADORES: EntrenadorData[] = [
  {
    nombre: 'Lucas',
    turno: 'Lunes a Viernes',
    horario: '6:00 am – 11:00 am y 4:00 pm – 10:30 pm',
    rol: 'Entrenador principal & coach biomecánico',
    experiencia:
      'Especialista en sobrecarga progresiva, ganancia de fuerza e hipertrofia. Te guía paso a paso en la postura correcta de sentadilla, peso muerto y press para levantar seguro y progresar de verdad.',
    especialidades: ['Sobrecarga progresiva', 'Fuerza & Hipertrofia', 'Prevención de lesiones'],
    // fotoUrl: '/brand/entrenadores/lucas.jpg', // listo para añadir foto en el futuro
  },
  {
    nombre: 'Juan',
    turno: 'Sábados',
    horario: '7:00 am – 11:00 am y 4:00 pm – 10:00 pm',
    rol: 'Entrenador de fin de semana & acondicionamiento',
    experiencia:
      'Especialista en acondicionamiento físico, dinámicas funcionales y motivación en sala. Asegura tu ritmo y técnica en los entrenamientos intensos de fin de semana.',
    especialidades: ['Acondicionamiento físico', 'Circuitos funcionales', 'Motivación & Técnica'],
    // fotoUrl: '/brand/entrenadores/juan.jpg', // listo para añadir foto en el futuro
  },
];

export function EntrenadoresSection() {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  return (
    <div className="mt-14 pt-10 border-t border-line/70">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-line bg-surface-2 px-3.5 py-1 text-xs font-semibold text-brand">
          <ShieldCheck size={14} strokeWidth={2} />
          <span>Asesoría en planta</span>
        </div>
        <h3 className="section-title mt-3 text-2xl sm:text-3xl">Entrenadores en sala</h3>
        <p className="mt-2 text-sm text-muted max-w-2xl">
          Acompañamiento profesional, corrección biomecánica y supervisión constante en cada turno.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {ENTRENADORES.map((coach, idx) => {
          const isHovered = hoveredIdx === idx;
          return (
            <div
              key={coach.nombre}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              className={`group relative flex flex-col justify-between rounded-2xl border p-6 sm:p-7 transition-all duration-300 ${
                isHovered
                  ? 'border-brand/80 bg-surface shadow-[0_15px_40px_-15px_rgba(255,194,26,0.15)] ring-1 ring-brand/30 -translate-y-1'
                  : 'border-line/80 bg-surface/70 hover:border-line'
              }`}
            >
              <div>
                <div className="flex items-start gap-4">
                  {/* Espacio preparado para foto futura */}
                  <div className="relative shrink-0">
                    {coach.fotoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={coach.fotoUrl}
                        alt={`Entrenador ${coach.nombre} en Zentra Fitness`}
                        className="h-16 w-16 rounded-xl object-cover border border-line shadow-md"
                      />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-line bg-ink text-bone transition-colors group-hover:border-brand/50 shadow-inner">
                        <User size={28} strokeWidth={1.5} className="text-muted group-hover:text-brand" />
                      </div>
                    )}
                    <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-ok text-ink text-[10px] font-bold">
                      ✓
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 className="text-xl font-bold text-bone tracking-tight">{coach.nombre}</h4>
                      <span className="inline-flex items-center gap-1 rounded-md bg-surface-2 px-2.5 py-1 text-xs font-semibold text-brand">
                        <Clock size={12} strokeWidth={2} />
                        {coach.turno}
                      </span>
                    </div>
                    <p className="mt-1 text-xs font-medium text-bone/80">{coach.rol}</p>
                    <p className="mt-1 text-xs text-muted tabular-nums">{coach.horario}</p>
                  </div>
                </div>

                {/* Descripción / experiencia (visible en mobile y resaltada en desktop en hover) */}
                <div className="mt-5 border-t border-line/60 pt-4">
                  <p className="text-xs text-muted font-medium uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Award size={13} className="text-brand" />
                    <span>Experiencia & Enfoque</span>
                  </p>
                  <p className="text-sm leading-relaxed text-bone/90 transition-colors">
                    {coach.experiencia}
                  </p>
                </div>
              </div>

              {/* Tags de especialidad */}
              <div className="mt-5 flex flex-wrap gap-2 pt-2 border-t border-line/40">
                {coach.especialidades.map((esp) => (
                  <span
                    key={esp}
                    className="rounded-md border border-line bg-ink/70 px-2.5 py-1 text-[11px] font-medium text-muted transition-colors group-hover:text-bone group-hover:border-muted/50"
                  >
                    {esp}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
