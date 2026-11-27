'use client';

import { useEffect, useState } from 'react';
import { CalendarDays, Clock, Users } from 'lucide-react';
import { DonutChart, VerticalBarChart } from '@/components/AdminCharts';
import { supabase } from '@/lib/supabase';
import { formatearFechaDMY, hoyLima, soles, sumarDias } from '@/lib/formato';

interface FranjaPico {
  etiqueta: string;
  rango: string;
  cantidad: number;
}

interface AsistenciaDiaCalendario {
  fecha: string;
  etiqueta: string;
  diaCorto: string;
  cantidad: number;
}

interface AsistenciaDiaSemana {
  dia: string;
  cantidad: number;
  promedio: number;
}

interface StatsData {
  totalSocios: number;
  verdes: number;
  ambar: number;
  rojos: number;
  nuevosMes: number;
  conDeuda: number;
  deudaTotal: number;
  asistencias14d: AsistenciaDiaCalendario[];
  asistenciasSemana: AsistenciaDiaSemana[];
  total30d: number;
  franjasPico: FranjaPico[];
}

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'] as const;

function diaSemanaFecha(fechaISO: string): number {
  const [y, m, d] = fechaISO.split('-').map(Number);
  if (!y || !m || !d) return 0;
  const utcDay = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return utcDay === 0 ? 6 : utcDay - 1;
}

export function GymStatsSection({ gymId }: { gymId: string }) {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [vistaAsis, setVistaAsis] = useState<'14d' | 'semana'>('14d');

  useEffect(() => {
    let cancelado = false;
    const hoy = hoyLima();
    const inicioMes = `${hoy.slice(0, 7)}-01`;
    const hace29 = sumarDias(hoy, -29); // 30 días contando hoy

    Promise.all([
      supabase
        .from('v_socio_estado')
        .select('semaforo, saldo_pendiente')
        .eq('gym_id', gymId),
      supabase
        .from('socios')
        .select('id', { count: 'exact', head: true })
        .eq('gym_id', gymId)
        .eq('activo', true)
        .gte('created_at', `${inicioMes}T00:00:00`),
      supabase
        .from('asistencias')
        .select('fecha, hora')
        .eq('gym_id', gymId)
        .gte('fecha', hace29)
        .limit(2000),
    ])
      .then(([estRes, nuevosRes, asisRes]) => {
        if (cancelado) return;

        const estados = (estRes.data ?? []) as Array<{
          semaforo: 'VERDE' | 'AMBAR' | 'ROJO';
          saldo_pendiente: number;
        }>;
        const totalSocios = estados.length;
        const verdes = estados.filter((e) => e.semaforo === 'VERDE').length;
        const ambar = estados.filter((e) => e.semaforo === 'AMBAR').length;
        const rojos = estados.filter((e) => e.semaforo === 'ROJO').length;
        const nuevosMes = nuevosRes.count ?? 0;

        let conDeuda = 0;
        let deudaTotal = 0;
        for (const e of estados) {
          const saldo = Number(e.saldo_pendiente ?? 0);
          if (saldo > 0) {
            conDeuda += 1;
            deudaTotal += saldo;
          }
        }

        const conteoFranjas = [0, 0, 0, 0];
        const conteoDias = [0, 0, 0, 0, 0, 0, 0];
        const mapaFecha = new Map<string, number>();

        for (const a of asisRes.data ?? []) {
          if (a.fecha) {
            const f = String(a.fecha).slice(0, 10);
            mapaFecha.set(f, (mapaFecha.get(f) ?? 0) + 1);
            const idx = diaSemanaFecha(f);
            conteoDias[idx] += 1;
          }
          try {
            const hStr = new Date(String(a.hora)).toLocaleTimeString('es-PE', {
              timeZone: 'America/Lima',
              hour: '2-digit',
              hour12: false,
            });
            const h = Number(hStr);
            if (h >= 6 && h < 11) conteoFranjas[0] += 1;
            else if (h >= 11 && h < 16) conteoFranjas[1] += 1;
            else if (h >= 16 && h < 19) conteoFranjas[2] += 1;
            else conteoFranjas[3] += 1;
          } catch {
            // Ignorar fecha malformada
          }
        }

        // Últimos 14 días calendario continuos hasta hoy (incluyendo días con 0)
        const asistencias14d: AsistenciaDiaCalendario[] = [];
        for (let offset = -13; offset <= 0; offset++) {
          const fecha = sumarDias(hoy, offset);
          const idxSem = diaSemanaFecha(fecha);
          asistencias14d.push({
            fecha,
            etiqueta: `${fecha.slice(8, 10)}/${fecha.slice(5, 7)}`,
            diaCorto: DIAS_SEMANA[idxSem],
            cantidad: mapaFecha.get(fecha) ?? 0,
          });
        }

        // Ocurrencias exactas de cada día de la semana dentro de la ventana de 30 días
        const ocurrenciasDia = [0, 0, 0, 0, 0, 0, 0];
        for (let offset = -29; offset <= 0; offset++) {
          ocurrenciasDia[diaSemanaFecha(sumarDias(hoy, offset))] += 1;
        }

        const asistenciasSemana: AsistenciaDiaSemana[] = DIAS_SEMANA.map((dia, i) => ({
          dia,
          cantidad: conteoDias[i],
          promedio: ocurrenciasDia[i] > 0 ? Math.round((conteoDias[i] / ocurrenciasDia[i]) * 10) / 10 : 0,
        }));

        const franjasPico: FranjaPico[] = [
          { etiqueta: 'Mañana', rango: '6–11h', cantidad: conteoFranjas[0] },
          { etiqueta: 'Mediodía', rango: '11–16h', cantidad: conteoFranjas[1] },
          { etiqueta: 'Tarde', rango: '16–19h', cantidad: conteoFranjas[2] },
          { etiqueta: 'Noche', rango: '19–22h', cantidad: conteoFranjas[3] },
        ];

        setStats({
          totalSocios,
          verdes,
          ambar,
          rojos,
          nuevosMes,
          conDeuda,
          deudaTotal: Math.round(deudaTotal * 100) / 100,
          asistencias14d,
          asistenciasSemana,
          total30d: (asisRes.data ?? []).length,
          franjasPico,
        });
      })
      .catch(() => {});

    return () => {
      cancelado = true;
    };
  }, [gymId]);

  if (!stats) return null;

  const saludDonut = [
    { label: 'Al día (Verde)', value: stats.verdes, color: '#22c55e' },
    { label: 'Atención / Saldo (Ámbar)', value: stats.ambar, color: '#ff8a1f' },
    { label: 'Vencidos / Sin plan (Rojo)', value: stats.rojos, color: '#ef4444' },
  ];

  const total14d = stats.asistencias14d.reduce((s, d) => s + d.cantidad, 0);
  const promedio14d = (total14d / 14).toFixed(1);
  const max14d = Math.max(0, ...stats.asistencias14d.map((d) => d.cantidad));
  const pico14d =
    max14d > 0 ? stats.asistencias14d.find((d) => d.cantidad === max14d) ?? null : null;

  const maxSemana = Math.max(0, ...stats.asistenciasSemana.map((d) => d.cantidad));
  const picoSemana =
    maxSemana > 0 ? stats.asistenciasSemana.find((d) => d.cantidad === maxSemana) ?? null : null;

  const maxFranja = Math.max(1, ...stats.franjasPico.map((f) => f.cantidad));
  const totalFranjas = Math.max(
    1,
    stats.franjasPico.reduce((s, f) => s + f.cantidad, 0)
  );

  return (
    <section aria-label="Estadísticas operativas" className="space-y-4">
      <h2 className="section-title text-lg">Socios y asistencias</h2>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Columna izquierda: Salud del padrón */}
        <article className="panel-card flex flex-col justify-between space-y-4 p-5 lg:col-span-5">
          <div>
            <div className="flex items-center justify-between border-b border-line/70 pb-3">
              <h3 className="section-title flex items-center gap-2 text-base">
                <Users size={16} strokeWidth={1.75} className="text-brand" />
                Salud del padrón
              </h3>
              <span className="font-mono text-xs font-semibold text-ok">
                {stats.totalSocios > 0
                  ? `${Math.round(((stats.verdes + stats.ambar) / stats.totalSocios) * 100)}% vigentes`
                  : '0%'}
              </span>
            </div>

            <div className="mt-4">
              <DonutChart
                items={saludDonut}
                centerLabel="Socios"
                centerValue={String(stats.totalSocios)}
                formatValue={(v) => `${v} socios`}
                emptyText="Aún no hay socios registrados."
              />
            </div>
          </div>

          <dl className="grid grid-cols-3 gap-2.5 border-t border-line/70 pt-3 text-center tabular-nums">
            <div className="rounded-md border border-line/60 bg-ink/50 px-2.5 py-2">
              <dt className="text-[10px] uppercase tracking-wider text-muted">Nuevos (mes)</dt>
              <dd className="mt-0.5 font-mono text-base font-bold text-brand">
                +{stats.nuevosMes}
              </dd>
            </div>
            <div className="rounded-md border border-line/60 bg-ink/50 px-2.5 py-2">
              <dt className="text-[10px] uppercase tracking-wider text-muted">Con saldo</dt>
              <dd className="mt-0.5 font-mono text-base font-bold text-warn">{stats.conDeuda}</dd>
            </div>
            <div className="rounded-md border border-line/60 bg-ink/50 px-2.5 py-2">
              <dt className="text-[10px] uppercase tracking-wider text-muted">Por cobrar</dt>
              <dd className="mt-0.5 font-mono text-sm font-bold text-bone sm:text-base">
                {soles(stats.deudaTotal)}
              </dd>
            </div>
          </dl>
        </article>

        {/* Columna derecha: Asistencias por Día (14d + día semana + horas pico) */}
        <article className="panel-card flex flex-col justify-between space-y-4 p-5 lg:col-span-7">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line/70 pb-3">
              <h3 className="section-title flex items-center gap-2 text-base">
                <CalendarDays size={16} strokeWidth={1.75} className="text-brand" />
                Asistencias por día
              </h3>

              <div className="flex items-center gap-1 rounded-md border border-line bg-surface p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setVistaAsis('14d')}
                  aria-pressed={vistaAsis === '14d'}
                  className={`rounded px-2.5 py-1 font-medium transition-colors ${
                    vistaAsis === '14d'
                      ? 'bg-brand text-ink font-semibold'
                      : 'text-muted hover:text-bone'
                  }`}
                >
                  Últimos 14 días
                </button>
                <button
                  type="button"
                  onClick={() => setVistaAsis('semana')}
                  aria-pressed={vistaAsis === 'semana'}
                  className={`rounded px-2.5 py-1 font-medium transition-colors ${
                    vistaAsis === 'semana'
                      ? 'bg-brand text-ink font-semibold'
                      : 'text-muted hover:text-bone'
                  }`}
                >
                  Por día de semana
                </button>
              </div>
            </div>

            {/* Resumen rápido de asistencias */}
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs tabular-nums">
              {vistaAsis === '14d' ? (
                <>
                  <span className="rounded bg-surface-2 px-2.5 py-1 text-muted">
                    Total 14d: <strong className="font-mono text-bone">{total14d}</strong>
                  </span>
                  <span className="rounded bg-surface-2 px-2.5 py-1 text-muted">
                    Promedio: <strong className="font-mono text-bone">{promedio14d}/día</strong>
                  </span>
                  {pico14d && (
                    <span className="rounded bg-brand/15 px-2.5 py-1 font-medium text-brand">
                      Pico: {pico14d.diaCorto} {pico14d.etiqueta} ({pico14d.cantidad})
                    </span>
                  )}
                </>
              ) : (
                <>
                  <span className="rounded bg-surface-2 px-2.5 py-1 text-muted">
                    Últimos 30 días: <strong className="font-mono text-bone">{stats.total30d}</strong>
                  </span>
                  {picoSemana && (
                    <span className="rounded bg-brand/15 px-2.5 py-1 font-medium text-brand">
                      Día más concurrido: {picoSemana.dia} ({picoSemana.cantidad} total ·{' '}
                      {picoSemana.promedio}/día)
                    </span>
                  )}
                </>
              )}
            </div>

            <div className="mt-2">
              {vistaAsis === '14d' ? (
                <VerticalBarChart
                  items={stats.asistencias14d.map((d) => ({
                    key: d.fecha,
                    label: d.etiqueta,
                    value: d.cantidad,
                    highlight: d.cantidad > 0 && d.cantidad === max14d,
                    tooltip: `${d.diaCorto} ${formatearFechaDMY(d.fecha)}: ${d.cantidad} ${
                      d.cantidad === 1 ? 'asistencia' : 'asistencias'
                    }`,
                  }))}
                  primaryColorClass="bg-gradient-to-t from-sky-500/60 to-sky-400"
                  heightClass="h-40"
                />
              ) : (
                <VerticalBarChart
                  items={stats.asistenciasSemana.map((d) => ({
                    key: d.dia,
                    label: d.dia,
                    value: d.cantidad,
                    highlight: d.cantidad > 0 && d.cantidad === maxSemana,
                    tooltip: `${d.dia}: ${d.cantidad} asistencias (promedio ${d.promedio} por ${d.dia})`,
                  }))}
                  primaryColorClass="bg-gradient-to-t from-sky-500/60 to-sky-400"
                  heightClass="h-40"
                />
              )}
            </div>
          </div>

          {/* Franja compacta de Horas pico (30 días) */}
          <div className="space-y-2.5 border-t border-line/70 pt-3.5">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted">
              <Clock size={13} className="text-brand" />
              Afluencia por horario (30 días)
            </div>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {stats.franjasPico.map((f) => {
                const esPico = f.cantidad > 0 && f.cantidad === maxFranja;
                const pctTotal = Math.round((f.cantidad / totalFranjas) * 100);
                const pctBarra = f.cantidad > 0 ? Math.max(10, Math.round((f.cantidad / maxFranja) * 100)) : 0;
                return (
                  <div
                    key={f.etiqueta}
                    className={`rounded-md border px-3 py-2 ${
                      esPico ? 'border-brand/50 bg-brand/[0.08]' : 'border-line/60 bg-ink/50'
                    }`}
                  >
                    <div className="flex items-baseline justify-between gap-1">
                      <span className="text-xs font-semibold text-bone">{f.etiqueta}</span>
                      <span className="font-mono text-[10px] text-muted">{f.rango}</span>
                    </div>
                    <div className="mt-1 flex items-baseline justify-between font-mono tabular-nums">
                      <span className={`text-sm font-bold ${esPico ? 'text-brand' : 'text-bone'}`}>
                        {f.cantidad}
                      </span>
                      <span className="text-[10px] text-muted">{pctTotal}%</span>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                      <div
                        className={`bar-fill h-full rounded-full ${
                          esPico ? 'bg-brand' : 'bg-sky-400/80'
                        }`}
                        style={{ width: `${pctBarra}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
