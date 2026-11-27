'use client';

import { useEffect, useState } from 'react';
import { CalendarDays, Clock, Dumbbell, Package, Users } from 'lucide-react';
import { DonutChart, PALETA_GRAFICOS, VerticalBarChart } from '@/components/AdminCharts';
import { supabase } from '@/lib/supabase';
import { hoyLima, soles, sumarDias } from '@/lib/formato';

interface ProductoRanking {
  nombre: string;
  unidades: number;
  ingresos: number;
}

interface FranjaPico {
  etiqueta: string;
  rango: string;
  cantidad: number;
}

interface PlanDistribucion {
  nombre: string;
  cantidad: number;
}

interface AsistenciaDia {
  dia: string;
  cantidad: number;
}

interface StatsData {
  totalSocios: number;
  verdes: number;
  ambar: number;
  rojos: number;
  nuevosMes: number;
  conDeuda: number;
  deudaTotal: number;
  distribucionPlanes: PlanDistribucion[];
  asistenciasSemana: AsistenciaDia[];
  topProductos: ProductoRanking[];
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

  useEffect(() => {
    let cancelado = false;
    const hoy = hoyLima();
    const inicioMes = `${hoy.slice(0, 7)}-01`;
    const hace30 = sumarDias(hoy, -30);

    Promise.all([
      supabase
        .from('v_socio_estado')
        .select('semaforo, plan, saldo_pendiente')
        .eq('gym_id', gymId),
      supabase
        .from('socios')
        .select('id', { count: 'exact', head: true })
        .eq('gym_id', gymId)
        .eq('activo', true)
        .gte('created_at', `${inicioMes}T00:00:00`),
      supabase
        .from('ventas_productos')
        .select('descripcion, cantidad, total')
        .eq('gym_id', gymId)
        .eq('estado', 'ACTIVO')
        .gte('created_at', `${hace30}T00:00:00`)
        .limit(500),
      supabase
        .from('asistencias')
        .select('fecha, hora')
        .eq('gym_id', gymId)
        .gte('fecha', hace30)
        .limit(1500),
    ])
      .then(([estRes, nuevosRes, ventasRes, asisRes]) => {
        if (cancelado) return;

        const estados = (estRes.data ?? []) as Array<{
          semaforo: 'VERDE' | 'AMBAR' | 'ROJO';
          plan: string | null;
          saldo_pendiente: number;
        }>;
        const totalSocios = estados.length;
        const verdes = estados.filter((e) => e.semaforo === 'VERDE').length;
        const ambar = estados.filter((e) => e.semaforo === 'AMBAR').length;
        const rojos = estados.filter((e) => e.semaforo === 'ROJO').length;
        const nuevosMes = nuevosRes.count ?? 0;

        let conDeuda = 0;
        let deudaTotal = 0;
        const mapaPlanes = new Map<string, number>();

        for (const e of estados) {
          const saldo = Number(e.saldo_pendiente ?? 0);
          if (saldo > 0) {
            conDeuda += 1;
            deudaTotal += saldo;
          }
          if (e.semaforo !== 'ROJO' && e.plan) {
            mapaPlanes.set(e.plan, (mapaPlanes.get(e.plan) ?? 0) + 1);
          }
        }

        const distribucionPlanes: PlanDistribucion[] = Array.from(mapaPlanes.entries())
          .map(([nombre, cantidad]) => ({ nombre, cantidad }))
          .sort((a, b) => b.cantidad - a.cantidad);

        const mapaProd = new Map<string, { unidades: number; ingresos: number }>();
        for (const v of ventasRes.data ?? []) {
          const nombre = String(v.descripcion);
          const prev = mapaProd.get(nombre) ?? { unidades: 0, ingresos: 0 };
          prev.unidades += Number(v.cantidad) || 0;
          prev.ingresos += Number(v.total) || 0;
          mapaProd.set(nombre, prev);
        }
        const topProductos: ProductoRanking[] = Array.from(mapaProd.entries())
          .map(([nombre, val]) => ({ nombre, ...val }))
          .sort((a, b) => b.unidades - a.unidades)
          .slice(0, 5);

        const conteoFranjas = [0, 0, 0, 0];
        const conteoDias = [0, 0, 0, 0, 0, 0, 0];
        for (const a of asisRes.data ?? []) {
          if (a.fecha) {
            const idx = diaSemanaFecha(String(a.fecha));
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

        const franjasPico: FranjaPico[] = [
          { etiqueta: 'Mañana (entrenador)', rango: '06:00 – 11:00', cantidad: conteoFranjas[0] },
          { etiqueta: 'Mediodía (libre)', rango: '11:00 – 16:00', cantidad: conteoFranjas[1] },
          { etiqueta: 'Tarde (entrenador)', rango: '16:00 – 19:00', cantidad: conteoFranjas[2] },
          { etiqueta: 'Noche (entrenador)', rango: '19:00 – 22:30', cantidad: conteoFranjas[3] },
        ];

        const asistenciasSemana: AsistenciaDia[] = DIAS_SEMANA.map((dia, i) => ({
          dia,
          cantidad: conteoDias[i],
        }));

        setStats({
          totalSocios,
          verdes,
          ambar,
          rojos,
          nuevosMes,
          conDeuda,
          deudaTotal: Math.round(deudaTotal * 100) / 100,
          distribucionPlanes,
          asistenciasSemana,
          topProductos,
          franjasPico,
        });
      })
      .catch(() => {});

    return () => {
      cancelado = true;
    };
  }, [gymId]);

  if (!stats) return null;

  const maxAsistenciasFranja = Math.max(1, ...stats.franjasPico.map((f) => f.cantidad));
  const maxDiaAsis = Math.max(0, ...stats.asistenciasSemana.map((d) => d.cantidad));
  const totalAsistencias30 = stats.asistenciasSemana.reduce((s, d) => s + d.cantidad, 0);

  const saludDonut = [
    { label: 'Al día (Verde)', value: stats.verdes, color: '#22c55e' },
    { label: 'Atención / Saldo (Ámbar)', value: stats.ambar, color: '#ff8a1f' },
    { label: 'Vencidos / Sin plan (Rojo)', value: stats.rojos, color: '#ef4444' },
  ];

  const planesVigentesDonut = stats.distribucionPlanes.slice(0, 6).map((p, idx) => ({
    label: p.nombre,
    value: p.cantidad,
    color: PALETA_GRAFICOS[idx % PALETA_GRAFICOS.length],
  }));
  if (stats.distribucionPlanes.length > 6) {
    const otros = stats.distribucionPlanes.slice(6).reduce((s, p) => s + p.cantidad, 0);
    planesVigentesDonut.push({ label: 'Otros planes', value: otros, color: '#71717a' });
  }

  return (
    <section aria-label="Estadísticas operativas" className="space-y-4">
      <h2 className="section-title text-lg">Actividad, socios y retención</h2>

      {/* Fila 1: 2 gráficos de pastel del padrón */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* 1. Salud del padrón en dona + mini KPIs */}
        <article className="panel-card flex flex-col justify-between space-y-4 p-5">
          <div className="flex items-center justify-between border-b border-line/70 pb-3">
            <h3 className="section-title flex items-center gap-2 text-base">
              <Users size={16} strokeWidth={1.75} className="text-brand" />
              Salud del padrón de socios
            </h3>
            <span className="font-mono text-xs font-semibold text-ok">
              {stats.totalSocios > 0
                ? `${Math.round(((stats.verdes + stats.ambar) / stats.totalSocios) * 100)}% vigentes`
                : '0%'}
            </span>
          </div>

          <DonutChart
            items={saludDonut}
            centerLabel="Total socios"
            centerValue={String(stats.totalSocios)}
            formatValue={(v) => `${v} socios`}
            emptyText="Aún no hay socios registrados."
          />

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

        {/* 2. Distribución de socios vigentes por plan */}
        <article className="panel-card space-y-4 p-5">
          <div className="flex items-center justify-between border-b border-line/70 pb-3">
            <h3 className="section-title flex items-center gap-2 text-base">
              <Dumbbell size={16} strokeWidth={1.75} className="text-brand" />
              Socios vigentes por plan
            </h3>
            <span className="text-xs text-muted">Al día y con aviso</span>
          </div>

          <DonutChart
            items={planesVigentesDonut}
            centerLabel="Vigentes"
            centerValue={String(stats.verdes + stats.ambar)}
            formatValue={(v) => `${v} socios`}
            emptyText="No hay socios vigentes con plan asignado."
          />
        </article>
      </div>

      {/* Fila 2: Asistencias por día, horas pico y productos */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* 1. Asistencias por día de la semana */}
        <article className="panel-card p-5">
          <div className="flex items-center justify-between border-b border-line/70 pb-3">
            <span className="flex items-center gap-2 text-xs font-semibold text-bone">
              <CalendarDays size={15} strokeWidth={1.75} className="text-brand" />
              Asistencias por día (30d)
            </span>
            <span className="font-mono text-xs text-muted">{totalAsistencias30} ing.</span>
          </div>

          <div className="mt-3">
            <VerticalBarChart
              items={stats.asistenciasSemana.map((d) => ({
                key: d.dia,
                label: d.dia,
                value: d.cantidad,
                highlight: d.cantidad > 0 && d.cantidad === maxDiaAsis,
                tooltip: `${d.dia}: ${d.cantidad} asistencias`,
              }))}
              primaryColorClass="bg-gradient-to-t from-sky-500/60 to-sky-400"
              heightClass="h-28"
            />
          </div>
        </article>

        {/* 2. Horas pico de asistencia */}
        <article className="panel-card p-5">
          <div className="flex items-center justify-between border-b border-line/70 pb-3">
            <span className="flex items-center gap-2 text-xs font-semibold text-bone">
              <Clock size={15} strokeWidth={1.75} className="text-brand" />
              Horas pico (30d)
            </span>
          </div>

          <div className="mt-4 space-y-3.5">
            {stats.franjasPico.map((f) => {
              const pct = Math.round((f.cantidad / maxAsistenciasFranja) * 100);
              return (
                <div key={f.rango} className="space-y-1 text-xs">
                  <div className="flex items-baseline justify-between">
                    <span className="font-medium text-bone">
                      {f.etiqueta}{' '}
                      <span className="font-mono text-[11px] text-muted">({f.rango})</span>
                    </span>
                    <span className="font-mono font-bold text-bone tabular-nums">
                      {f.cantidad}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
                    <div
                      className="bar-fill h-full rounded-full bg-gradient-to-r from-brand/70 to-brand"
                      style={{ width: `${f.cantidad > 0 ? Math.max(8, pct) : 0}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </article>

        {/* 3. Productos más vendidos */}
        <article className="panel-card p-5">
          <div className="flex items-center justify-between border-b border-line/70 pb-3">
            <span className="flex items-center gap-2 text-xs font-semibold text-bone">
              <Package size={15} strokeWidth={1.75} className="text-brand" />
              Top productos (30d)
            </span>
          </div>

          {stats.topProductos.length === 0 ? (
            <p className="mt-6 text-xs text-muted">
              Aún no se registran ventas de productos en los últimos 30 días.
            </p>
          ) : (
            (() => {
              const maxUnid = Math.max(1, ...stats.topProductos.map((p) => p.unidades));
              return (
                <ul className="mt-4 space-y-3 text-xs">
                  {stats.topProductos.map((p, i) => {
                    const pct = Math.round((p.unidades / maxUnid) * 100);
                    return (
                      <li key={p.nombre} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-baseline gap-2">
                            <span className="rounded bg-surface-2 px-1.5 py-0.2 font-mono text-[10px] font-bold text-brand">
                              #{i + 1}
                            </span>
                            <span className="font-medium text-bone">{p.nombre}</span>
                          </div>
                          <div className="text-right font-mono tabular-nums">
                            <span className="font-bold text-bone">{p.unidades}u</span>
                            <span className="ml-1.5 text-muted">({soles(p.ingresos)})</span>
                          </div>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                          <div
                            className="bar-fill h-full rounded-full bg-ok"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              );
            })()
          )}
        </article>
      </div>
    </section>
  );
}
