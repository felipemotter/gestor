"use client";

import type { DashboardCashflowPoint } from "@/types";
import { formatCompactCurrency } from "@/lib/formatters";

export function CashflowChart({
  points,
  title,
}: {
  title: string;
  points: DashboardCashflowPoint[];
}) {
  const values = points.map((point) => point.value);
  const minValue = values.length ? Math.min(...values) : 0;
  const maxValue = values.length ? Math.max(...values) : 0;
  const range = Math.max(maxValue - minValue, 1);

  const width = 320;
  const height = 140;
  const paddingX = 12;
  const paddingY = 18;
  const innerWidth = width - paddingX * 2;
  const innerHeight = height - paddingY * 2;

  const toX = (index: number) => {
    if (points.length <= 1) {
      return paddingX;
    }
    return paddingX + (index / (points.length - 1)) * innerWidth;
  };

  const toY = (value: number) =>
    paddingY + ((maxValue - value) / range) * innerHeight;

  const polyline = points
    .map((point, index) => `${toX(index)},${toY(point.value)}`)
    .join(" ");

  const area = points.length
    ? `${paddingX},${toY(0)} ${polyline} ${paddingX + innerWidth},${toY(0)}`
    : "";

  const last = points[points.length - 1]?.value ?? 0;
  const tone =
    last < 0 ? "text-rose-600" : last > 0 ? "text-emerald-600" : "text-slate-600";

  return (
    <div className="flex h-full min-h-[280px] flex-col rounded-3xl border border-[var(--border)] bg-white/80 p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">
          {title}
        </h3>
        <span className={`text-xs font-semibold ${tone}`}>
          {formatCompactCurrency(last)}
        </span>
      </div>
      {points.length === 0 ? (
        <p className="mt-6 text-sm text-[var(--muted)]">
          Sem dados para o período selecionado.
        </p>
      ) : (
        <div className="mt-5 flex-1 overflow-hidden rounded-2xl border border-[var(--border)] bg-white p-3">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="h-44 w-full sm:h-48"
            preserveAspectRatio="none"
          >
            <line
              x1={paddingX}
              y1={toY(0)}
              x2={paddingX + innerWidth}
              y2={toY(0)}
              stroke="rgba(148, 163, 184, 0.55)"
              strokeWidth="1"
            />
            <polygon
              points={area}
              fill="rgba(59, 130, 246, 0.10)"
            />
            <polyline
              points={polyline}
              fill="none"
              stroke="rgba(59, 130, 246, 0.95)"
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </svg>
          <div className="mt-2 flex items-center justify-between text-xs text-[var(--muted)]">
            <span>{points[0]?.date?.slice(8, 10)}/{points[0]?.date?.slice(5, 7)}</span>
            <span>{points[points.length - 1]?.date?.slice(8, 10)}/{points[points.length - 1]?.date?.slice(5, 7)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
