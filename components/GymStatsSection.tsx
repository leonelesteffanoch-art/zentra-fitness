'use client';

import { useEffect, useState } from 'react';
import { Clock, Package, Users } from 'lucide-react';
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

interface StatsData {
  totalSocios: number;
  sociosActivos: number;
  sociosVencidos: number;
  nuevosMes: number;
  topProductos: ProductoRanking[];
  franjasPico: FranjaPico[];
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
        .select('semaforo')
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
        .select('hora')
        .eq('gym_id', gymId)
        .gte('fecha', hace30)
        .limit(1000),
    ])
      .then(([estRes, nuevosRes, ventasRes, asisRes]) => {
        if (cancelado) return;

        const estados = estRes.data ?? [];
        const totalSocios = estados.length;
        const sociosActivos = estados.filter(
          (e) => e.semaforo === 'VERDE' || e.semaforo === 'AMBAR'
        ).length;
        const sociosVencidos = estados.filter((e) => e.semaforo === 'ROJO').length;
        const nuevosMes = nuevosRes.count ?? 0;

        // Agregar productos más vendidos
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

        // Agrupar asistencias por bloque horario en hora Lima
        const conteoFranjas = [0, 0, 0, 0];
        for (const a of asisRes.data ?? []) {
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

        setStats({
          totalSocios,
          sociosActivos,
          sociosVencidos,
          nuevosMes,
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

  const maxAsistenciasFranja = Math.max(
    1,
    ...stats.franjasPico.map((f) => f.cantidad)
  );
  const pctRetencion =
    stats.totalSocios > 0 ? Math.round((stats.sociosActivos / stats.totalSocios) * 100) : 0;

  return (
    <section aria-label="Estadísticas operativas" className="space-y-3">
      <h2 className="section-title text-lg">
        Estadísticas de socios, horas pico y productos más vendidos
      </h2>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* 1. Socios nuevos, activos y bajas */}
        <article className="panel-card flex flex-col justify-between p-5">
          <div>
            <div className="flex items-center justify-between text-xs font-medium text-muted">
              <span className="flex items-center gap-2">
                <Users size={15} strokeWidth={1.75} className="text-brand" />
                Padrón de socios y retención
              </span>
              <span className="font-mono font-bold text-ok">{pctRetencion}% activos</span>
            </div>

            <div className="mt-3 flex h-2 w-full overflow-hidden rounded-full bg-surface-2">
              <div className="bar-fill h-full bg-ok" style={{ width: `${pctRetencion}%` }} />
              <div
                className="bar-fill h-full bg-bad"
                style={{ width: `${Math.max(0, 100 - pctRetencion)}%` }}
              />
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-3 tabular-nums">
              <div className="rounded-md border border-line/60 bg-ink/50 p-3">
                <dt className="text-[11px] text-muted">Socios activos</dt>
                <dd className="mt-0.5 font-mono text-2xl font-bold text-ok">
                  {stats.sociosActivos}
                </dd>
              </div>
              <div className="rounded-md border border-line/60 bg-ink/50 p-3">
                <dt className="text-[11px] text-muted">Vencidos / Bajas</dt>
                <dd className="mt-0.5 font-mono text-2xl font-bold text-bad">
                  {stats.sociosVencidos}
                </dd>
              </div>
              <div className="rounded-md border border-line/60 bg-ink/50 p-3">
                <dt className="text-[11px] text-muted">Nuevos este mes</dt>
                <dd className="mt-0.5 font-mono text-2xl font-bold text-brand">
                  +{stats.nuevosMes}
                </dd>
              </div>
              <div className="rounded-md border border-line/60 bg-ink/50 p-3">
                <dt className="text-[11px] text-muted">Total inscritos</dt>
                <dd className="mt-0.5 font-mono text-2xl font-bold text-bone">
                  {stats.totalSocios}
                </dd>
              </div>
            </dl>
          </div>
        </article>

        {/* 2. Horas pico de asistencia */}
        <article className="panel-card p-5">
          <div className="flex items-center gap-2 text-xs font-medium text-muted">
            <Clock size={15} strokeWidth={1.75} className="text-brand" />
            <span>Horas pico (últimos 30 días)</span>
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
                      {f.cantidad} ing.
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

        {/* 3. Productos más vendidos del POS */}
        <article className="panel-card p-5">
          <div className="flex items-center gap-2 text-xs font-medium text-muted">
            <Package size={15} strokeWidth={1.75} className="text-brand" />
            <span>Top 5 productos POS (30 días)</span>
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
