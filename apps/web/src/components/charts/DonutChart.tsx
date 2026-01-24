"use client";

import { useState } from "react";
import type { DashboardCategoryDatum } from "@/types";
import { currencyFormatter, formatCompactCurrency } from "@/lib/formatters";

export const buildDonutSegments = (
  rows: Array<{ id: string; label: string; value: number; color: string }>,
  options?: { maxSegments?: number },
): DashboardCategoryDatum[] => {
  const maxSegments = options?.maxSegments ?? 5;
  const sorted = [...rows]
    .filter((row) => Number.isFinite(row.value) && row.value > 0.009)
    .sort((a, b) => b.value - a.value);
  const head = sorted.slice(0, maxSegments);
  const tail = sorted.slice(maxSegments);
  const otherTotal = tail.reduce((sum, item) => sum + item.value, 0);
  if (otherTotal > 0.009) {
    head.push({
      id: "other",
      label: "Outros",
      value: otherTotal,
      color: "#94A3B8",
    });
  }
  return head;
};

export function DonutChart({
  title,
  segments,
}: {
  title: string;
  segments: DashboardCategoryDatum[];
}) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const total = segments.reduce((sum, item) => sum + item.value, 0);
  const radius = 95;
  const stroke = 24;
  const circumference = 2 * Math.PI * radius;
  const hoveredSegment = hoveredId
    ? segments.find((segment) => segment.id === hoveredId) ?? null
    : null;
  const centerValue = hoveredSegment ? hoveredSegment.value : total;
  const centerLabel = hoveredSegment ? hoveredSegment.label : "Total";
  const centerPct =
    hoveredSegment && total > 0.009
      ? (hoveredSegment.value / total) * 100
      : null;
  const arcs = segments.reduce<{
    offset: number;
    arcs: Array<{ id: string; color: string; dashArray: string; dashOffset: number }>;
  }>(
    (acc, segment) => {
      const dash = (segment.value / total) * circumference;
      return {
        offset: acc.offset + dash,
        arcs: [
          ...acc.arcs,
          {
            id: segment.id,
            color: segment.color,
            dashArray: `${dash} ${circumference - dash}`,
            dashOffset: -acc.offset,
          },
        ],
      };
    },
    { offset: 0, arcs: [] },
  ).arcs;

  return (
    <div className="flex h-full min-h-[280px] flex-col rounded-3xl border border-[var(--border)] bg-white/80 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">
          {title}
        </h3>
        <span className="text-xs font-semibold text-[var(--muted)]">
          {formatCompactCurrency(total)}
        </span>
      </div>
      {total <= 0.009 ? (
        <p className="mt-6 text-sm text-[var(--muted)]">
          Sem dados para o período selecionado.
        </p>
      ) : (
        <div className="mt-2 flex flex-1 items-center justify-center">
          <div className="relative flex items-center justify-center">
            <svg
              width="220"
              height="220"
              viewBox="0 0 220 220"
              className="h-full w-full max-h-[252px] max-w-[252px]"
            >
              <circle
                cx="110"
                cy="110"
                r={radius}
                fill="none"
                stroke="rgba(148, 163, 184, 0.25)"
                strokeWidth={stroke}
              />
              {arcs.map((arc) => (
                <circle
                  key={arc.id}
                  cx="110"
                  cy="110"
                  r={radius}
                  fill="none"
                  stroke={arc.color}
                  strokeWidth={
                    hoveredId && hoveredId === arc.id ? stroke + 2 : stroke
                  }
                  strokeDasharray={arc.dashArray}
                  strokeDashoffset={arc.dashOffset}
                  strokeLinecap="round"
                  transform="rotate(-90 110 110)"
                  style={{
                    cursor: "pointer",
                    opacity:
                      hoveredId && hoveredId !== arc.id ? 0.25 : 1,
                    transition: "opacity 120ms ease-out, stroke-width 120ms ease-out",
                  }}
                  onMouseEnter={() => setHoveredId(arc.id)}
                  onMouseLeave={() => setHoveredId(null)}
                />
              ))}
            </svg>
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center justify-center text-center">
                <p className="text-base font-semibold text-[var(--ink)]">
                  {currencyFormatter.format(centerValue)}
                </p>
                <p className="mt-0.5 max-w-[160px] truncate text-xs font-semibold text-[var(--muted)]">
                  {centerLabel}
                </p>
                {centerPct !== null ? (
                  <p className="mt-0.5 text-[11px] font-semibold text-[var(--muted)]">
                    {centerPct.toFixed(2)}%
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
