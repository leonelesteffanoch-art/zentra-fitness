'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { ArrowLeft, Calendar, Flame, Loader2, Search } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { soles } from '@/lib/formato';
import type { ConsultaSocioResultado, Semaforo } from '@/types';

const BADGE_SEMAFORO: Record<Semaforo, { badge: string; acento: string; estado: string }> = {
  VERDE: {
    badge: 'bg-ok/15 text-ok',
    acento: 'border-l-4 border-l-ok',
    estado: 'Membresía activa',
  },
  AMBAR: {
    badge: 'bg-warn/15 text-warn',
    acento: 'border-l-4 border-l-warn',
    estado: 'Por vencer / Atención',
  },
  ROJO: {
    badge: 'bg-bad/15 text-bad',
    acento: 'border-l-4 border-l-bad',
    estado: 'Membresía vencida',
  },
};

function nivelConstancia(asistencias: number): { rango: string; mensaje: string } {
  if (asistencias >= 16) {
    return {
      rango: 'Nivel 04 · Disciplina de hierro',
      mensaje: 'Llevas ritmo de atleta este mes. Mantén las cargas y cuida el descanso.',
    };
  }
  if (asistencias >= 8) {
    return {
      rango: 'Nivel 03 · Ritmo sólido',
      mensaje: 'Constancia firme este mes. Estás en la zona donde se ven los resultados reales.',
    };
  }
  if (asistencias >= 3) {
    return {
      rango: 'Nivel 02 · En marcha',
      mensaje: 'Buen arranque de mes. Suma una sesión más esta semana para consolidar el hábito.',
    };
  }
  return {
    rango: 'Nivel 01 · Arranque de mes',
    mensaje: 'La barra te espera en Zentra. Cada sesión suma en tu registro mensual.',
  };
}

export default function ConsultaPage() {
  const [dni, setDni] = useState('');
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState<ConsultaSocioResultado | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function consultar(e: FormEvent) {
    e.preventDefault();
    const limpio = dni.trim();
    if (!/^\d{7,12}$/.test(limpio)) {
      setError('Ingresa un DNI válido (solo números)');
      return;
    }
    setError(null);
    setResultado(null);
    setCargando(true);
    try {
      const res = await fetch('/api/consulta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dni: limpio }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'No se pudo consultar el DNI');
      } else {
        setResultado(data as ConsultaSocioResultado);
      }
    } catch {
      setError('Error de conexión. Intenta nuevamente.');
    } finally {
      setCargando(false);
    }
  }

  const gamificacion = resultado ? nivelConstancia(resultado.asistencias_mes) : null;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col justify-between px-5 py-10 sm:px-8">
      <div>
        <header className="flex items-center justify-between border-b border-line/80 pb-5">
          <Link href="/" aria-label="Volver al inicio">
            <Logo className="w-32" />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-bone"
          >
            <ArrowLeft size={15} strokeWidth={1.5} />
            Volver a la web
          </Link>
        </header>

        <section className="mt-10">
          <h1 className="font-display text-4xl sm:text-5xl">
            Consulta tu <span className="text-brand">Membresía</span>
          </h1>
          <p className="mt-2 text-sm text-muted">
            Ingresa tu número de DNI para ver tus días disponibles y tus asistencias del mes.
          </p>

          <form onSubmit={consultar} className="mt-6 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <label htmlFor="dni-consulta" className="sr-only">
                Número de DNI
              </label>
              <input
                id="dni-consulta"
                type="text"
                inputMode="numeric"
                maxLength={12}
                required
                autoFocus
                placeholder="Ingresa tu DNI (ej. 74859612)"
                value={dni}
                onChange={(e) => setDni(e.target.value.replace(/\D/g, ''))}
                className="field !min-h-12 font-mono text-base"
              />
            </div>
            <button
              type="submit"
              disabled={cargando || dni.length < 7}
              className="btn btn-primary !min-h-12 !px-7"
            >
              {cargando ? (
                <Loader2 size={17} strokeWidth={1.5} className="animate-spin" />
              ) : (
                <Search size={17} strokeWidth={1.5} />
              )}
              Consultar
            </button>
          </form>

          {error && (
            <p
              role="alert"
              className="mt-4 border-l-2 border-bad bg-bad/10 px-4 py-3 text-sm text-bad"
            >
              {error}
            </p>
          )}
        </section>

        {/* Resultado */}
        {resultado && gamificacion && (
          <section aria-live="polite" className="mt-8 space-y-4">
            <div
              className={`bg-surface p-6 sm:p-8 ${
                BADGE_SEMAFORO[resultado.semaforo].acento
              }`}
            >
              <span
                className={`inline-block rounded-xs px-2.5 py-1 text-xs font-semibold ${
                  BADGE_SEMAFORO[resultado.semaforo].badge
                }`}
              >
                {BADGE_SEMAFORO[resultado.semaforo].estado}
              </span>
              <p className="mt-3 text-sm text-muted">Hola, {resultado.nombres}</p>
              <p className="mt-1 text-3xl font-bold tracking-tight text-bone tabular-nums sm:text-4xl">
                {resultado.dias_restantes === null
                  ? 'Sin plan activo'
                  : resultado.dias_restantes < 0
                  ? `Venció hace ${Math.abs(resultado.dias_restantes)} días`
                  : resultado.dias_restantes === 0
                  ? 'Vence hoy'
                  : `${resultado.dias_restantes} días restantes`}
              </p>
              {resultado.plan && (
                <p className="mt-2 text-sm text-muted">
                  Plan {resultado.plan} · Vence el{' '}
                  <span className="font-mono text-bone">{resultado.fecha_fin}</span>
                </p>
              )}
              {resultado.saldo_pendiente > 0 && (
                <p className="mt-1.5 text-sm font-semibold text-warn tabular-nums">
                  Saldo pendiente en recepción: {soles(resultado.saldo_pendiente)}
                </p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="bg-surface p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted">Asistencias este mes</span>
                  <Calendar size={16} strokeWidth={1.5} className="text-muted" />
                </div>
                <p className="mt-2 text-4xl font-bold text-bone tabular-nums">
                  {resultado.asistencias_mes}
                </p>
                <p className="mt-1 text-xs text-muted">días entrenados en el mes actual</p>
              </div>

              <div className="bg-surface p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted">{gamificacion.rango}</span>
                  <Flame size={16} strokeWidth={1.5} className="text-muted" />
                </div>
                <p className="mt-2 text-sm leading-relaxed text-bone">
                  {gamificacion.mensaje}
                </p>
              </div>
            </div>
          </section>
        )}
      </div>

      <footer className="mt-12 border-t border-line/70 pt-4 text-xs text-muted">
        Zentra Fitness · Villa Estela Km. 39 - Ancón
      </footer>
    </main>
  );
}
