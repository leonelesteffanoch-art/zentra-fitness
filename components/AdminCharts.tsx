'use client';

import { useState } from 'react';

export const PALETA_GRAFICOS = [
  '#ffc21a', // brand gold
  '#22c55e', // ok green
  '#38bdf8', // sky blue
  '#a855f7', // purple
  '#ff8a1f', // warn orange
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f43f5e', // rose
];

export interface DonutItem {
  label: string;
  value: number;
  color: string;
  sublabel?: string;
}

interface DonutChartProps {
  items: DonutItem[];
  centerLabel: string;
  centerValue: string;
  formatValue?: (v: number) => string;
  emptyText?: string;
  size?: number;
}

interface SegmentoDona extends DonutItem {
  pct: number;
  len: number;
  offset: number;
}

function calcularSegmentos(
  positivos: DonutItem[],
  total: number,
  circ: number,
  gap: number
): SegmentoDona[] {
  const resultado: SegmentoDona[] = [];
  let acumulado = 0;
  for (const item of positivos) {
    const frac = item.value / total;
    const len = frac * circ;
    resultado.push({
      ...item,
      pct: Math.round(frac * 100),
      len: Math.max(2, len - gap),
      offset: -acumulado,
    });
    acumulado += len;
  }
  return resultado;
}

/** Gráfico de pastel / dona SVG interactivo con leyenda en vivo. */
export function DonutChart({
  items,
  centerLabel,
  centerValue,
  formatValue = (v) => String(v),
  emptyText = 'Sin datos disponibles en este rango.',
  size = 164,
}: DonutChartProps) {
  const [hoveredLabel, setHoveredLabel] = useState<string | null>(null);

  const positivos = items.filter((i) => i.value > 0);
  const total = positivos.reduce((s, i) => s + i.value, 0);

  if (total <= 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div
          className="flex h-28 w-28 items-center justify-center rounded-full border-[14px] border-surface-2 text-xs text-muted"
          aria-hidden="true"
        >
          0%
        </div>
        <p className="mt-3 text-xs text-muted">{emptyText}</p>
      </div>
    );
  }

  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 18;
  const circ = 2 * Math.PI * r;
  const gap = positivos.length > 1 ? 2.5 : 0;

  const segmentos = calcularSegmentos(positivos, total, circ, gap);

  const activo = hoveredLabel
    ? segmentos.find((s) => s.label === hoveredLabel) ?? null
    : null;

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
      {/* Dona SVG */}
      <div
        className="relative shrink-0"
        style={{ width: size, height: size }}
        onMouseLeave={() => setHoveredLabel(null)}
      >
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90"
          role="img"
          aria-label={`${centerLabel}: ${centerValue}`}
        >
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="var(--surface-2)"
            strokeWidth={18}
          />
          {segmentos.map((seg) => {
            const esActivo = hoveredLabel === seg.label;
            const atenuado = hoveredLabel !== null && !esActivo;
            return (
              <circle
                key={seg.label}
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke={seg.color}
                strokeWidth={esActivo ? 22 : 18}
                strokeDasharray={`${seg.len} ${circ}`}
                strokeDashoffset={seg.offset}
                opacity={atenuado ? 0.42 : 1}
                className="cursor-pointer transition-all duration-200"
                onMouseEnter={() => setHoveredLabel(seg.label)}
              />
            );
          })}
        </svg>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-5 text-center">
          <span className="max-w-full truncate text-[10px] font-semibold uppercase tracking-wider text-muted">
            {activo ? activo.label : centerLabel}
          </span>
          <span className="mt-0.5 font-mono text-sm font-bold text-bone tabular-nums sm:text-base">
            {activo ? formatValue(activo.value) : centerValue}
          </span>
          {activo && (
            <span className="font-mono text-[11px] font-semibold text-brand tabular-nums">
              {activo.pct}%
            </span>
          )}
        </div>
      </div>

      {/* Leyenda interactiva */}
      <ul className="w-full min-w-0 flex-1 space-y-1.5 text-xs">
        {items.map((item) => {
          const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
          const esActivo = hoveredLabel === item.label;
          return (
            <li
              key={item.label}
              onMouseEnter={() => item.value > 0 && setHoveredLabel(item.label)}
              onMouseLeave={() => setHoveredLabel(null)}
              className={`flex items-center justify-between gap-2 rounded-md px-2.5 py-1.5 transition-colors ${
                item.value > 0 ? 'cursor-pointer' : 'opacity-50'
              } ${esActivo ? 'bg-surface-2 ring-1 ring-line' : 'bg-surface-2/40 hover:bg-surface-2/70'}`}
            >
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <div className="min-w-0">
                  <span className="block truncate font-medium text-bone">{item.label}</span>
                  {item.sublabel && (
                    <span className="block truncate text-[10px] text-muted">{item.sublabel}</span>
                  )}
                </div>
              </div>
              <div className="shrink-0 text-right font-mono tabular-nums">
                <span className="font-semibold text-bone">{formatValue(item.value)}</span>
                <span className="ml-1.5 text-[11px] text-muted">{pct}%</span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export interface BarItem {
  key: string;
  label: string;
  value: number;
  secondaryValue?: number;
  tooltip?: string;
  highlight?: boolean;
}

interface VerticalBarChartProps {
  items: BarItem[];
  formatShort?: (v: number) => string;
  primaryColorClass?: string;
  secondaryColorClass?: string;
  heightClass?: string;
  onBarClick?: (key: string) => void;
}

/** Gráfico de barras verticales con líneas guía y soporte opcional de clics. */
export function VerticalBarChart({
  items,
  formatShort = (v) => (v > 0 ? String(Math.round(v)) : ''),
  primaryColorClass = 'bg-gradient-to-t from-brand/60 to-brand',
  secondaryColorClass = 'bg-bad/80',
  heightClass = 'h-36',
  onBarClick,
}: VerticalBarChartProps) {
  const maxValor = Math.max(
    1,
    ...items.map((d) => Math.max(d.value, d.secondaryValue ?? 0))
  );

  return (
    <div className="flex items-stretch gap-2 pt-2">
      {/* Eje Y discreto */}
      <div
        aria-hidden="true"
        className={`mt-5 mb-5 flex w-9 shrink-0 flex-col justify-between text-right font-mono text-[10px] leading-none text-muted/75 tabular-nums ${heightClass}`}
      >
        <span>{formatShort(maxValor) || Math.round(maxValor)}</span>
        <span>{formatShort(maxValor / 2) || Math.round(maxValor / 2)}</span>
        <span>0</span>
      </div>

      <div className="relative flex flex-1 items-end gap-1.5 overflow-x-auto pb-1">
        {/* Líneas guía horizontales */}
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-x-0 top-5 flex flex-col justify-between ${heightClass}`}
        >
          <span className="border-t border-dashed border-line/50" />
          <span className="border-t border-dashed border-line/50" />
          <span className="border-t border-dashed border-line/50" />
        </div>

        {items.map((item) => {
          const pctPri =
            item.value === 0 ? 4 : Math.max(10, Math.round((item.value / maxValor) * 100));
          const pctSec =
            item.secondaryValue && item.secondaryValue > 0
              ? Math.max(8, Math.round((item.secondaryValue / maxValor) * 100))
              : 0;
          const Tag = onBarClick ? 'button' : 'div';

          return (
            <Tag
              key={item.key}
              {...(onBarClick
                ? { type: 'button' as const, onClick: () => onBarClick(item.key) }
                : {})}
              title={item.tooltip}
              className={`group relative z-10 flex min-w-[38px] flex-1 flex-col items-center gap-1 rounded-md p-0.5 transition-colors ${
                onBarClick ? 'cursor-pointer hover:bg-surface-2/50' : ''
              }`}
            >
              <span className="h-4 font-mono text-[10px] font-semibold leading-4 text-bone/90 tabular-nums">
                {item.value > 0 ? formatShort(item.value) : ''}
              </span>

              <div
                className={`flex w-full items-end justify-center gap-1 rounded-t px-1 pt-1 ${heightClass} ${
                  item.highlight
                    ? 'border border-brand/45 bg-brand/[0.07]'
                    : 'bg-surface-2/50'
                }`}
              >
                <div
                  className={`bar-fill w-full rounded-t ${
                    item.value === 0
                      ? 'bg-line/40'
                      : item.highlight
                      ? 'bg-gradient-to-t from-brand/80 to-brand group-hover:brightness-110'
                      : `${primaryColorClass} group-hover:brightness-110`
                  }`}
                  style={{ height: `${pctPri}%` }}
                />
                {pctSec > 0 && (
                  <div
                    className={`bar-fill w-2/3 rounded-t ${secondaryColorClass}`}
                    style={{ height: `${pctSec}%` }}
                  />
                )}
              </div>

              <span
                className={`font-mono text-[10px] ${
                  item.highlight ? 'font-bold text-brand' : 'text-muted group-hover:text-bone'
                }`}
              >
                {item.label}
              </span>
            </Tag>
          );
        })}
      </div>
    </div>
  );
}
