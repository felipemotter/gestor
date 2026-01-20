"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabase/client";
import { bankLogoOptions } from "@/lib/bank-logos";

const supabase = getSupabaseClient();
const primaryButton =
  "inline-flex items-center justify-center rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-500/30 transition hover:bg-[var(--accent-strong)]";
const secondaryButton =
  "inline-flex items-center justify-center rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--ink)] shadow-sm transition hover:border-[var(--accent)] hover:text-[var(--accent-strong)]";
const BRAZIL_TZ = "America/Sao_Paulo";
const brazilDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: BRAZIL_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const getBrazilToday = () => brazilDateFormatter.format(new Date());
const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const currencyNoCentsFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

const timeFormatter = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: BRAZIL_TZ,
});
const shortDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: BRAZIL_TZ,
});
const calendarDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: BRAZIL_TZ,
});
const longDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: BRAZIL_TZ,
});
const getDateParts = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) {
    return null;
  }
  return { year, monthIndex: month - 1, day };
};
const formatDateKey = (year: number, monthIndex: number, day: number) =>
  `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(
    2,
    "0",
  )}`;
const parseBrazilDate = (value: string) => {
  const parts = getDateParts(value);
  if (!parts) {
    return new Date();
  }
  return new Date(Date.UTC(parts.year, parts.monthIndex, parts.day, 12));
};
const addDaysToBrazilDate = (value: string, offset: number) => {
  const base = parseBrazilDate(value);
  base.setUTCDate(base.getUTCDate() + offset);
  return brazilDateFormatter.format(base);
};
const isDateOnly = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);
const parseDateValue = (value: string) => {
  if (isDateOnly(value)) {
    return parseBrazilDate(value);
  }
  return new Date(value);
};

const subtractDaysFromBrazilDate = (value: string, offset: number) =>
  addDaysToBrazilDate(value, -offset);

type DashboardCategoryDatum = {
  id: string;
  label: string;
  value: number;
  color: string;
};

type DashboardCashflowPoint = {
  date: string;
  value: number;
};

type StatementRow = {
  id: string;
  posted_at: string;
  occurred_time: string | null;
  description: string | null;
  label: string;
  delta: number;
  balance_after: number;
};

const formatCompactCurrency = (value: number) =>
  currencyFormatter
    .format(value)
    .replace(/\s/g, "")
    .replace("R$", "R$ ");

const formatCompactBRL = (value: number) => {
  const absoluteValue = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  const formatNumber = (num: number, suffix: string) =>
    `${sign}R$ ${num.toFixed(1).replace(".", ",")}${suffix}`;
  if (absoluteValue >= 1_000_000_000) {
    return formatNumber(absoluteValue / 1_000_000_000, "B");
  }
  if (absoluteValue >= 1_000_000) {
    return formatNumber(absoluteValue / 1_000_000, "M");
  }
  if (absoluteValue >= 1_000) {
    return formatNumber(absoluteValue / 1_000, "k");
  }
  return `${sign}${currencyNoCentsFormatter.format(absoluteValue)}`;
};

const buildDonutSegments = (
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

const DonutChart = ({
  title,
  segments,
}: {
  title: string;
  segments: DashboardCategoryDatum[];
	}) => {
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
};

const CashflowChart = ({
  points,
  title,
}: {
  title: string;
  points: DashboardCashflowPoint[];
}) => {
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
};
const toBrazilDateKey = (value: string) => {
  if (isDateOnly(value)) {
    return value;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return brazilDateFormatter.format(parsed);
};
const calendarWeekdays = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];

const typeFilterAll = ["expense", "income", "transfer"] as const;

type AccountIconOption = {
  key: string;
  label: string;
  icon?: ({ className }: { className?: string }) => JSX.Element;
  imageSrc?: string;
};

const DEFAULT_ACCOUNT_ICON_BG = "#dbeafe";
const DEFAULT_ACCOUNT_ICON_COLOR = "#1e40af";
const DEFAULT_CATEGORY_ICON_BG = "#e2e8f0";
const DEFAULT_CATEGORY_ICON_COLOR = "#0f172a";
const baseAccountIconOptions: AccountIconOption[] = [
  { key: "initials", label: "Iniciais" },
  {
    key: "bank",
    label: "Banco",
    icon: ({ className = "h-5 w-5" }) => (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className={className}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 10h18" />
        <path d="M4 10l8-5 8 5" />
        <path d="M5 10v7" />
        <path d="M9 10v7" />
        <path d="M15 10v7" />
        <path d="M19 10v7" />
        <path d="M3 17h18" />
      </svg>
    ),
  },
  {
    key: "wallet",
    label: "Carteira",
    icon: ({ className = "h-5 w-5" }) => (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className={className}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="7" width="18" height="12" rx="3" />
        <path d="M16 12h4" />
        <path d="M7 7V5h10" />
      </svg>
    ),
  },
  {
    key: "card",
    label: "Cartão",
    icon: ({ className = "h-5 w-5" }) => (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className={className}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="6" width="18" height="12" rx="2" />
        <path d="M3 10h18" />
        <path d="M7 15h4" />
      </svg>
    ),
  },
  {
    key: "cash",
    label: "Dinheiro",
    icon: ({ className = "h-5 w-5" }) => (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className={className}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="7" width="18" height="10" rx="2" />
        <circle cx="12" cy="12" r="2.5" />
        <path d="M7 9h.01" />
        <path d="M17 15h.01" />
      </svg>
    ),
  },
  {
    key: "savings",
    label: "Poupança",
    icon: ({ className = "h-5 w-5" }) => (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className={className}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v8" />
        <path d="M8 11l4 4 4-4" />
      </svg>
    ),
  },
  {
    key: "benefits",
    label: "Benefícios",
    icon: ({ className = "h-5 w-5" }) => (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className={className}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="7" width="18" height="11" rx="2" />
        <path d="M9 7V5h6v2" />
        <path d="M3 12h18" />
      </svg>
    ),
  },
  {
    key: "invest",
    label: "Investimento",
    icon: ({ className = "h-5 w-5" }) => (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className={className}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 19h16" />
        <rect x="6" y="10" width="3" height="7" rx="1" />
        <rect x="11" y="7" width="3" height="10" rx="1" />
        <rect x="16" y="13" width="3" height="4" rx="1" />
      </svg>
    ),
  },
];
const accountIconOptions: AccountIconOption[] = [
  ...baseAccountIconOptions,
  ...bankLogoOptions,
];
const accountIconLookup = accountIconOptions.reduce<
  Record<string, AccountIconOption>
>((acc, option) => {
  acc[option.key] = option;
  return acc;
}, {});
const categoryIconOptions: AccountIconOption[] = [
  ...baseAccountIconOptions,
  {
    key: "tag",
    label: "Etiqueta",
    icon: ({ className = "h-5 w-5" }) => (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className={className}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20 10l-6-6H6a2 2 0 0 0-2 2v8l6 6 10-10z" />
        <circle cx="9" cy="7" r="1.5" />
      </svg>
    ),
  },
  {
    key: "cart",
    label: "Compras",
    icon: ({ className = "h-5 w-5" }) => (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className={className}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="9" cy="20" r="1.5" />
        <circle cx="18" cy="20" r="1.5" />
        <path d="M3 4h2l2.8 9.5a2 2 0 0 0 2 1.5h7.4a2 2 0 0 0 2-1.5L21 8H7" />
      </svg>
    ),
  },
  {
    key: "home",
    label: "Casa",
    icon: ({ className = "h-5 w-5" }) => (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className={className}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 10l9-7 9 7" />
        <path d="M5 10v10h14V10" />
        <path d="M9 20v-6h6v6" />
      </svg>
    ),
  },
  {
    key: "car",
    label: "Transporte",
    icon: ({ className = "h-5 w-5" }) => (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className={className}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M5 16l1.5-6h11L19 16" />
        <path d="M5 16h14" />
        <circle cx="7" cy="18" r="1.5" />
        <circle cx="17" cy="18" r="1.5" />
      </svg>
    ),
  },
  {
    key: "food",
    label: "Alimentação",
    icon: ({ className = "h-5 w-5" }) => (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className={className}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 3v7a4 4 0 0 0 4 4h1" />
        <path d="M8 3v7" />
        <path d="M12 3v18" />
        <path d="M20 4c0 3-2 5-4 5v12" />
      </svg>
    ),
  },
  {
    key: "health",
    label: "Saúde",
    icon: ({ className = "h-5 w-5" }) => (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className={className}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 21s-6-4.35-8-7.5C2 10 4 7 7 7c2 0 3.5 1.4 5 3 1.5-1.6 3-3 5-3 3 0 5 3 3 6.5-2 3.15-8 7.5-8 7.5z" />
      </svg>
    ),
  },
];
const categoryIconLookup = categoryIconOptions.reduce<
  Record<string, AccountIconOption>
>((acc, option) => {
  acc[option.key] = option;
  return acc;
}, {});

const getMonthRange = (monthValue: string) => {
  const [year, month] = monthValue.split("-").map(Number);
  if (!year || !month) {
    return { startDate: "", endDate: "" };
  }

  const paddedMonth = String(month).padStart(2, "0");
  const endDay = new Date(year, month, 0).getDate();

  return {
    startDate: `${year}-${paddedMonth}-01`,
    endDate: `${year}-${paddedMonth}-${String(endDay).padStart(2, "0")}`,
  };
};

export default function HomePage() {
  const [session, setSession] = useState<Session | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeView, setActiveView] = useState<
    | "dashboard"
    | "transactions"
    | "transfers"
    | "accounts"
    | "categories"
    | "statement"
  >("dashboard");
  const [activeMonth, setActiveMonth] = useState(() =>
    getBrazilToday().slice(0, 7),
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [memberships, setMemberships] = useState<
    Array<{
      id: string;
      role: string;
      family: { id: string; name: string; created_at: string } | null;
    }>
  >([]);
  const [activeFamilyId, setActiveFamilyId] = useState<string | null>(null);
  const [isLoadingMemberships, setIsLoadingMemberships] = useState(false);
  const [familyName, setFamilyName] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreatingFamily, setIsCreatingFamily] = useState(false);
  const [accounts, setAccounts] = useState<
    Array<{
      id: string;
      family_id: string;
      name: string;
      account_type: string;
      currency: string;
      visibility: string;
      owner_user_id: string | null;
      opening_balance: number | null;
      icon_key: string | null;
      icon_bg: string | null;
      icon_color: string | null;
      is_archived: boolean;
      created_at: string;
    }>
  >([]);
  const [categories, setCategories] = useState<
    Array<{
      id: string;
      name: string;
      category_type: string;
      parent_id: string | null;
      icon_key: string | null;
      icon_bg: string | null;
      icon_color: string | null;
      is_archived: boolean;
      created_at: string;
    }>
  >([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [transactions, setTransactions] = useState<
    Array<{
      id: string;
      amount: string;
      description: string | null;
      posted_at: string;
      created_at: string;
      source: string | null;
      external_id: string | null;
      account: { id: string; name: string } | null;
      category: { id: string; name: string; category_type: string } | null;
    }>
  >([]);
  const [accountBalances, setAccountBalances] = useState<Record<string, number>>(
    {},
  );
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [transactionsLimit, setTransactionsLimit] = useState(8);
  const [transactionsTotal, setTransactionsTotal] = useState<number | null>(null);
  const [monthlySummary, setMonthlySummary] = useState({
    income: 0,
    expense: 0,
    count: 0,
  });
  const [dashboardExpenseData, setDashboardExpenseData] = useState<
    DashboardCategoryDatum[]
  >([]);
  const [dashboardIncomeData, setDashboardIncomeData] = useState<
    DashboardCategoryDatum[]
  >([]);
  const [dashboardCashflowPoints, setDashboardCashflowPoints] = useState<
    DashboardCashflowPoint[]
  >([]);
  const [isLoadingDashboardAnalytics, setIsLoadingDashboardAnalytics] =
    useState(false);
  const [dataRefreshCounter, setDataRefreshCounter] = useState(0);
  const [accountName, setAccountName] = useState("");
  const [accountType, setAccountType] = useState("checking");
  const [accountVisibility, setAccountVisibility] = useState("shared");
  const [accountOpeningBalance, setAccountOpeningBalance] = useState("");
  const [accountIconKey, setAccountIconKey] = useState("initials");
  const [accountIconBg, setAccountIconBg] = useState(DEFAULT_ACCOUNT_ICON_BG);
  const [accountIconColor, setAccountIconColor] = useState(
    DEFAULT_ACCOUNT_ICON_COLOR,
  );
  const [bankLogoSearch, setBankLogoSearch] = useState("");
  const [accountError, setAccountError] = useState<string | null>(null);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [categoryType, setCategoryType] = useState("expense");
  const [categoryParentId, setCategoryParentId] = useState("");
  const [categoryIconKey, setCategoryIconKey] = useState("tag");
  const [categoryIconBg, setCategoryIconBg] = useState(
    DEFAULT_CATEGORY_ICON_BG,
  );
  const [categoryIconColor, setCategoryIconColor] = useState(
    DEFAULT_CATEGORY_ICON_COLOR,
  );
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [categoryViewType, setCategoryViewType] = useState<
    "expense" | "income"
  >("expense");
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isEditingCategory, setIsEditingCategory] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [categoryActionError, setCategoryActionError] = useState<string | null>(
    null,
  );
  const [categoryActionLoadingId, setCategoryActionLoadingId] = useState<
    string | null
  >(null);
  const [showArchivedCategories, setShowArchivedCategories] = useState(false);
  const [archivedCategories, setArchivedCategories] = useState<
    Array<{
      id: string;
      name: string;
      category_type: string;
      parent_id: string | null;
      icon_key: string | null;
      icon_bg: string | null;
      icon_color: string | null;
      is_archived: boolean;
      created_at: string;
    }>
  >([]);
  const [isLoadingArchivedCategories, setIsLoadingArchivedCategories] =
    useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isEditingAccount, setIsEditingAccount] = useState(false);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [openAccountMenuId, setOpenAccountMenuId] = useState<string | null>(null);
  const [accountActionError, setAccountActionError] = useState<string | null>(null);
  const [accountActionLoadingId, setAccountActionLoadingId] = useState<string | null>(
    null,
  );
  const [accountTxnCounts, setAccountTxnCounts] = useState<Record<string, number>>(
    {},
  );
  const [showArchivedAccounts, setShowArchivedAccounts] = useState(false);
  const [archivedAccounts, setArchivedAccounts] = useState<
    Array<{
      id: string;
      family_id: string;
      name: string;
      account_type: string;
      currency: string;
      visibility: string;
      owner_user_id: string | null;
      opening_balance: number | null;
      icon_key: string | null;
      icon_bg: string | null;
      icon_color: string | null;
      is_archived: boolean;
      created_at: string;
    }>
  >([]);
  const [isLoadingArchivedAccounts, setIsLoadingArchivedAccounts] = useState(false);
  const [isBalanceAdjustOpen, setIsBalanceAdjustOpen] = useState(false);
  const [balanceAdjustAccountId, setBalanceAdjustAccountId] = useState<string | null>(
    null,
  );
  const [balanceAdjustTarget, setBalanceAdjustTarget] = useState("");
  const [balanceAdjustMethod, setBalanceAdjustMethod] = useState<
    "opening" | "transaction"
  >("transaction");
  const [balanceAdjustCategoryId, setBalanceAdjustCategoryId] = useState("");
  const [balanceAdjustError, setBalanceAdjustError] = useState<string | null>(null);
  const [isAdjustingBalance, setIsAdjustingBalance] = useState(false);
  const [transactionAccountId, setTransactionAccountId] = useState("");
  const [transactionDestinationAccountId, setTransactionDestinationAccountId] =
    useState("");
  const [transactionCategoryId, setTransactionCategoryId] = useState("");
  const [transactionType, setTransactionType] = useState("expense");
  const [transactionAmount, setTransactionAmount] = useState("");
  const [transactionDescription, setTransactionDescription] = useState("");
  const [transactionTime, setTransactionTime] = useState("");
  const [transactionDate, setTransactionDate] = useState(() =>
    getBrazilToday(),
  );
  const [datePreset, setDatePreset] = useState<
    "today" | "yesterday" | "custom"
  >("today");
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calendarTempDate, setCalendarTempDate] = useState(() =>
    getBrazilToday(),
  );
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const parts = getDateParts(getBrazilToday());
    return parts ? parts.monthIndex : new Date().getMonth();
  });
  const [calendarYear, setCalendarYear] = useState(() => {
    const parts = getDateParts(getBrazilToday());
    return parts ? parts.year : new Date().getFullYear();
  });
  const [transactionError, setTransactionError] = useState<string | null>(null);
  const [isCreatingTransaction, setIsCreatingTransaction] = useState(false);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [statementAccountId, setStatementAccountId] = useState("");
  const [statementStartDate, setStatementStartDate] = useState("");
  const [statementEndDate, setStatementEndDate] = useState("");
  const [statementUseMonthRange, setStatementUseMonthRange] = useState(true);
  const [statementRows, setStatementRows] = useState<StatementRow[]>([]);
  const [statementOpeningBalance, setStatementOpeningBalance] = useState(0);
  const [statementClosingBalance, setStatementClosingBalance] = useState(0);
  const [isLoadingStatement, setIsLoadingStatement] = useState(false);
  const [statementError, setStatementError] = useState<string | null>(null);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const [filterAccountId, setFilterAccountId] = useState("");
  const [filterCategoryId, setFilterCategoryId] = useState("");
  const [typeFilters, setTypeFilters] = useState<string[]>([
    ...typeFilterAll,
  ]);
  const [transferFromAccountId, setTransferFromAccountId] = useState("");
  const [transferToAccountId, setTransferToAccountId] = useState("");
  const [transferSearch, setTransferSearch] = useState("");
  const [transferMinAmount, setTransferMinAmount] = useState("");
  const [transferMaxAmount, setTransferMaxAmount] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [monthPickerYear, setMonthPickerYear] = useState(() => {
    const parts = getDateParts(getBrazilToday());
    return parts ? parts.year : new Date().getFullYear();
  });
  const monthPickerRef = useRef<HTMLDivElement | null>(null);
  const [isFilterCalendarOpen, setIsFilterCalendarOpen] = useState(false);
  const [filterCalendarTarget, setFilterCalendarTarget] = useState<
    "start" | "end" | null
  >(null);
  const [filterCalendarContext, setFilterCalendarContext] = useState<
    "transactions" | "statement"
  >("transactions");
  const [filterCalendarTempDate, setFilterCalendarTempDate] = useState(() =>
    getBrazilToday(),
  );
  const [filterCalendarMonth, setFilterCalendarMonth] = useState(() => {
    const parts = getDateParts(getBrazilToday());
    return parts ? parts.monthIndex : new Date().getMonth();
  });
  const [filterCalendarYear, setFilterCalendarYear] = useState(() => {
    const parts = getDateParts(getBrazilToday());
    return parts ? parts.year : new Date().getFullYear();
  });

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) {
        return;
      }
      setSession(data.session);
      setIsChecking(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!isMounted) {
        return;
      }
      setSession(nextSession);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return undefined;
    }
    const shouldLockScroll =
      isTransactionModalOpen ||
      isMobileMenuOpen ||
      isFilterCalendarOpen ||
      isAccountModalOpen ||
      isCategoryModalOpen ||
      isBalanceAdjustOpen;
    if (!shouldLockScroll) {
      return undefined;
    }
    const { body } = document;
    const previousOverflow = body.style.overflow;
    body.style.overflow = "hidden";
    return () => {
      body.style.overflow = previousOverflow;
    };
  }, [
    isTransactionModalOpen,
    isMobileMenuOpen,
    isFilterCalendarOpen,
    isAccountModalOpen,
    isCategoryModalOpen,
    isBalanceAdjustOpen,
  ]);

  useEffect(() => {
    if (!isMonthPickerOpen) {
      return;
    }
    const handleClick = (event: MouseEvent | TouchEvent) => {
      if (
        monthPickerRef.current &&
        !monthPickerRef.current.contains(event.target as Node)
      ) {
        setIsMonthPickerOpen(false);
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMonthPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("touchstart", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("touchstart", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [isMonthPickerOpen]);

  const loadMemberships = async (userId: string) => {
    setIsLoadingMemberships(true);
    const { data, error } = await supabase
      .from("memberships")
      .select("id, role, family:families ( id, name, created_at )")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (error) {
      setMemberships([]);
      setIsLoadingMemberships(false);
      return;
    }

    setMemberships(data ?? []);
    setIsLoadingMemberships(false);
  };

  const loadAccounts = async (familyId: string) => {
    setIsLoadingAccounts(true);
    const baseSelectLegacy =
      "id, family_id, name, account_type, currency, visibility, owner_user_id, opening_balance, created_at";
    const baseSelect = `${baseSelectLegacy}, icon_key, icon_bg, icon_color`;
    const selectWithArchive = `${baseSelect}, is_archived`;
    const { data, error } = await supabase
      .from("accounts")
      .select(selectWithArchive)
      .eq("family_id", familyId)
      .eq("is_archived", false)
      .order("created_at", { ascending: true });

    if (error) {
      if (error.message?.includes("is_archived")) {
        let fallback = await supabase
          .from("accounts")
          .select(baseSelect)
          .eq("family_id", familyId)
          .order("created_at", { ascending: true });
        if (fallback.error && fallback.error.message?.includes("icon_")) {
          fallback = await supabase
            .from("accounts")
            .select(baseSelectLegacy)
            .eq("family_id", familyId)
            .order("created_at", { ascending: true });
        }
        if (fallback.error) {
          setAccounts([]);
          setIsLoadingAccounts(false);
          return;
        }
        const normalized = (fallback.data ?? []).map((account) => ({
          ...account,
          is_archived: false,
          icon_key: account.icon_key ?? null,
          icon_bg: account.icon_bg ?? null,
          icon_color: account.icon_color ?? null,
        }));
        setAccounts(normalized);
        setIsLoadingAccounts(false);
        return;
      }
      if (error.message?.includes("icon_")) {
        const fallback = await supabase
          .from("accounts")
          .select(`${baseSelectLegacy}, is_archived`)
          .eq("family_id", familyId)
          .eq("is_archived", false)
          .order("created_at", { ascending: true });
        if (fallback.error) {
          setAccounts([]);
          setIsLoadingAccounts(false);
          return;
        }
        const normalized = (fallback.data ?? []).map((account) => ({
          ...account,
          is_archived: account.is_archived ?? false,
          icon_key: null,
          icon_bg: null,
          icon_color: null,
        }));
        setAccounts(normalized);
        setIsLoadingAccounts(false);
        return;
      }
      setAccounts([]);
      setIsLoadingAccounts(false);
      return;
    }

    const normalized = (data ?? []).map((account) => ({
      ...account,
      is_archived: account.is_archived ?? false,
      icon_key: account.icon_key ?? null,
      icon_bg: account.icon_bg ?? null,
      icon_color: account.icon_color ?? null,
    }));
    setAccounts(normalized);
    setIsLoadingAccounts(false);
  };

  const loadArchivedAccounts = async (familyId: string) => {
    setIsLoadingArchivedAccounts(true);
    const baseSelectLegacy =
      "id, family_id, name, account_type, currency, visibility, owner_user_id, opening_balance, created_at";
    const baseSelect = `${baseSelectLegacy}, icon_key, icon_bg, icon_color`;
    const selectWithArchive = `${baseSelect}, is_archived`;
    const { data, error } = await supabase
      .from("accounts")
      .select(selectWithArchive)
      .eq("family_id", familyId)
      .eq("is_archived", true)
      .order("created_at", { ascending: true });

    if (error) {
      if (error.message?.includes("is_archived")) {
        setArchivedAccounts([]);
        setIsLoadingArchivedAccounts(false);
        return;
      }
      if (error.message?.includes("icon_")) {
        const fallback = await supabase
          .from("accounts")
          .select(`${baseSelectLegacy}, is_archived`)
          .eq("family_id", familyId)
          .eq("is_archived", true)
          .order("created_at", { ascending: true });
        if (fallback.error) {
          setArchivedAccounts([]);
          setIsLoadingArchivedAccounts(false);
          return;
        }
        const normalized = (fallback.data ?? []).map((account) => ({
          ...account,
          is_archived: account.is_archived ?? true,
          icon_key: null,
          icon_bg: null,
          icon_color: null,
        }));
        setArchivedAccounts(normalized);
        setIsLoadingArchivedAccounts(false);
        return;
      }
      setArchivedAccounts([]);
      setIsLoadingArchivedAccounts(false);
      return;
    }

    const normalized = (data ?? []).map((account) => ({
      ...account,
      is_archived: account.is_archived ?? true,
      icon_key: account.icon_key ?? null,
      icon_bg: account.icon_bg ?? null,
      icon_color: account.icon_color ?? null,
    }));
    setArchivedAccounts(normalized);
    setIsLoadingArchivedAccounts(false);
  };

  const loadCategories = async (familyId: string) => {
    setIsLoadingCategories(true);
    const baseSelect =
      "id, name, category_type, parent_id, icon_key, icon_bg, icon_color, created_at";
    const selectWithArchive = `${baseSelect}, is_archived`;
    const { data, error } = await supabase
      .from("categories")
      .select(selectWithArchive)
      .eq("family_id", familyId)
      .eq("is_archived", false)
      .order("created_at", { ascending: true });

    if (error) {
      if (error.message?.includes("is_archived")) {
        const fallback = await supabase
          .from("categories")
          .select(baseSelect)
          .eq("family_id", familyId)
          .order("created_at", { ascending: true });
        if (fallback.error) {
          setCategories([]);
          setIsLoadingCategories(false);
          return;
        }
        const normalized = (fallback.data ?? []).map((category) => ({
          ...category,
          is_archived: false,
          parent_id: category.parent_id ?? null,
          icon_key: category.icon_key ?? null,
          icon_bg: category.icon_bg ?? null,
          icon_color: category.icon_color ?? null,
        }));
        setCategories(normalized);
        setIsLoadingCategories(false);
        return;
      }
      if (
        error.message?.includes("parent_id") ||
        error.message?.includes("icon_")
      ) {
        const fallback = await supabase
          .from("categories")
          .select(`id, name, category_type, created_at, is_archived`)
          .eq("family_id", familyId)
          .eq("is_archived", false)
          .order("created_at", { ascending: true });
        if (fallback.error) {
          setCategories([]);
          setIsLoadingCategories(false);
          return;
        }
        const normalized = (fallback.data ?? []).map((category) => ({
          ...category,
          is_archived: category.is_archived ?? false,
          parent_id: null,
          icon_key: null,
          icon_bg: null,
          icon_color: null,
        }));
        setCategories(normalized);
        setIsLoadingCategories(false);
        return;
      }
      setCategories([]);
      setIsLoadingCategories(false);
      return;
    }

    const normalized = (data ?? []).map((category) => ({
      ...category,
      is_archived: category.is_archived ?? false,
      parent_id: category.parent_id ?? null,
      icon_key: category.icon_key ?? null,
      icon_bg: category.icon_bg ?? null,
      icon_color: category.icon_color ?? null,
    }));
    setCategories(normalized);
    setIsLoadingCategories(false);
  };

  const loadArchivedCategories = async (familyId: string) => {
    setIsLoadingArchivedCategories(true);
    const baseSelect =
      "id, name, category_type, parent_id, icon_key, icon_bg, icon_color, created_at";
    const selectWithArchive = `${baseSelect}, is_archived`;
    const { data, error } = await supabase
      .from("categories")
      .select(selectWithArchive)
      .eq("family_id", familyId)
      .eq("is_archived", true)
      .order("created_at", { ascending: true });

    if (error) {
      if (error.message?.includes("is_archived")) {
        setArchivedCategories([]);
        setIsLoadingArchivedCategories(false);
        return;
      }
      if (
        error.message?.includes("parent_id") ||
        error.message?.includes("icon_")
      ) {
        const fallback = await supabase
          .from("categories")
          .select(`id, name, category_type, created_at, is_archived`)
          .eq("family_id", familyId)
          .eq("is_archived", true)
          .order("created_at", { ascending: true });
        if (fallback.error) {
          setArchivedCategories([]);
          setIsLoadingArchivedCategories(false);
          return;
        }
        const normalized = (fallback.data ?? []).map((category) => ({
          ...category,
          is_archived: category.is_archived ?? true,
          parent_id: null,
          icon_key: null,
          icon_bg: null,
          icon_color: null,
        }));
        setArchivedCategories(normalized);
        setIsLoadingArchivedCategories(false);
        return;
      }
      setArchivedCategories([]);
      setIsLoadingArchivedCategories(false);
      return;
    }

    const normalized = (data ?? []).map((category) => ({
      ...category,
      is_archived: category.is_archived ?? true,
      parent_id: category.parent_id ?? null,
      icon_key: category.icon_key ?? null,
      icon_bg: category.icon_bg ?? null,
      icon_color: category.icon_color ?? null,
    }));
    setArchivedCategories(normalized);
    setIsLoadingArchivedCategories(false);
  };

  const loadTransactions = async (
    accountIds: string[],
    limit: number,
    filters: {
      accountId?: string;
      categoryId?: string;
      startDate?: string;
      endDate?: string;
    },
  ) => {
    setIsLoadingTransactions(true);

    if (accountIds.length === 0) {
      setTransactions([]);
      setTransactionsTotal(0);
      setIsLoadingTransactions(false);
      return;
    }

    let query = supabase
      .from("transactions")
      .select(
        "id, amount, description, posted_at, created_at, source, external_id, account:accounts(id, name), category:categories(id, name, category_type)",
        { count: "exact" },
      )
      .in("account_id", accountIds)
      .order("posted_at", { ascending: false })
      .order("created_at", { ascending: false })
      .range(0, Math.max(limit - 1, 0));

    if (filters.accountId) {
      query = query.eq("account_id", filters.accountId);
    }

    if (filters.categoryId) {
      query = query.eq("category_id", filters.categoryId);
    }

    if (filters.startDate) {
      query = query.gte("posted_at", filters.startDate);
    }

    if (filters.endDate) {
      query = query.lte("posted_at", filters.endDate);
    }

    const { data, error, count } = await query;

    if (error) {
      setTransactions([]);
      setTransactionsTotal(null);
      setIsLoadingTransactions(false);
      return;
    }

    setTransactions(
      (data ?? []).map((item) => ({
        id: item.id,
        amount: item.amount,
        description: item.description,
        posted_at: item.posted_at,
        created_at: item.created_at,
        source: item.source,
        external_id: item.external_id,
        account: item.account
          ? { id: item.account.id, name: item.account.name }
          : null,
        category: item.category
          ? {
              id: item.category.id,
              name: item.category.name,
              category_type: item.category.category_type,
            }
          : null,
      })),
    );
    setTransactionsTotal(count ?? null);
    setIsLoadingTransactions(false);
  };

  const loadMonthlySummary = async (
    accountIds: string[],
    range?: { startDate?: string; endDate?: string },
  ) => {
    if (accountIds.length === 0) {
      setMonthlySummary({ income: 0, expense: 0, count: 0 });
      return;
    }

    const fallback = getMonthRange(getBrazilToday().slice(0, 7));
    const startDate = range?.startDate || fallback.startDate;
    const endDate = range?.endDate || fallback.endDate;

    const { data, error } = await supabase
      .from("transactions")
      .select("amount, source, category:categories(category_type), posted_at")
      .in("account_id", accountIds)
      .gte("posted_at", startDate)
      .lte("posted_at", endDate);

    if (error) {
      setMonthlySummary({ income: 0, expense: 0, count: 0 });
      return;
    }

    let income = 0;
    let expense = 0;

    (data ?? []).forEach((item) => {
      const amountValue = Number(item.amount);
      if (!Number.isFinite(amountValue)) {
        return;
      }

      if (item.source === "adjustment") {
        if (amountValue >= 0) {
          income += amountValue;
        } else {
          expense += Math.abs(amountValue);
        }
        return;
      }

      if (item.category?.category_type === "income") {
        income += amountValue;
      } else if (item.category?.category_type === "expense") {
        expense += amountValue;
      }
    });

    setMonthlySummary({ income, expense, count: data?.length ?? 0 });
  };

  const loadAccountBalances = async (
    accountIds: string[],
    range?: { startDate?: string; endDate?: string },
    openingBalances?: Record<string, number>,
  ) => {
    if (accountIds.length === 0) {
      setAccountBalances({});
      return;
    }

    setIsLoadingBalances(true);
    const startDate = range?.startDate ?? "";
    const endDate = range?.endDate ?? "";
    let query = supabase
      .from("transactions")
      .select("account_id, amount, source, category:categories(category_type)");

    if (accountIds.length > 0) {
      query = query.in("account_id", accountIds);
    }

    if (startDate) {
      query = query.gte("posted_at", startDate);
    }

    if (endDate) {
      query = query.lte("posted_at", endDate);
    }

    const { data, error } = await query;

    if (error) {
      setAccountBalances({});
      setIsLoadingBalances(false);
      return;
    }

    const balances = accountIds.reduce<Record<string, number>>((acc, id) => {
      acc[id] = openingBalances?.[id] ?? 0;
      return acc;
    }, {});

    (data ?? []).forEach((item) => {
      const amountValue = Number(item.amount);
      if (!Number.isFinite(amountValue)) {
        return;
      }

      let delta = 0;
      if (item.source === "adjustment") {
        delta = amountValue;
      } else if (item.source === "transfer") {
        delta = amountValue;
      } else if (item.category?.category_type === "income") {
        delta = amountValue;
      } else if (item.category?.category_type === "expense") {
        delta = -amountValue;
      }

      const accountId = item.account_id as string;
      if (accountId && accountId in balances) {
        balances[accountId] += delta;
      }
    });

    setAccountBalances(balances);
    setIsLoadingBalances(false);
  };

  useEffect(() => {
    if (!session?.user.id) {
      setMemberships([]);
      return;
    }

    if (!session.access_token) {
      setMemberships([]);
      return;
    }

    loadMemberships(session.user.id);
  }, [session?.access_token, session?.user.id]);

  useEffect(() => {
    if (memberships.length === 0) {
      setActiveFamilyId(null);
      return;
    }

    const nextFamilyId = memberships[0]?.family?.id ?? null;
    setActiveFamilyId((current) =>
      current === nextFamilyId ? current : nextFamilyId,
    );
  }, [memberships]);

  useEffect(() => {
    const { startDate, endDate } = getMonthRange(activeMonth);
    if (!startDate || !endDate) {
      return;
    }
    setFilterStartDate(startDate);
    setFilterEndDate(endDate);
  }, [activeMonth]);

  useEffect(() => {
    if (!activeFamilyId || !session?.access_token) {
      setAccounts([]);
      setCategories([]);
      setArchivedCategories([]);
      setTransactions([]);
      setArchivedAccounts([]);
      return;
    }

    loadAccounts(activeFamilyId);
    loadCategories(activeFamilyId);
  }, [activeFamilyId, session?.access_token]);

  useEffect(() => {
    if (!showArchivedAccounts || !activeFamilyId || !session?.access_token) {
      return;
    }
    loadArchivedAccounts(activeFamilyId);
  }, [showArchivedAccounts, activeFamilyId, session?.access_token]);

  useEffect(() => {
    if (!activeFamilyId || !session?.access_token) {
      return;
    }
    loadArchivedCategories(activeFamilyId);
  }, [activeFamilyId, session?.access_token]);

  useEffect(() => {
    if (!activeFamilyId || !session?.access_token) {
      setTransactions([]);
      setTransactionsTotal(null);
      return;
    }

    if (accounts.length === 0) {
      setTransactions([]);
      setTransactionsTotal(null);
      return;
    }

    const monthRange = getMonthRange(activeMonth);
    const isTransactionsScreen = activeView === "transactions";

    loadTransactions(accounts.map((account) => account.id), transactionsLimit, {
      accountId: filterAccountId || undefined,
      categoryId: filterCategoryId || undefined,
      startDate:
        (isTransactionsScreen ? filterStartDate : monthRange.startDate) ||
        undefined,
      endDate:
        (isTransactionsScreen ? filterEndDate : monthRange.endDate) || undefined,
    });
    loadMonthlySummary(accounts.map((account) => account.id), {
      startDate: monthRange.startDate || undefined,
      endDate: monthRange.endDate || undefined,
    });
    const openingBalances = accounts.reduce<Record<string, number>>((acc, account) => {
      const rawValue = Number(account.opening_balance ?? 0);
      acc[account.id] = Number.isFinite(rawValue) ? rawValue : 0;
      return acc;
    }, {});
    loadAccountBalances(
      accounts.map((account) => account.id),
      { endDate: monthRange.endDate || undefined },
      openingBalances,
    );
  }, [
    accounts,
    activeFamilyId,
    session?.access_token,
    transactionsLimit,
    filterAccountId,
    filterCategoryId,
    filterStartDate,
    filterEndDate,
    activeMonth,
    activeView,
    dataRefreshCounter,
  ]);

  useEffect(() => {
    if (activeView !== "dashboard") {
      return;
    }
    if (!activeFamilyId || !session?.access_token) {
      setDashboardExpenseData([]);
      setDashboardIncomeData([]);
      setDashboardCashflowPoints([]);
      return;
    }
    if (accounts.length === 0) {
      setDashboardExpenseData([]);
      setDashboardIncomeData([]);
      setDashboardCashflowPoints([]);
      return;
    }

    const monthRange = getMonthRange(activeMonth);
    if (!monthRange.startDate || !monthRange.endDate) {
      return;
    }

    let cancelled = false;
    const loadAnalytics = async () => {
      setIsLoadingDashboardAnalytics(true);

      const accountIds = accounts.map((account) => account.id);
      const { data, error } = await supabase
        .from("transactions")
        .select(
          "amount, source, posted_at, category:categories(id, name, category_type, parent_id, icon_bg, icon_color)",
        )
        .in("account_id", accountIds)
        .gte("posted_at", monthRange.startDate)
        .lte("posted_at", monthRange.endDate)
        .order("posted_at", { ascending: true })
        .order("created_at", { ascending: true })
        .range(0, 4999);

      if (cancelled) {
        return;
      }

      if (error) {
        setDashboardExpenseData([]);
        setDashboardIncomeData([]);
        setDashboardCashflowPoints([]);
        setIsLoadingDashboardAnalytics(false);
        return;
      }

      const hslToHex = (hue: number, saturation: number, lightness: number) => {
        const s = saturation / 100;
        const l = lightness / 100;
        const c = (1 - Math.abs(2 * l - 1)) * s;
        const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
        const m = l - c / 2;
        let r = 0;
        let g = 0;
        let b = 0;
        if (hue < 60) {
          r = c;
          g = x;
        } else if (hue < 120) {
          r = x;
          g = c;
        } else if (hue < 180) {
          g = c;
          b = x;
        } else if (hue < 240) {
          g = x;
          b = c;
        } else if (hue < 300) {
          r = x;
          b = c;
        } else {
          r = c;
          b = x;
        }
        const toByte = (value: number) =>
          Math.round((value + m) * 255)
            .toString(16)
            .padStart(2, "0");
        return `#${toByte(r)}${toByte(g)}${toByte(b)}`.toUpperCase();
      };

      const stableColorForId = (id: string) => {
        let hash = 0;
        for (let index = 0; index < id.length; index += 1) {
          hash = (hash * 31 + id.charCodeAt(index)) >>> 0;
        }
        const hue = hash % 360;
        return hslToHex(hue, 72, 48);
      };

      const pickColor = (
        id: string,
        bg?: string | null,
        color?: string | null,
      ) => {
        if (bg && bg !== DEFAULT_CATEGORY_ICON_BG) {
          return bg;
        }
        if (color && color !== DEFAULT_CATEGORY_ICON_COLOR) {
          return color;
        }
        return stableColorForId(id);
      };

      const expenseMap = new Map<string, DashboardCategoryDatum>();
      const incomeMap = new Map<string, DashboardCategoryDatum>();
      const dailyNet = new Map<string, number>();

      const addDaily = (date: string, delta: number) => {
        if (!Number.isFinite(delta)) {
          return;
        }
        dailyNet.set(date, (dailyNet.get(date) ?? 0) + delta);
      };

      (data ?? []).forEach((row) => {
        const amountValue = Number(row.amount);
        if (!Number.isFinite(amountValue)) {
          return;
        }

        const postedAt = typeof row.posted_at === "string" ? row.posted_at : "";
        const dayKey = postedAt
          ? isDateOnly(postedAt)
            ? postedAt
            : toBrazilDateKey(postedAt)
          : monthRange.startDate;

        if (row.source === "transfer") {
          return;
        }

        if (row.source === "adjustment") {
          addDaily(dayKey, amountValue);
          return;
        }

        const category = row.category as
          | {
              id: string;
              name: string;
              category_type: string;
              parent_id?: string | null;
              icon_bg?: string | null;
              icon_color?: string | null;
            }
          | null;

        if (!category || !category.id) {
          return;
        }

        const categoryEntry = categories.find((item) => item.id === category.id);
        const parentId = categoryEntry?.parent_id ?? null;
        const parentName = parentId
          ? categories.find((item) => item.id === parentId)?.name ?? ""
          : "";
        const label = parentName
          ? `${parentName} / ${category.name}`
          : category.name;
        const color = pickColor(
          category.id,
          category.icon_bg ?? null,
          category.icon_color ?? null,
        );

        if (category.category_type === "income") {
          incomeMap.set(category.id, {
            id: category.id,
            label,
            color,
            value: (incomeMap.get(category.id)?.value ?? 0) + amountValue,
          });
          addDaily(dayKey, amountValue);
        } else if (category.category_type === "expense") {
          expenseMap.set(category.id, {
            id: category.id,
            label,
            color,
            value: (expenseMap.get(category.id)?.value ?? 0) + amountValue,
          });
          addDaily(dayKey, -amountValue);
        }
      });

      const expenseSegments = buildDonutSegments(Array.from(expenseMap.values()));
      const incomeSegments = buildDonutSegments(Array.from(incomeMap.values()));

      const dayPoints: DashboardCashflowPoint[] = [];
      let cursor = monthRange.startDate;
      let running = 0;
      while (cursor <= monthRange.endDate) {
        running += dailyNet.get(cursor) ?? 0;
        dayPoints.push({ date: cursor, value: running });
        cursor = addDaysToBrazilDate(cursor, 1);
      }

      setDashboardExpenseData(expenseSegments);
      setDashboardIncomeData(incomeSegments);
      setDashboardCashflowPoints(dayPoints);
      setIsLoadingDashboardAnalytics(false);
    };

    void loadAnalytics();
    return () => {
      cancelled = true;
    };
  }, [
    accounts,
    categories,
    activeFamilyId,
    activeMonth,
    activeView,
    session?.access_token,
    dataRefreshCounter,
  ]);

  useEffect(() => {
    setTransactionsLimit(activeView === "transfers" ? 50 : 8);
  }, [
    filterAccountId,
    filterCategoryId,
    filterStartDate,
    filterEndDate,
    activeFamilyId,
    activeView,
  ]);

  useEffect(() => {
    if (activeView === "transactions") {
      return;
    }
    setFilterAccountId("");
    setFilterCategoryId("");
    setSearchQuery("");
    setTypeFilters([...typeFilterAll]);
  }, [activeView]);

  useEffect(() => {
    if (activeView === "transfers") {
      return;
    }
    setTransferFromAccountId("");
    setTransferToAccountId("");
    setTransferSearch("");
    setTransferMinAmount("");
    setTransferMaxAmount("");
  }, [activeView]);

  useEffect(() => {
    if (!activeFamilyId) {
      setTransactionAccountId("");
      setTransactionDestinationAccountId("");
      setTransactionCategoryId("");
      setFilterAccountId("");
      setFilterCategoryId("");
      setFilterStartDate("");
      setFilterEndDate("");
      setSearchQuery("");
      setTypeFilters([...typeFilterAll]);
      setTransferFromAccountId("");
      setTransferToAccountId("");
      setTransferSearch("");
      setTransferMinAmount("");
      setTransferMaxAmount("");
      setTransactionsLimit(activeView === "transfers" ? 50 : 8);
      return;
    }

    if (!filterStartDate || !filterEndDate) {
      const { startDate, endDate } = getMonthRange(activeMonth);
      if (startDate && endDate) {
        setFilterStartDate(startDate);
        setFilterEndDate(endDate);
      }
    }

    if (!accounts.some((account) => account.id === transactionAccountId)) {
      setTransactionAccountId("");
    }

    if (
      transactionDestinationAccountId &&
      !accounts.some((account) => account.id === transactionDestinationAccountId)
    ) {
      setTransactionDestinationAccountId("");
    }
    if (
      transactionDestinationAccountId &&
      transactionDestinationAccountId === transactionAccountId
    ) {
      setTransactionDestinationAccountId("");
    }

    if (!categories.some((category) => category.id === transactionCategoryId)) {
      setTransactionCategoryId("");
    }

    if (!accounts.some((account) => account.id === filterAccountId)) {
      setFilterAccountId("");
    }

    if (
      ![...categories, ...archivedCategories].some(
        (category) => category.id === filterCategoryId,
      )
    ) {
      setFilterCategoryId("");
    }

    if (!accounts.some((account) => account.id === transferFromAccountId)) {
      setTransferFromAccountId("");
    }

    if (!accounts.some((account) => account.id === transferToAccountId)) {
      setTransferToAccountId("");
    }
  }, [
    accounts,
    categories,
    archivedCategories,
    activeFamilyId,
    transactionAccountId,
    transactionDestinationAccountId,
    transactionCategoryId,
    filterAccountId,
    filterCategoryId,
    transferFromAccountId,
    transferToAccountId,
    filterStartDate,
    filterEndDate,
    activeMonth,
    activeView,
  ]);

  useEffect(() => {
    if (!isTransactionModalOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (isCalendarOpen) {
          setIsCalendarOpen(false);
          return;
        }
        setIsTransactionModalOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isTransactionModalOpen, isCalendarOpen]);

  useEffect(() => {
    if (!isTransactionModalOpen) {
      setIsCalendarOpen(false);
    }
  }, [isTransactionModalOpen]);

  useEffect(() => {
    if (!isAccountModalOpen) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsAccountModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isAccountModalOpen]);

  useEffect(() => {
    if (!isCategoryModalOpen) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsCategoryModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCategoryModalOpen]);

  useEffect(() => {
    if (!openAccountMenuId) {
      return;
    }
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target?.closest?.(`[data-account-menu-id="${openAccountMenuId}"]`)
      ) {
        return;
      }
      setOpenAccountMenuId(null);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [openAccountMenuId]);

  useEffect(() => {
    if (!openAccountMenuId || accountTxnCounts[openAccountMenuId] !== undefined) {
      return;
    }
    if (!session?.access_token) {
      return;
    }
    const loadCount = async () => {
      const { count, error } = await supabase
        .from("transactions")
        .select("id", { count: "exact", head: true })
        .eq("account_id", openAccountMenuId);
      if (error) {
        return;
      }
      setAccountTxnCounts((prev) => ({
        ...prev,
        [openAccountMenuId]: count ?? 0,
      }));
    };
    void loadCount();
  }, [accountTxnCounts, openAccountMenuId, session?.access_token]);

  useEffect(() => {
    if (!isBalanceAdjustOpen) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsBalanceAdjustOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isBalanceAdjustOpen]);

  useEffect(() => {
    setAccountTxnCounts({});
  }, [transactions]);

  useEffect(() => {
    if (!isFilterCalendarOpen) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsFilterCalendarOpen(false);
        setFilterCalendarTarget(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFilterCalendarOpen]);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await supabase.auth.signOut();
    setIsSigningOut(false);
  };

  const parseCurrencyInput = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    const normalized = trimmed
      .replace(/[^\d,.-]/g, "")
      .replace(/\./g, "")
      .replace(",", ".");
    const parsedValue = Number(normalized);
    return Number.isFinite(parsedValue) ? parsedValue : Number.NaN;
  };
  const isBalanceAdjustCategory = (name?: string | null) =>
    name?.trim().toLowerCase().startsWith("ajuste de saldo");

  const getAccountTransactionCount = async (accountId: string) => {
    if (accountTxnCounts[accountId] !== undefined) {
      return accountTxnCounts[accountId];
    }
    if (!session?.access_token) {
      return null;
    }
    const { count, error } = await supabase
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .eq("account_id", accountId);
    if (error) {
      return null;
    }
    const normalizedCount = count ?? 0;
    setAccountTxnCounts((prev) => ({ ...prev, [accountId]: normalizedCount }));
    return normalizedCount;
  };

  const getAccountBalanceForArchive = async (account: (typeof accounts)[number]) => {
    if (!session?.access_token) {
      return null;
    }
    const { data, error } = await supabase
      .from("transactions")
      .select("amount, source, category:categories(category_type)")
      .eq("account_id", account.id);
    if (error) {
      return null;
    }
    let balance = Number(account.opening_balance ?? 0);
    (data ?? []).forEach((item) => {
      const amountValue = Number(item.amount);
      if (!Number.isFinite(amountValue)) {
        return;
      }
      let delta = 0;
      if (item.source === "transfer") {
        delta = amountValue;
      } else if (item.category?.category_type === "income") {
        delta = amountValue;
      } else if (item.category?.category_type === "expense") {
        delta = -amountValue;
      }
      balance += delta;
    });
    return balance;
  };

  const handleLogoClick = () => {
    setActiveView("dashboard");
    setIsMobileMenuOpen(false);
  };

  const closeAccountModal = () => {
    setIsAccountModalOpen(false);
    setIsEditingAccount(false);
    setEditingAccountId(null);
    setBankLogoSearch("");
  };

  const openAccountModal = () => {
    setAccountError(null);
    setIsEditingAccount(false);
    setEditingAccountId(null);
    setAccountName("");
    setAccountType("checking");
    setAccountVisibility("shared");
    setAccountOpeningBalance("");
    setAccountIconKey("initials");
    setAccountIconBg(DEFAULT_ACCOUNT_ICON_BG);
    setAccountIconColor(DEFAULT_ACCOUNT_ICON_COLOR);
    setBankLogoSearch("");
    setIsAccountModalOpen(true);
  };

  const openAccountEditor = (account: (typeof accounts)[number]) => {
    setAccountError(null);
    setIsEditingAccount(true);
    setEditingAccountId(account.id);
    setAccountName(account.name);
    setAccountType(account.account_type);
    setAccountVisibility(account.visibility);
    setAccountOpeningBalance(
      account.opening_balance !== null && Number.isFinite(account.opening_balance)
        ? String(account.opening_balance).replace(".", ",")
        : "",
    );
    setAccountIconKey(account.icon_key ?? "initials");
    setAccountIconBg(account.icon_bg ?? DEFAULT_ACCOUNT_ICON_BG);
    setAccountIconColor(account.icon_color ?? DEFAULT_ACCOUNT_ICON_COLOR);
    setBankLogoSearch("");
    setIsAccountModalOpen(true);
  };

  const closeCategoryModal = () => {
    setIsCategoryModalOpen(false);
    setIsEditingCategory(false);
    setEditingCategoryId(null);
    setCategoryError(null);
  };

  const openCategoryModal = (defaults?: {
    type?: "expense" | "income";
    parentId?: string | null;
  }) => {
    setCategoryError(null);
    setCategoryActionError(null);
    setIsEditingCategory(false);
    setEditingCategoryId(null);
    setCategoryName("");
    const parentId = defaults?.parentId ?? "";
    const parentCategory = parentId
      ? categories.find((category) => category.id === parentId)
      : null;
    const resolvedType =
      parentCategory?.category_type ?? defaults?.type ?? categoryViewType;
    setCategoryType(resolvedType);
    setCategoryParentId(parentId);
    setCategoryIconKey("tag");
    setCategoryIconBg(DEFAULT_CATEGORY_ICON_BG);
    setCategoryIconColor(DEFAULT_CATEGORY_ICON_COLOR);
    setIsCategoryModalOpen(true);
  };

  const openCategoryEditor = (category: (typeof categories)[number]) => {
    setCategoryError(null);
    setCategoryActionError(null);
    setIsEditingCategory(true);
    setEditingCategoryId(category.id);
    setCategoryName(category.name);
    setCategoryType(category.category_type);
    setCategoryParentId(category.parent_id ?? "");
    setCategoryIconKey(category.icon_key ?? "tag");
    setCategoryIconBg(category.icon_bg ?? DEFAULT_CATEGORY_ICON_BG);
    setCategoryIconColor(category.icon_color ?? DEFAULT_CATEGORY_ICON_COLOR);
    setIsCategoryModalOpen(true);
  };

  const closeBalanceAdjust = () => {
    setIsBalanceAdjustOpen(false);
    setBalanceAdjustAccountId(null);
    setBalanceAdjustTarget("");
    setBalanceAdjustMethod("transaction");
    setBalanceAdjustCategoryId("");
    setBalanceAdjustError(null);
  };

  const openBalanceAdjust = (accountId: string) => {
    setBalanceAdjustAccountId(accountId);
    setBalanceAdjustTarget("");
    setBalanceAdjustMethod("transaction");
    setBalanceAdjustCategoryId("");
    setBalanceAdjustError(null);
    setIsBalanceAdjustOpen(true);
  };

  const handleDeleteAccount = async (account: (typeof accounts)[number]) => {
    setAccountActionError(null);
    if (!session?.access_token || !activeFamilyId) {
      setAccountActionError("Selecione uma família ativa.");
      return;
    }
    setAccountActionLoadingId(account.id);
    const transactionCount = await getAccountTransactionCount(account.id);
    if (transactionCount === null) {
      setAccountActionError("Nao foi possivel verificar os lancamentos.");
      setAccountActionLoadingId(null);
      return;
    }
    if (transactionCount > 0) {
      setAccountActionError(
        "Conta possui lancamentos. Para manter o historico, arquive com saldo zerado.",
      );
      setAccountActionLoadingId(null);
      return;
    }
    if (!window.confirm(`Excluir a conta "${account.name}"?`)) {
      setAccountActionLoadingId(null);
      return;
    }
    const { error } = await supabase
      .from("accounts")
      .delete()
      .eq("id", account.id);
    if (error) {
      setAccountActionError(error.message);
      setAccountActionLoadingId(null);
      return;
    }
    await loadAccounts(activeFamilyId);
    setOpenAccountMenuId(null);
    setAccountActionLoadingId(null);
  };

  const handleArchiveAccount = async (account: (typeof accounts)[number]) => {
    setAccountActionError(null);
    if (!session?.access_token || !activeFamilyId) {
      setAccountActionError("Selecione uma família ativa.");
      return;
    }
    setAccountActionLoadingId(account.id);
    const currentBalance = await getAccountBalanceForArchive(account);
    if (currentBalance === null) {
      setAccountActionError("Nao foi possivel verificar o saldo da conta.");
      setAccountActionLoadingId(null);
      return;
    }
    if (Math.abs(currentBalance) > 0.009) {
      setAccountActionError(
        `Para arquivar, o saldo precisa estar zerado. Saldo atual: ${currencyFormatter.format(
          currentBalance,
        )}`,
      );
      setAccountActionLoadingId(null);
      return;
    }
    if (!window.confirm(`Arquivar a conta "${account.name}"?`)) {
      setAccountActionLoadingId(null);
      return;
    }
    const { error } = await supabase
      .from("accounts")
      .update({ is_archived: true })
      .eq("id", account.id);
    if (error) {
      setAccountActionError(error.message);
      setAccountActionLoadingId(null);
      return;
    }
    await loadAccounts(activeFamilyId);
    if (showArchivedAccounts) {
      await loadArchivedAccounts(activeFamilyId);
    }
    setOpenAccountMenuId(null);
    setAccountActionLoadingId(null);
  };

  const handleUnarchiveAccount = async (
    account: (typeof archivedAccounts)[number],
  ) => {
    setAccountActionError(null);
    if (!session?.access_token || !activeFamilyId) {
      setAccountActionError("Selecione uma família ativa.");
      return;
    }
    setAccountActionLoadingId(account.id);
    const { error } = await supabase
      .from("accounts")
      .update({ is_archived: false })
      .eq("id", account.id);
    if (error) {
      setAccountActionError(error.message);
      setAccountActionLoadingId(null);
      return;
    }
    await loadAccounts(activeFamilyId);
    if (showArchivedAccounts) {
      await loadArchivedAccounts(activeFamilyId);
    }
    setAccountActionLoadingId(null);
  };

	  const openTransactionModal = (
	    nextType: string = "expense",
	    accountId?: string,
	  ) => {
	    setTransactionError(null);
	    setTransactionDestinationAccountId("");
	    setTransactionCategoryId("");
	    setTransactionType(nextType);
	    setTransactionTime("");
	    if (accountId) {
	      setTransactionAccountId(accountId);
	    }
	    setDatePreset("today");
    const today = getBrazilToday();
    setTransactionDate(today);
    setCalendarTempDate(today);
    setIsTransactionModalOpen(true);
  };

  const openAccountTransactions = (accountId: string) => {
    setActiveView("transactions");
    setFilterAccountId(accountId);
    setIsMobileMenuOpen(false);
  };

  const openAccountStatement = (accountId: string) => {
    setStatementUseMonthRange(true);
    resetStatementDateRange();
    setStatementAccountId(accountId);
    setActiveView("statement");
    setIsMobileMenuOpen(false);
  };

  const handleCreateFamily = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreateError(null);

    if (!session) {
      setCreateError("Voce precisa estar logado.");
      return;
    }

    if (!session.access_token || !session.refresh_token) {
      setCreateError("Sessão invalida. Saia e entre novamente.");
      return;
    }

    const trimmedName = familyName.trim();
    if (trimmedName.length < 2) {
      setCreateError("Informe um nome para a família.");
      return;
    }

    setIsCreatingFamily(true);
    const { data: family, error: familyError } = await supabase
      .from("families")
      .insert({ name: trimmedName })
      .select("id, name, created_at")
      .single();

    if (familyError || !family) {
      setCreateError(familyError?.message ?? "Falha ao criar família.");
      setIsCreatingFamily(false);
      return;
    }

    const { error: membershipError } = await supabase.from("memberships").insert({
      family_id: family.id,
      user_id: session.user.id,
      role: "owner",
    });

    if (membershipError) {
      setCreateError(membershipError.message);
      setIsCreatingFamily(false);
      return;
    }

    setFamilyName("");
    setActiveFamilyId(family.id);
    await loadMemberships(session.user.id);
    setIsCreatingFamily(false);
  };

  const applyDatePreset = (preset: "today" | "yesterday" | "custom") => {
    setDatePreset(preset);
    if (preset === "custom") {
      const customDateParts = getDateParts(transactionDate);
      if (customDateParts) {
        setCalendarMonth(customDateParts.monthIndex);
        setCalendarYear(customDateParts.year);
      }
      setCalendarTempDate(transactionDate);
      setIsCalendarOpen(true);
      return;
    }
    const today = getBrazilToday();
    const nextDate =
      preset === "yesterday" ? addDaysToBrazilDate(today, -1) : today;
    setTransactionDate(nextDate);
    setCalendarTempDate(nextDate);
    setIsCalendarOpen(false);
  };

  const openCalendarPicker = () => {
    const customDateParts = getDateParts(transactionDate);
    if (customDateParts) {
      setCalendarMonth(customDateParts.monthIndex);
      setCalendarYear(customDateParts.year);
    }
    setCalendarTempDate(transactionDate);
    setIsCalendarOpen(true);
  };

  const resetFilterDateRange = () => {
    const { startDate, endDate } = getMonthRange(activeMonth);
    if (!startDate || !endDate) {
      return;
    }
    setFilterStartDate(startDate);
    setFilterEndDate(endDate);
  };

  const resetStatementDateRange = () => {
    const { startDate, endDate } = getMonthRange(activeMonth);
    if (!startDate || !endDate) {
      return;
    }
    setStatementUseMonthRange(true);
    setStatementStartDate(startDate);
    setStatementEndDate(endDate);
  };

  const handleStatementStartDateChange = (value: string) => {
    if (!value) {
      resetStatementDateRange();
      return;
    }
    setStatementUseMonthRange(false);
    setStatementStartDate(value);
    if (statementEndDate && value > statementEndDate) {
      setStatementEndDate(value);
    }
  };

  const handleStatementEndDateChange = (value: string) => {
    if (!value) {
      resetStatementDateRange();
      return;
    }
    setStatementUseMonthRange(false);
    setStatementEndDate(value);
    if (statementStartDate && value < statementStartDate) {
      setStatementStartDate(value);
    }
  };

  const handleFilterStartDateChange = (value: string) => {
    if (!value) {
      resetFilterDateRange();
      return;
    }
    setFilterStartDate(value);
    if (filterEndDate && value > filterEndDate) {
      setFilterEndDate(value);
    }
  };

  const handleFilterEndDateChange = (value: string) => {
    if (!value) {
      resetFilterDateRange();
      return;
    }
    setFilterEndDate(value);
    if (filterStartDate && value < filterStartDate) {
      setFilterStartDate(value);
    }
  };

  const openFilterCalendar = (
    target: "start" | "end",
    context: "transactions" | "statement" = "transactions",
  ) => {
    const { startDate, endDate } = getMonthRange(activeMonth);
    const [contextStart, contextEnd] =
      context === "statement"
        ? [statementStartDate, statementEndDate]
        : [filterStartDate, filterEndDate];
    const fallbackDate =
      target === "start"
        ? contextStart || startDate || getBrazilToday()
        : contextEnd || endDate || getBrazilToday();
    const fallbackParts = getDateParts(fallbackDate);
    if (fallbackParts) {
      setFilterCalendarMonth(fallbackParts.monthIndex);
      setFilterCalendarYear(fallbackParts.year);
    }
    setFilterCalendarTempDate(fallbackDate);
    setFilterCalendarTarget(target);
    setFilterCalendarContext(context);
    setIsFilterCalendarOpen(true);
  };

  const closeFilterCalendar = () => {
    setIsFilterCalendarOpen(false);
    setFilterCalendarTarget(null);
  };

  const applyFilterCalendar = () => {
    if (!filterCalendarTarget) {
      closeFilterCalendar();
      return;
    }
    const handler =
      filterCalendarContext === "statement"
        ? filterCalendarTarget === "start"
          ? handleStatementStartDateChange
          : handleStatementEndDateChange
        : filterCalendarTarget === "start"
          ? handleFilterStartDateChange
          : handleFilterEndDateChange;
    handler(filterCalendarTempDate);
    closeFilterCalendar();
  };

  const handleCreateAccount = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAccountError(null);

    if (!session?.access_token || !activeFamilyId) {
      setAccountError("Selecione uma família ativa.");
      return;
    }

    const trimmedName = accountName.trim();
    if (trimmedName.length < 2) {
      setAccountError("Informe o nome da conta.");
      return;
    }

    const openingBalanceValue = parseCurrencyInput(accountOpeningBalance);
    if (openingBalanceValue !== null && Number.isNaN(openingBalanceValue)) {
      setAccountError("Informe um saldo inicial válido.");
      return;
    }

    setIsCreatingAccount(true);
    const payload: Record<string, string | number | null> = {
      family_id: activeFamilyId,
      name: trimmedName,
      account_type: accountType,
      currency: "BRL",
      visibility: accountVisibility,
      owner_user_id:
        accountVisibility === "private" ? session.user.id : null,
      icon_key: accountIconKey,
      icon_bg: accountIconBg,
      icon_color: accountIconColor,
    };
    if (openingBalanceValue !== null) {
      payload.opening_balance = openingBalanceValue;
    }

    const { error: accountInsertError } = await supabase
      .from("accounts")
      .insert(payload);

    if (accountInsertError) {
      setAccountError(accountInsertError.message);
      setIsCreatingAccount(false);
      return;
    }

    setAccountName("");
    setAccountType("checking");
    setAccountVisibility("shared");
    setAccountOpeningBalance("");
    setAccountIconKey("initials");
    setAccountIconBg(DEFAULT_ACCOUNT_ICON_BG);
    setAccountIconColor(DEFAULT_ACCOUNT_ICON_COLOR);
    await loadAccounts(activeFamilyId);
    setIsCreatingAccount(false);
    closeAccountModal();
  };

  const handleUpdateAccount = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAccountError(null);

    if (!session?.access_token || !activeFamilyId || !editingAccountId) {
      setAccountError("Selecione uma família ativa.");
      return;
    }

    const trimmedName = accountName.trim();
    if (trimmedName.length < 2) {
      setAccountError("Informe o nome da conta.");
      return;
    }

    const openingBalanceValue = parseCurrencyInput(accountOpeningBalance);
    if (openingBalanceValue !== null && Number.isNaN(openingBalanceValue)) {
      setAccountError("Informe um saldo inicial válido.");
      return;
    }

    setIsCreatingAccount(true);
    const payload: Record<string, string | number | null> = {
      name: trimmedName,
      account_type: accountType,
      visibility: accountVisibility,
      owner_user_id:
        accountVisibility === "private" ? session.user.id : null,
      icon_key: accountIconKey,
      icon_bg: accountIconBg,
      icon_color: accountIconColor,
    };
    if (openingBalanceValue !== null) {
      payload.opening_balance = openingBalanceValue;
    }

    const { error: accountUpdateError } = await supabase
      .from("accounts")
      .update(payload)
      .eq("id", editingAccountId);

    if (accountUpdateError) {
      setAccountError(accountUpdateError.message);
      setIsCreatingAccount(false);
      return;
    }

    await loadAccounts(activeFamilyId);
    setIsCreatingAccount(false);
    closeAccountModal();
  };

  const handleAdjustBalance = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBalanceAdjustError(null);

    if (!session?.access_token || !balanceAdjustAccountId || !activeFamilyId) {
      setBalanceAdjustError("Selecione uma conta válida.");
      return;
    }

    const account = accounts.find((item) => item.id === balanceAdjustAccountId);
    if (!account) {
      setBalanceAdjustError("Conta não encontrada.");
      return;
    }

    const targetValue = parseCurrencyInput(balanceAdjustTarget);
    if (targetValue === null) {
      setBalanceAdjustError("Informe o saldo desejado.");
      return;
    }
    if (Number.isNaN(targetValue)) {
      setBalanceAdjustError("Informe um saldo desejado válido.");
      return;
    }

    const currentBalance = accountBalances[account.id] ?? 0;
    const difference = targetValue - currentBalance;
    if (!Number.isFinite(difference) || Math.abs(difference) < 0.01) {
      setBalanceAdjustError("O saldo desejado já está correto.");
      return;
    }

    setIsAdjustingBalance(true);

    let createdCategory = false;

    if (balanceAdjustMethod === "opening") {
      const currentOpening = Number(account.opening_balance ?? 0);
      const nextOpening = currentOpening + difference;
      const { error: updateError } = await supabase
        .from("accounts")
        .update({ opening_balance: nextOpening })
        .eq("id", account.id);
      if (updateError) {
        setBalanceAdjustError(updateError.message);
        setIsAdjustingBalance(false);
        return;
      }
    } else {
      const requiredType = difference > 0 ? "income" : "expense";
      let categoryId = balanceAdjustCategoryId;
      if (categoryId) {
        const category = categories.find((item) => item.id === categoryId);
        if (!category) {
          setBalanceAdjustError("Selecione uma categoria válida.");
          setIsAdjustingBalance(false);
          return;
        }
        const isAdjustCategory = isBalanceAdjustCategory(category.name);
        if (!isAdjustCategory && category.category_type !== requiredType) {
          setBalanceAdjustError(
            "Selecione uma categoria compatível com o tipo do ajuste.",
          );
          setIsAdjustingBalance(false);
          return;
        }
      }
      if (!categoryId) {
        const fallbackName = "Ajuste de saldo";
        const fallbackPattern = `${fallbackName}%`;
        const findExistingCategory = async () => {
          const localMatch = categories.find((item) =>
            isBalanceAdjustCategory(item.name),
          );
          if (localMatch) {
            return localMatch;
          }
          if (!account.family_id) {
            return null;
          }
          const { data, error } = await supabase
            .from("categories")
            .select("id, name, category_type")
            .eq("family_id", account.family_id)
            .ilike("name", fallbackPattern);
          if (error) {
            return null;
          }
          return data?.[0] ?? null;
        };

        const existingCategory = await findExistingCategory();
        if (existingCategory) {
          categoryId = existingCategory.id;
        } else if (account.family_id) {
          const { data: newCategory, error: categoryError } = await supabase
            .from("categories")
            .insert({
              family_id: account.family_id,
              name: fallbackName,
              category_type: requiredType,
            })
            .select("id")
            .single();
          if (categoryError || !newCategory) {
            const conflictCode =
              typeof categoryError === "object" && categoryError
                ? "code" in categoryError
                  ? categoryError.code
                  : null
                : null;
            if (conflictCode === "23505") {
              const fallbackCategory = await findExistingCategory();
              if (fallbackCategory) {
                categoryId = fallbackCategory.id;
              } else {
                setBalanceAdjustError(
                  "Categoria de ajuste ja existe, selecione-a na lista.",
                );
                setIsAdjustingBalance(false);
                return;
              }
            } else {
              setBalanceAdjustError(
                categoryError?.message ?? "Não foi possível criar a categoria.",
              );
              setIsAdjustingBalance(false);
              return;
            }
          } else {
            categoryId = newCategory.id;
            createdCategory = true;
          }
        } else {
          setBalanceAdjustError("Não foi possível identificar a família.");
          setIsAdjustingBalance(false);
          return;
        }
      }

      const amountValue = difference;
      const { error: insertError } = await supabase.from("transactions").insert({
        account_id: account.id,
        category_id: categoryId,
        amount: amountValue,
        currency: "BRL",
        description: "Ajuste de saldo",
        posted_at: getBrazilToday(),
        source: "adjustment",
      });
      if (insertError) {
        setBalanceAdjustError(insertError.message);
        setIsAdjustingBalance(false);
        return;
      }
    }

    await loadAccounts(activeFamilyId);
    if (createdCategory) {
      await loadCategories(activeFamilyId);
    }
    const monthRange = getMonthRange(activeMonth);
    const isTransactionsScreen = activeView === "transactions";
    const rangeStartDate = isTransactionsScreen
      ? filterStartDate || monthRange.startDate
      : monthRange.startDate;
    const rangeEndDate = isTransactionsScreen
      ? filterEndDate || monthRange.endDate
      : monthRange.endDate;
    await loadTransactions(accounts.map((item) => item.id), transactionsLimit, {
      accountId: filterAccountId || undefined,
      categoryId: filterCategoryId || undefined,
      startDate: rangeStartDate || undefined,
      endDate: rangeEndDate || undefined,
    });
    setIsAdjustingBalance(false);
    closeBalanceAdjust();
  };

  const handleCreateCategory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCategoryError(null);

    if (!session?.access_token || !activeFamilyId) {
      setCategoryError("Selecione uma família ativa.");
      return;
    }

    const trimmedName = categoryName.trim();
    if (trimmedName.length < 2) {
      setCategoryError("Informe o nome da categoria.");
      return;
    }

    const parentId = categoryParentId || null;
    if (parentId) {
      const parentCategory = categories.find(
        (category) => category.id === parentId,
      );
      if (!parentCategory) {
        setCategoryError("Selecione uma categoria principal válida.");
        return;
      }
      if (parentCategory.parent_id) {
        setCategoryError("Subcategoria não pode ter subcategoria.");
        return;
      }
      if (parentCategory.category_type !== categoryType) {
        setCategoryError("A subcategoria deve ter o mesmo tipo da principal.");
        return;
      }
    }

    setIsCreatingCategory(true);
    const { error: categoryInsertError } = await supabase
      .from("categories")
      .insert({
        family_id: activeFamilyId,
        name: trimmedName,
        category_type: categoryType,
        parent_id: parentId,
        icon_key: categoryIconKey,
        icon_bg: categoryIconBg,
        icon_color: categoryIconColor,
      });

    if (categoryInsertError) {
      const errorCode =
        typeof categoryInsertError === "object" && categoryInsertError
          ? "code" in categoryInsertError
            ? categoryInsertError.code
            : null
          : null;
      if (errorCode === "23505") {
        setCategoryError("Já existe uma categoria com esse nome.");
      } else {
        setCategoryError(categoryInsertError.message);
      }
      setIsCreatingCategory(false);
      return;
    }

    setCategoryName("");
    setCategoryType(categoryViewType);
    setCategoryParentId("");
    setCategoryIconKey("tag");
    setCategoryIconBg(DEFAULT_CATEGORY_ICON_BG);
    setCategoryIconColor(DEFAULT_CATEGORY_ICON_COLOR);
    await loadCategories(activeFamilyId);
    if (showArchivedCategories) {
      await loadArchivedCategories(activeFamilyId);
    }
    setIsCreatingCategory(false);
    setIsCategoryModalOpen(false);
  };

  const handleUpdateCategory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCategoryError(null);

    if (!session?.access_token || !activeFamilyId) {
      setCategoryError("Selecione uma família ativa.");
      return;
    }
    if (!editingCategoryId) {
      setCategoryError("Selecione uma categoria para editar.");
      return;
    }

    const trimmedName = categoryName.trim();
    if (trimmedName.length < 2) {
      setCategoryError("Informe o nome da categoria.");
      return;
    }

    const parentId = categoryParentId || null;
    if (parentId === editingCategoryId) {
      setCategoryError("A categoria principal não pode ser ela mesma.");
      return;
    }
    const hasChildren = categories.some(
      (category) => category.parent_id === editingCategoryId,
    );
    if (hasChildren && parentId) {
      setCategoryError("Uma categoria com subcategorias não pode virar subcategoria.");
      return;
    }
    if (parentId) {
      const parentCategory = categories.find(
        (category) => category.id === parentId,
      );
      if (!parentCategory) {
        setCategoryError("Selecione uma categoria principal válida.");
        return;
      }
      if (parentCategory.parent_id) {
        setCategoryError("Subcategoria não pode ter subcategoria.");
        return;
      }
      if (parentCategory.category_type !== categoryType) {
        setCategoryError("A subcategoria deve ter o mesmo tipo da principal.");
        return;
      }
    }

    setIsCreatingCategory(true);
    const { error } = await supabase
      .from("categories")
      .update({
        name: trimmedName,
        category_type: categoryType,
        parent_id: parentId,
        icon_key: categoryIconKey,
        icon_bg: categoryIconBg,
        icon_color: categoryIconColor,
      })
      .eq("id", editingCategoryId);

    if (error) {
      const errorCode =
        typeof error === "object" && error
          ? "code" in error
            ? error.code
            : null
          : null;
      if (errorCode === "23505") {
        setCategoryError("Já existe uma categoria com esse nome.");
      } else {
        setCategoryError(error.message);
      }
      setIsCreatingCategory(false);
      return;
    }

    await loadCategories(activeFamilyId);
    if (showArchivedCategories) {
      await loadArchivedCategories(activeFamilyId);
    }
    setIsCreatingCategory(false);
    closeCategoryModal();
  };

  const handleArchiveCategory = async (category: (typeof categories)[number]) => {
    setCategoryActionError(null);
    if (!session?.access_token || !activeFamilyId) {
      setCategoryActionError("Selecione uma família ativa.");
      return;
    }

    const label = category.parent_id
      ? "Arquivar esta subcategoria?"
      : "Arquivar esta categoria?";
    if (!window.confirm(label)) {
      return;
    }

    setCategoryActionLoadingId(category.id);
    const childIds = categories
      .filter((item) => item.parent_id === category.id)
      .map((item) => item.id);
    const idsToArchive = [category.id, ...childIds];

    const { error } = await supabase
      .from("categories")
      .update({ is_archived: true })
      .in("id", idsToArchive);

    if (error) {
      setCategoryActionError(error.message);
      setCategoryActionLoadingId(null);
      return;
    }

    await loadCategories(activeFamilyId);
    await loadArchivedCategories(activeFamilyId);
    setCategoryActionLoadingId(null);
  };

  const handleUnarchiveCategory = async (
    category: (typeof archivedCategories)[number],
  ) => {
    setCategoryActionError(null);
    if (!session?.access_token || !activeFamilyId) {
      setCategoryActionError("Selecione uma família ativa.");
      return;
    }

    setCategoryActionLoadingId(category.id);
    const childIds = archivedCategories
      .filter((item) => item.parent_id === category.id)
      .map((item) => item.id);
    const idsToRestore = [category.id, ...childIds];

    const { error } = await supabase
      .from("categories")
      .update({ is_archived: false })
      .in("id", idsToRestore);

    if (error) {
      setCategoryActionError(error.message);
      setCategoryActionLoadingId(null);
      return;
    }

    await loadCategories(activeFamilyId);
    await loadArchivedCategories(activeFamilyId);
    setCategoryActionLoadingId(null);
  };

  const handleCreateTransaction = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setTransactionError(null);

    if (!session?.access_token || !activeFamilyId) {
      setTransactionError("Selecione uma família ativa.");
      return;
    }

    if (!transactionAccountId) {
      setTransactionError("Selecione a conta.");
      return;
    }

    if (!transactionType) {
      setTransactionError("Selecione o tipo.");
      return;
    }

    if (isTransfer) {
      if (!transactionDestinationAccountId) {
        setTransactionError("Selecione a conta destino.");
        return;
      }

      if (transactionDestinationAccountId === transactionAccountId) {
        setTransactionError("A conta destino deve ser diferente.");
        return;
      }
    }

    if (!isTransfer) {
      if (!transactionCategoryId) {
        setTransactionError("Selecione a categoria.");
        return;
      }

      const selectedCategory = categories.find(
        (category) => category.id === transactionCategoryId,
      );
      if (!selectedCategory || selectedCategory.category_type !== transactionType) {
        setTransactionError(
          "Selecione uma categoria válida para o tipo escolhido.",
        );
        return;
      }
    }

    const normalizedAmount = transactionAmount.replace(",", ".").trim();
    const amountValue = Number(normalizedAmount);

    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      setTransactionError("Informe um valor válido.");
      return;
    }

    if (!transactionDate) {
      setTransactionError("Informe a data.");
      return;
    }

    const submitter = (event.nativeEvent as SubmitEvent).submitter as
      | HTMLButtonElement
      | null;
    const submitAction = submitter?.dataset.action ?? "close";

    setIsCreatingTransaction(true);
    let insertError: { message: string } | null = null;

    if (isTransfer) {
      const transferId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const originAccount = accounts.find(
        (account) => account.id === transactionAccountId,
      );
      const destinationAccount = accounts.find(
        (account) => account.id === transactionDestinationAccountId,
      );
      const baseDescription = transactionDescription.trim();
      const outgoingDescription =
        baseDescription.length > 0
          ? `${baseDescription} (Transferência para ${
              destinationAccount?.name ?? "conta"
            })`
          : `Transferência para ${destinationAccount?.name ?? "conta"}`;
	      const incomingDescription =
	        baseDescription.length > 0
	          ? `${baseDescription} (Transferência de ${originAccount?.name ?? "conta"})`
	          : `Transferência de ${originAccount?.name ?? "conta"}`;
	      const occurredTimeValue = transactionTime.trim() || null;

	      const { error } = await supabase.from("transactions").insert([
	        {
	          account_id: transactionAccountId,
	          category_id: null,
	          amount: -amountValue,
	          currency: "BRL",
	          description: outgoingDescription,
	          posted_at: transactionDate,
	          occurred_time: occurredTimeValue,
	          source: "transfer",
	          external_id: transferId,
	        },
	        {
	          account_id: transactionDestinationAccountId,
	          category_id: null,
	          amount: amountValue,
	          currency: "BRL",
	          description: incomingDescription,
	          posted_at: transactionDate,
	          occurred_time: occurredTimeValue,
	          source: "transfer",
	          external_id: transferId,
	        },
	      ]);
      if (error) {
        insertError = error;
      }
	    } else {
	      const occurredTimeValue = transactionTime.trim() || null;
	      const { error } = await supabase.from("transactions").insert({
	        account_id: transactionAccountId,
	        category_id: transactionCategoryId,
	        amount: amountValue,
	        currency: "BRL",
	        description: transactionDescription.trim() || null,
	        posted_at: transactionDate,
	        occurred_time: occurredTimeValue,
	      });
	      if (error) {
	        insertError = error;
	      }
	    }

    if (insertError) {
      setTransactionError(insertError.message);
      setIsCreatingTransaction(false);
      return;
    }

    setTransactionAmount("");
    setTransactionDescription("");
    setDataRefreshCounter((value) => value + 1);
    setIsCreatingTransaction(false);
    if (submitAction === "repeat") {
      return;
    }
    setIsTransactionModalOpen(false);
  };

  const activeMembership = memberships.find(
    (membership) => membership.family?.id === activeFamilyId,
  );
  const canCreateTransaction = accounts.length > 0;
  const monthResult = monthlySummary.income - monthlySummary.expense;
  const totalBalance = Object.values(accountBalances).reduce((sum, value) => {
    if (!Number.isFinite(value)) {
      return sum;
    }
    return sum + value;
  }, 0);
  const topAccountsByBalance = [...accounts]
    .map((account) => ({
      ...account,
      balance: accountBalances[account.id] ?? 0,
    }))
    .sort((a, b) => (b.balance ?? 0) - (a.balance ?? 0))
    .slice(0, 5);
  const balanceValueTone =
    totalBalance < 0
      ? "text-rose-100"
      : totalBalance > 0
        ? "text-emerald-100"
        : "text-white";
  const resultValueTone =
    monthResult < 0
      ? "text-rose-100"
      : monthResult > 0
        ? "text-emerald-100"
        : "text-white";
  const balanceDisplay = `${totalBalance > 0 ? "+ " : totalBalance < 0 ? "- " : ""}${currencyFormatter.format(
    Math.abs(totalBalance),
  )}`;
  const resultDisplay = `${monthResult > 0 ? "+ " : monthResult < 0 ? "- " : ""}${currencyFormatter.format(
    Math.abs(monthResult),
  )}`;
  const balanceIndicator =
    totalBalance < 0
      ? { label: "Negativo", dot: "bg-rose-500", text: "text-rose-700" }
      : totalBalance > 0
        ? { label: "Positivo", dot: "bg-emerald-500", text: "text-emerald-700" }
        : { label: "Zerado", dot: "bg-slate-300", text: "text-slate-600" };
  const resultIndicator =
    monthResult < 0
      ? { label: "Negativo", dot: "bg-rose-500", text: "text-rose-700" }
      : monthResult > 0
        ? { label: "Positivo", dot: "bg-emerald-500", text: "text-emerald-700" }
        : { label: "Zerado", dot: "bg-slate-300", text: "text-slate-600" };
  const balanceAdjustAccount = balanceAdjustAccountId
    ? accounts.find((item) => item.id === balanceAdjustAccountId)
    : null;
  const balanceAdjustCurrent =
    balanceAdjustAccountId && balanceAdjustAccount
      ? accountBalances[balanceAdjustAccountId] ?? 0
      : 0;
  const balanceAdjustTargetValue = parseCurrencyInput(balanceAdjustTarget);
  const balanceAdjustDifference =
    balanceAdjustTargetValue !== null && !Number.isNaN(balanceAdjustTargetValue)
      ? balanceAdjustTargetValue - balanceAdjustCurrent
      : null;
  const balanceAdjustType =
    balanceAdjustDifference && balanceAdjustDifference !== 0
      ? balanceAdjustDifference > 0
        ? "income"
        : "expense"
      : null;
  const balanceAdjustCategories = balanceAdjustType
    ? categories.filter(
        (category) =>
          category.category_type === balanceAdjustType ||
          isBalanceAdjustCategory(category.name),
      )
    : [];
  useEffect(() => {
    if (!isBalanceAdjustOpen || !balanceAdjustType || !balanceAdjustCategoryId) {
      return;
    }
    const category = categories.find((item) => item.id === balanceAdjustCategoryId);
    if (
      !category ||
      (!isBalanceAdjustCategory(category.name) &&
        category.category_type !== balanceAdjustType)
    ) {
      setBalanceAdjustCategoryId("");
    }
  }, [
    isBalanceAdjustOpen,
    balanceAdjustType,
    balanceAdjustCategoryId,
    categories,
  ]);
  const isDashboardView = activeView === "dashboard";
  const isTransactionsView = activeView === "transactions";
  const isTransfersView = activeView === "transfers";
  const isAccountsView = activeView === "accounts";
  const isStatementView = activeView === "statement";
  const isCategoriesView = activeView === "categories";

  useEffect(() => {
    if (!isStatementView) {
      return;
    }
    if (!statementUseMonthRange) {
      return;
    }
    const { startDate, endDate } = getMonthRange(activeMonth);
    if (!startDate || !endDate) {
      return;
    }
    setStatementStartDate(startDate);
    setStatementEndDate(endDate);
  }, [activeMonth, isStatementView, statementUseMonthRange]);

  useEffect(() => {
    if (!isStatementView) {
      return;
    }
    if (!activeFamilyId || !session?.access_token) {
      return;
    }
    if (!statementAccountId) {
      setStatementRows([]);
      setStatementOpeningBalance(0);
      setStatementClosingBalance(0);
      return;
    }

    const monthRange = getMonthRange(activeMonth);
    const startDate = statementStartDate || monthRange.startDate;
    const endDate = statementEndDate || monthRange.endDate;
    if (!startDate || !endDate) {
      return;
    }

    type StatementQueryRow = {
      id: string;
      amount: string | number;
      description: string | null;
      posted_at: string;
      occurred_time: string | null;
      created_at: string;
      source: string | null;
      account: { name: string } | null;
      category: {
        id: string;
        name: string;
        category_type: string;
        parent_id: string | null;
      } | null;
    };

    let cancelled = false;
    const loadStatement = async () => {
      setIsLoadingStatement(true);
      setStatementError(null);

      const startMinusOne = subtractDaysFromBrazilDate(startDate, 1);
      const { data: opening, error: openingError } = await supabase
        .rpc("account_balance_at", {
          account_uuid: statementAccountId,
          at_date: startMinusOne,
        })
        .single();

      if (cancelled) {
        return;
      }

      if (openingError) {
        setStatementError(openingError.message);
        setIsLoadingStatement(false);
        return;
      }

      const openingBalanceValue = Number(
        typeof opening === "number" || typeof opening === "string" ? opening : 0,
      );
      const { data, error } = await supabase
        .from("transactions")
        .select(
          "id, amount, description, posted_at, occurred_time, created_at, source, account:accounts(name), category:categories(id, name, category_type, parent_id)",
        )
        .eq("account_id", statementAccountId)
        .gte("posted_at", startDate)
        .lte("posted_at", endDate)
        .order("posted_at", { ascending: true })
        .order("occurred_time", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: true })
        .range(0, 4999);

      if (cancelled) {
        return;
      }

      if (error) {
        setStatementError(error.message);
        setIsLoadingStatement(false);
        return;
      }

      let running = Number.isFinite(openingBalanceValue) ? openingBalanceValue : 0;
      const categoryIndex = [...categories, ...archivedCategories].reduce<
        Record<string, { id: string; name: string; parent_id: string | null }>
      >((acc, category) => {
        acc[category.id] = {
          id: category.id,
          name: category.name,
          parent_id: category.parent_id,
        };
        return acc;
      }, {});
      const getStatementCategoryLabel = (category: StatementQueryRow["category"]) => {
        if (!category?.id) {
          return "Sem categoria";
        }
        if (!category.parent_id) {
          return category.name;
        }
        const parent = categoryIndex[category.parent_id];
        return parent ? `${parent.name} / ${category.name}` : category.name;
      };

      const rows: StatementRow[] = ((data ?? []) as unknown as StatementQueryRow[]).map(
        (item) => {
        const amountValue = Number(item.amount);
        const isNumeric = Number.isFinite(amountValue);
        const source = item.source;
        const categoryType = item.category?.category_type ?? null;

        const delta = !isNumeric
          ? 0
          : source === "transfer" || source === "adjustment"
            ? amountValue
            : categoryType === "income"
              ? amountValue
              : categoryType === "expense"
                ? -amountValue
                : 0;

        running += delta;

        const label =
          source === "transfer"
            ? "Transferência"
            : source === "adjustment"
              ? "Ajuste"
              : getStatementCategoryLabel(item.category);

        const occurredTime = item.occurred_time;
        return {
          id: item.id,
          posted_at: item.posted_at,
          occurred_time: occurredTime ?? null,
          description: item.description,
          label,
          delta,
          balance_after: running,
        };
      });

      setStatementOpeningBalance(openingBalanceValue);
      setStatementRows(rows);
      setStatementClosingBalance(running);
      setIsLoadingStatement(false);
    };

    void loadStatement();
    return () => {
      cancelled = true;
    };
  }, [
    activeFamilyId,
    activeMonth,
    isStatementView,
    session?.access_token,
    statementAccountId,
    statementStartDate,
    statementEndDate,
    categories,
    archivedCategories,
  ]);
  const effectiveSearchQuery = isTransactionsView ? searchQuery : "";
  const normalizedSearch = effectiveSearchQuery.trim().toLowerCase();
  const effectiveTypeFilters = isTransactionsView
    ? typeFilters
    : [...typeFilterAll];
  const typeFilteredTransactions = transactions.filter((transaction) => {
    const isAdjustment = transaction.source === "adjustment";
    const rawValue = Number(transaction.amount);
    const adjustmentType =
      isAdjustment && Number.isFinite(rawValue)
        ? rawValue >= 0
          ? "income"
          : "expense"
        : null;
    const typeValue =
      transaction.source === "transfer"
        ? "transfer"
        : isAdjustment
          ? adjustmentType
          : transaction.category?.category_type;
    if (!typeValue) {
      return false;
    }
    return effectiveTypeFilters.includes(typeValue);
  });
  const visibleTransactions = normalizedSearch
    ? typeFilteredTransactions.filter((transaction) => {
        const categoryLabel = transaction.category?.id
          ? getCategoryDisplayLabel(
              transaction.category.id,
              transaction.category?.name,
            )
          : transaction.category?.name;
        const haystack = [
          transaction.description,
          categoryLabel,
          transaction.account?.name,
          transaction.amount,
          transaction.posted_at,
          transaction.source,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(normalizedSearch);
      })
    : typeFilteredTransactions;
  const isTypeFilterActive =
    isTransactionsView && typeFilters.length !== typeFilterAll.length;
  const activeMonthRange = getMonthRange(activeMonth);
  const isCustomDateRange = Boolean(
    isTransactionsView &&
      filterStartDate &&
      filterEndDate &&
      activeMonthRange.startDate &&
      activeMonthRange.endDate &&
      (filterStartDate !== activeMonthRange.startDate ||
        filterEndDate !== activeMonthRange.endDate),
  );
  const hasActiveFilters = Boolean(
    (isTransactionsView && filterAccountId) ||
      (isTransactionsView && filterCategoryId) ||
      normalizedSearch ||
      isTypeFilterActive ||
      isCustomDateRange,
  );
  const activeFiltersCount = [
    filterAccountId ? 1 : 0,
    filterCategoryId ? 1 : 0,
    normalizedSearch ? 1 : 0,
    isTypeFilterActive ? 1 : 0,
    isCustomDateRange ? 1 : 0,
  ].reduce((total, value) => total + value, 0);
  const showPagination = !normalizedSearch;
  const showLocalFilter = normalizedSearch || isTypeFilterActive;
  const monthDate = parseBrazilDate(`${activeMonth}-01`);
  const monthLabel = Number.isNaN(monthDate.getTime())
    ? activeMonth
    : new Intl.DateTimeFormat("pt-BR", {
        month: "long",
        year: "numeric",
        timeZone: BRAZIL_TZ,
      })
        .format(monthDate)
        .replace(/^./, (char) => char.toUpperCase());
  const userInitial =
    session?.user.email?.trim().charAt(0).toUpperCase() ?? "U";
  const sidebarLogoSrc = isSidebarCollapsed
    ? "/logo_gestor_quadrado.png"
    : "/logo_gestor.png";
  const signOutLabel = isSigningOut ? "Saindo..." : "Sair";
  const formatDate = (value: string) => {
    const parsed = parseDateValue(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }
    return shortDateFormatter.format(parsed);
  };
  const formatMobileDate = (value: string) => {
    const parsed = parseDateValue(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }
    return longDateFormatter
      .format(parsed)
      .replace(/\./g, "")
      .replace(/\s+de\s+/g, " ")
      .replace(/\s{2,}/g, " ")
      .toUpperCase();
  };
  const categoriesById = [...categories, ...archivedCategories].reduce<
    Record<string, (typeof categories)[number]>
  >((acc, category) => {
    acc[category.id] = category;
    return acc;
  }, {});
  const getCategoryDisplayLabel = (
    categoryId?: string | null,
    fallbackName?: string | null,
  ) => {
    if (!categoryId) {
      return fallbackName ?? "Categoria";
    }
    const category = categoriesById[categoryId];
    if (!category) {
      return fallbackName ?? "Categoria";
    }
    if (!category.parent_id) {
      return category.name;
    }
    const parent = categoriesById[category.parent_id];
    return parent ? `${parent.name} / ${category.name}` : category.name;
  };
  const buildCategoryOptions = (
    targetType?: string,
    includeArchived = false,
    includeAdjustments = false,
  ) => {
    const source = includeArchived
      ? [...categories, ...archivedCategories]
      : categories;
    const archivedIds = includeArchived
      ? new Set(archivedCategories.map((item) => item.id))
      : new Set<string>();
    return source
      .filter((category) =>
        includeAdjustments ? true : !isBalanceAdjustCategory(category.name),
      )
      .filter((category) =>
        targetType
          ? category.category_type === targetType
          : category.category_type !== "transfer",
      )
      .map((category) => {
        const baseLabel = getCategoryDisplayLabel(category.id, category.name);
        const label = archivedIds.has(category.id)
          ? `${baseLabel} (arquivada)`
          : baseLabel;
        return {
          ...category,
          label,
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
  };
  const renderAccountIcon = (
    account: {
      name: string;
      icon_key: string | null;
      icon_bg: string | null;
      icon_color: string | null;
    },
    wrapperClass = "h-10 w-10",
    iconClass = "h-5 w-5",
  ) => {
    const iconKey = account.icon_key ?? "initials";
    const iconOption = accountIconLookup[iconKey];
    const iconBg = account.icon_bg ?? DEFAULT_ACCOUNT_ICON_BG;
    const iconColor = account.icon_color ?? DEFAULT_ACCOUNT_ICON_COLOR;
    const shouldShowInitials =
      iconKey === "initials" || (!iconOption?.icon && !iconOption?.imageSrc);
    const isLogo = Boolean(iconOption?.imageSrc);

    return (
      <span
        className={`flex items-center justify-center rounded-full ${wrapperClass}`}
        style={{ backgroundColor: iconBg, color: iconColor }}
      >
        {isLogo ? (
          <img
            src={iconOption?.imageSrc}
            alt={iconOption?.label ?? account.name}
            className="h-5 w-5 object-contain"
            loading="lazy"
          />
        ) : shouldShowInitials ? (
          <span className="text-sm font-semibold">
            {account.name.slice(0, 2).toUpperCase()}
          </span>
        ) : iconOption?.icon ? (
          iconOption.icon({ className: iconClass })
        ) : (
          <span className="text-sm font-semibold">
            {account.name.slice(0, 2).toUpperCase()}
          </span>
        )}
      </span>
    );
  };
  const renderCategoryIcon = (
    category: {
      name: string;
      icon_key: string | null;
      icon_bg: string | null;
      icon_color: string | null;
    },
    wrapperClass = "h-10 w-10",
    iconClass = "h-5 w-5",
  ) => {
    const iconKey = category.icon_key ?? "tag";
    const iconOption = categoryIconLookup[iconKey] ?? categoryIconLookup.tag;
    const iconBg = category.icon_bg ?? DEFAULT_CATEGORY_ICON_BG;
    const iconColor = category.icon_color ?? DEFAULT_CATEGORY_ICON_COLOR;
    return (
      <span
        className={`flex items-center justify-center rounded-full ${wrapperClass}`}
        style={{ backgroundColor: iconBg, color: iconColor }}
      >
        {iconOption?.icon ? (
          iconOption.icon({ className: iconClass })
        ) : (
          <span className="text-[10px] font-semibold">
            {category.name.slice(0, 2).toUpperCase()}
          </span>
        )}
      </span>
    );
  };
  const renderCategoryActions = (
    category: (typeof categories)[number],
    options: { canAddChild?: boolean } = {},
  ) => {
    const isActionLoading = categoryActionLoadingId === category.id;
    const baseButton =
      "flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] bg-white text-[var(--muted)] shadow-sm transition hover:border-[var(--accent)] hover:text-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-60";
    return (
      <div className="flex items-center gap-2">
        {options.canAddChild ? (
          <button
            type="button"
            onClick={() =>
              openCategoryModal({
                type: category.category_type as "expense" | "income",
                parentId: category.id,
              })
            }
            className={baseButton}
            aria-label="Criar subcategoria"
            title="Criar subcategoria"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 5v14" />
              <path d="M5 12h14" />
            </svg>
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => openCategoryEditor(category)}
          disabled={isActionLoading}
          className={baseButton}
          aria-label="Editar categoria"
          title="Editar"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => handleArchiveCategory(category)}
          disabled={isActionLoading}
          className={baseButton}
          aria-label="Arquivar categoria"
          title={isActionLoading ? "Arquivando..." : "Arquivar"}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 8v13H3V8" />
            <path d="M1 3h22v5H1z" />
            <path d="M10 12h4" />
          </svg>
        </button>
      </div>
    );
  };
  const categoryTypeTabs = [
    {
      value: "expense",
      label: "Despesas",
      active: "bg-rose-100 text-rose-700",
      inactive: "text-[var(--muted)] hover:text-rose-600",
    },
    {
      value: "income",
      label: "Receitas",
      active: "bg-emerald-100 text-emerald-700",
      inactive: "text-[var(--muted)] hover:text-emerald-600",
    },
  ] as const;
  const activeCategoryRoots = categories
    .filter((category) => category.category_type === categoryViewType)
    .filter((category) => !category.parent_id)
    .filter((category) => !isBalanceAdjustCategory(category.name));
  const sortedActiveCategoryRoots = [...activeCategoryRoots].sort((a, b) =>
    a.name.localeCompare(b.name, "pt-BR"),
  );
  const activeCategoryChildren = categories
    .filter((category) => category.category_type === categoryViewType)
    .filter((category) => category.parent_id)
    .filter((category) => !isBalanceAdjustCategory(category.name));
  const activeCategoryChildrenByParent = activeCategoryChildren.reduce<
    Record<string, typeof categories>
  >((acc, category) => {
    if (!category.parent_id) {
      return acc;
    }
    if (!acc[category.parent_id]) {
      acc[category.parent_id] = [];
    }
    acc[category.parent_id].push(category);
    return acc;
  }, {});
  const archivedCategoryIds = new Set(archivedCategories.map((item) => item.id));
  const archivedCategoryRoots = archivedCategories
    .filter((category) => category.category_type === categoryViewType)
    .filter(
      (category) =>
        !category.parent_id || !archivedCategoryIds.has(category.parent_id),
    )
    .filter((category) => !isBalanceAdjustCategory(category.name));
  const sortedArchivedCategoryRoots = [...archivedCategoryRoots].sort((a, b) =>
    a.name.localeCompare(b.name, "pt-BR"),
  );
  const archivedCategoryCount = archivedCategories
    .filter((category) => category.category_type === categoryViewType)
    .filter((category) => !isBalanceAdjustCategory(category.name)).length;
  const archivedCategoryChildrenByParent = archivedCategories.reduce<
    Record<string, typeof archivedCategories>
  >((acc, category) => {
    if (!category.parent_id) {
      return acc;
    }
    if (isBalanceAdjustCategory(category.name)) {
      return acc;
    }
    if (!acc[category.parent_id]) {
      acc[category.parent_id] = [];
    }
    acc[category.parent_id].push(category);
    return acc;
  }, {});
  const isTransfer = transactionType === "transfer";
  const transactionCategoryOptions =
    transactionType && !isTransfer
      ? buildCategoryOptions(transactionType)
      : [];
  const transactionTypeOptions = [
    { value: "expense", label: "Despesa" },
    { value: "income", label: "Receita" },
    { value: "transfer", label: "Transferência" },
  ];
  const selectedParentCategory = categoryParentId
    ? categoriesById[categoryParentId]
    : null;
  const editingCategoryHasChildren = Boolean(
    editingCategoryId &&
      categories.some((category) => category.parent_id === editingCategoryId),
  );
  const isCategoryTypeLocked = Boolean(selectedParentCategory);
  const categoryParentOptions = categories
    .filter((category) => !category.parent_id)
    .filter((category) => category.category_type === categoryType)
    .filter((category) => category.id !== editingCategoryId)
    .filter((category) => !isBalanceAdjustCategory(category.name))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  const activeTypeLabel =
    transactionTypeOptions.find((option) => option.value === transactionType)
      ?.label ?? "tipo";
  const hasCategoryOptions = transactionCategoryOptions.length > 0;
  const categorySelectDisabled =
    !transactionType || isTransfer || !hasCategoryOptions;
  const categoryPlaceholder = transactionType
    ? hasCategoryOptions
      ? "Selecione a categoria"
      : "Sem categorias"
    : "Selecione o tipo";
  const transactionTypeStyles: Record<
    string,
    { active: string; inactive: string }
  > = {
    expense: {
      active: "bg-rose-500 text-white shadow-sm",
      inactive: "text-[var(--muted)] hover:text-[var(--ink)]",
    },
    income: {
      active: "bg-emerald-500 text-white shadow-sm",
      inactive: "text-[var(--muted)] hover:text-[var(--ink)]",
    },
    transfer: {
      active: "bg-sky-500 text-white shadow-sm",
      inactive: "text-[var(--muted)] hover:text-[var(--ink)]",
    },
  };
  const typeFilterOptions = [
    {
      value: "expense",
      label: "Despesas",
      active: "bg-rose-100 text-rose-700",
      inactive: "text-[var(--muted)] hover:text-rose-600",
    },
    {
      value: "income",
      label: "Receitas",
      active: "bg-emerald-100 text-emerald-700",
      inactive: "text-[var(--muted)] hover:text-emerald-600",
    },
    {
      value: "transfer",
      label: "Transferências",
      active: "bg-sky-100 text-sky-700",
      inactive: "text-[var(--muted)] hover:text-sky-600",
    },
  ];
  const toggleTypeFilter = (value: string) => {
    setTypeFilters((current) => {
      const isActive = current.includes(value);
      if (isActive) {
        if (current.length === 1) {
          return current;
        }
        return current.filter((item) => item !== value);
      }
      return typeFilterAll.filter(
        (item) => current.includes(item) || item === value,
      );
    });
  };
  const activeFilterChips: Array<{
    key: string;
    label: string;
    className: string;
    title?: string;
  }> = [];
  if (filterAccountId) {
    const accountLabel =
      accounts.find((account) => account.id === filterAccountId)?.name ??
      "Conta";
    activeFilterChips.push({
      key: "account",
      label: `Conta: ${accountLabel}`,
      title: accountLabel,
      className: "bg-slate-100 text-slate-600",
    });
  }
  if (filterCategoryId) {
    const categoryLabel = getCategoryDisplayLabel(
      filterCategoryId,
      categoriesById[filterCategoryId]?.name,
    );
    activeFilterChips.push({
      key: "category",
      label: `Categoria: ${categoryLabel}`,
      title: categoryLabel,
      className: "bg-slate-100 text-slate-600",
    });
  }
  if (isTypeFilterActive) {
    typeFilterOptions
      .filter((option) => typeFilters.includes(option.value))
      .forEach((option) => {
        activeFilterChips.push({
          key: `type-${option.value}`,
          label: option.label,
          className: option.active,
        });
      });
  }
  if (normalizedSearch) {
    activeFilterChips.push({
      key: "search",
      label: `Busca: ${searchQuery.trim()}`,
      title: searchQuery.trim(),
      className: "bg-slate-100 text-slate-600",
    });
  }
  if (isCustomDateRange && filterStartDate && filterEndDate) {
    const startLabel = formatDate(filterStartDate);
    const endLabel = formatDate(filterEndDate);
    activeFilterChips.push({
      key: "period",
      label: `Período: ${startLabel} – ${endLabel}`,
      title: `${startLabel} até ${endLabel}`,
      className: "bg-slate-100 text-slate-600",
    });
  }
  const destinationAccounts = accounts.filter(
    (account) => account.id !== transactionAccountId,
  );
  const destinationPlaceholder =
    destinationAccounts.length > 0
      ? "Selecione a conta destino"
      : "Crie outra conta";
  const destinationSelectDisabled =
    destinationAccounts.length === 0 || !transactionAccountId;
  const transferTransactions = transactions.filter(
    (transaction) => transaction.source === "transfer",
  );
  const transferGroups = transferTransactions.reduce<
    Record<string, typeof transferTransactions>
  >((acc, transaction) => {
    const key = transaction.external_id ?? transaction.id;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(transaction);
    return acc;
  }, {});
  const transferItems = Object.values(transferGroups)
    .map((group) => {
      const numericGroup = group.filter((item) =>
        Number.isFinite(Number(item.amount)),
      );
      const fromEntry = numericGroup.find((item) => Number(item.amount) < 0);
      const toEntry = numericGroup.find((item) => Number(item.amount) > 0);
      const amountValue = Math.max(
        0,
        ...numericGroup.map((item) => Math.abs(Number(item.amount))),
      );
      const postedAt =
        fromEntry?.posted_at ?? toEntry?.posted_at ?? group[0]?.posted_at ?? "";
      const description =
        group.find((item) => item.description)?.description ?? "";
      const fallbackId = `${postedAt}-${amountValue}-${group.length}`;
      return {
        id: group[0]?.external_id ?? group[0]?.id ?? fallbackId,
        posted_at: postedAt,
        amount: amountValue,
        from: fromEntry?.account ?? null,
        to: toEntry?.account ?? null,
        description,
      };
    })
    .sort((a, b) => b.posted_at.localeCompare(a.posted_at));
  const transferSearchNormalized = transferSearch.trim().toLowerCase();
  const minAmountValue = Number(transferMinAmount);
  const maxAmountValue = Number(transferMaxAmount);
  const minAmountValid =
    transferMinAmount.trim() !== "" && Number.isFinite(minAmountValue);
  const maxAmountValid =
    transferMaxAmount.trim() !== "" && Number.isFinite(maxAmountValue);
  const filteredTransfers = transferItems.filter((item) => {
    if (transferFromAccountId && item.from?.id !== transferFromAccountId) {
      return false;
    }
    if (transferToAccountId && item.to?.id !== transferToAccountId) {
      return false;
    }
    if (minAmountValid && item.amount < minAmountValue) {
      return false;
    }
    if (maxAmountValid && item.amount > maxAmountValue) {
      return false;
    }
    if (!transferSearchNormalized) {
      return true;
    }
    const haystack = [
      item.description,
      item.from?.name,
      item.to?.name,
      item.amount,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(transferSearchNormalized);
  });
  const hasTransferFilters = Boolean(
    transferFromAccountId ||
      transferToAccountId ||
      transferSearchNormalized ||
      minAmountValid ||
      maxAmountValid,
  );
  const monthNames = [
    "JAN",
    "FEV",
    "MAR",
    "ABR",
    "MAI",
    "JUN",
    "JUL",
    "AGO",
    "SET",
    "OUT",
    "NOV",
    "DEZ",
  ];
  const monthNamesFull = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];
  const selectedDate = parseBrazilDate(transactionDate);
  const selectedDateLabel = calendarDateFormatter
    .format(selectedDate)
    .replace(".", "")
    .toUpperCase();
  const calendarSelectedDate = parseBrazilDate(calendarTempDate);
  const calendarSelectedParts = getDateParts(calendarTempDate);
  const calendarSelectedLabel = calendarDateFormatter
    .format(calendarSelectedDate)
    .replace(".", "")
    .toUpperCase();
  const calendarLabel = `${monthNamesFull[calendarMonth]} ${calendarYear}`;
  const firstWeekday = new Date(calendarYear, calendarMonth, 1).getDay();
  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
  const calendarDays: Array<number | null> = [];
  for (let idx = 0; idx < firstWeekday; idx += 1) {
    calendarDays.push(null);
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    calendarDays.push(day);
  }
  while (calendarDays.length % 7 !== 0) {
    calendarDays.push(null);
  }
  const filterCalendarSelectedDate = parseBrazilDate(filterCalendarTempDate);
  const filterCalendarSelectedParts = getDateParts(filterCalendarTempDate);
  const filterCalendarSelectedLabel = calendarDateFormatter
    .format(filterCalendarSelectedDate)
    .replace(".", "")
    .toUpperCase();
  const filterCalendarLabel = `${monthNamesFull[filterCalendarMonth]} ${filterCalendarYear}`;
  const filterFirstWeekday = new Date(
    filterCalendarYear,
    filterCalendarMonth,
    1,
  ).getDay();
  const filterDaysInMonth = new Date(
    filterCalendarYear,
    filterCalendarMonth + 1,
    0,
  ).getDate();
  const filterCalendarDays: Array<number | null> = [];
  for (let idx = 0; idx < filterFirstWeekday; idx += 1) {
    filterCalendarDays.push(null);
  }
  for (let day = 1; day <= filterDaysInMonth; day += 1) {
    filterCalendarDays.push(day);
  }
  while (filterCalendarDays.length % 7 !== 0) {
    filterCalendarDays.push(null);
  }
  const activeMonthParts = activeMonth.split("-").map(Number);
  const fallbackDate = new Date();
  const activeYear = Number.isFinite(activeMonthParts[0])
    ? activeMonthParts[0]
    : fallbackDate.getFullYear();
  const activeMonthIndex = Number.isFinite(activeMonthParts[1])
    ? Math.max(0, Math.min(11, activeMonthParts[1] - 1))
    : fallbackDate.getMonth();
  const activeMonthLabel = `${monthNamesFull[activeMonthIndex]} ${activeYear}`;
  const prevMonth =
    activeMonthIndex === 0
      ? { year: activeYear - 1, index: 11 }
      : { year: activeYear, index: activeMonthIndex - 1 };
  const nextMonth =
    activeMonthIndex === 11
      ? { year: activeYear + 1, index: 0 }
      : { year: activeYear, index: activeMonthIndex + 1 };
  const normalizedBankSearch = bankLogoSearch.trim().toLowerCase();
  const filteredBankLogoOptions = normalizedBankSearch
    ? bankLogoOptions.filter((option) =>
        option.label.toLowerCase().includes(normalizedBankSearch),
      )
    : bankLogoOptions;

  useEffect(() => {
    setMonthPickerYear(activeYear);
  }, [activeYear]);

  const mobileTransactionGroups = visibleTransactions.reduce<
    Record<string, typeof visibleTransactions>
  >((acc, transaction) => {
    const key = toBrazilDateKey(transaction.posted_at);
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(transaction);
    return acc;
  }, {});
  const mobileTransactionEntries = Object.entries(mobileTransactionGroups).sort(
    ([dateA], [dateB]) => dateB.localeCompare(dateA),
  );

  const handleSelectMonth = (
    monthIndex: number,
    year = monthPickerYear,
  ) => {
    const monthValue = String(monthIndex + 1).padStart(2, "0");
    setActiveMonth(`${year}-${monthValue}`);
    setIsMonthPickerOpen(false);
  };
  const navItems = [
    {
      label: "Dashboard",
      view: "dashboard" as const,
      icon: ({ className = "h-5 w-5" }) => (
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className={className}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="3" width="7" height="7" rx="2" />
          <rect x="14" y="3" width="7" height="7" rx="2" />
          <rect x="14" y="14" width="7" height="7" rx="2" />
          <rect x="3" y="14" width="7" height="7" rx="2" />
        </svg>
      ),
    },
    {
      label: "Lançamentos",
      view: "transactions" as const,
      icon: ({ className = "h-5 w-5" }) => (
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className={className}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9 6h12" />
          <path d="M9 12h12" />
          <path d="M9 18h12" />
          <circle cx="5" cy="6" r="1.5" />
          <circle cx="5" cy="12" r="1.5" />
          <circle cx="5" cy="18" r="1.5" />
        </svg>
      ),
    },
    {
      label: "Contas",
      view: "accounts" as const,
      icon: ({ className = "h-5 w-5" }) => (
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className={className}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="6" width="18" height="12" rx="2" />
          <path d="M3 10h18" />
          <path d="M16 14h2" />
        </svg>
      ),
    },
    {
      label: "Orçamento",
      icon: ({ className = "h-5 w-5" }) => (
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className={className}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 3v9h9" />
          <path d="M12 3a9 9 0 1 0 9 9" />
        </svg>
      ),
    },
    {
      label: "Relatórios",
      icon: ({ className = "h-5 w-5" }) => (
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className={className}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 19h16" />
          <rect x="6" y="10" width="3" height="7" rx="1" />
          <rect x="11" y="7" width="3" height="10" rx="1" />
          <rect x="16" y="13" width="3" height="4" rx="1" />
        </svg>
      ),
    },
    {
      label: "Metas",
      icon: ({ className = "h-5 w-5" }) => (
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className={className}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      ),
    },
    {
      label: "Regras e Automação",
      icon: ({ className = "h-5 w-5" }) => (
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className={className}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 6h16" />
          <path d="M4 12h16" />
          <path d="M4 18h16" />
          <circle cx="9" cy="6" r="2" />
          <circle cx="15" cy="12" r="2" />
          <circle cx="11" cy="18" r="2" />
        </svg>
      ),
    },
    {
      label: "Categorias",
      view: "categories" as const,
      icon: ({ className = "h-5 w-5" }) => (
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className={className}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20 10l-6-6H6a2 2 0 0 0-2 2v8l6 6 10-10z" />
          <circle cx="9" cy="7" r="1.5" />
        </svg>
      ),
    },
    {
      label: "Importações",
      icon: ({ className = "h-5 w-5" }) => (
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className={className}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 3v12" />
          <path d="M8 9l4 4 4-4" />
          <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
        </svg>
      ),
    },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden text-[var(--ink)]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.14),_transparent_55%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(15,23,42,0.05)_1px,transparent_1px),linear-gradient(180deg,rgba(15,23,42,0.05)_1px,transparent_1px)] bg-[size:80px_80px] opacity-35" />
      </div>

      <div className="relative mx-auto min-h-screen w-full max-w-none px-2 py-6">
        {isChecking ? (
          <div className="flex flex-1 items-center justify-center text-sm text-[var(--muted)]">
            Carregando informações...
          </div>
        ) : session ? (
          <div className="relative min-h-[calc(100vh-3rem)]">
            <aside
              className={`hidden lg:flex lg:flex-col lg:fixed lg:top-6 lg:left-2 lg:z-20 lg:h-[calc(100vh-3rem)] rounded-3xl border border-[var(--border)] bg-white/90 shadow-sm ${
                isSidebarCollapsed ? "p-3 lg:w-[88px]" : "p-5 lg:w-[220px]"
              }`}
            >
              <div
                className={`flex ${
                  isSidebarCollapsed
                    ? "flex-col items-center gap-2"
                    : "items-center justify-between"
                }`}
              >
                <button
                  type="button"
                  onClick={handleLogoClick}
                  aria-label="Ir para o dashboard"
                  className={`flex items-center justify-center rounded-2xl px-1 transition hover:bg-slate-50 ${
                    isSidebarCollapsed ? "h-12 w-12" : "h-14 w-full"
                  }`}
                >
                  <img
                    src={sidebarLogoSrc}
                    alt="Gestor"
                    className={
                      isSidebarCollapsed
                        ? "h-10 w-auto max-w-[40px] object-contain"
                        : "h-10 w-full object-contain"
                    }
                  />
                </button>
                <button
                  type="button"
                  onClick={() => setIsSidebarCollapsed((prev) => !prev)}
                  aria-label={isSidebarCollapsed ? "Expandir menu" : "Recolher menu"}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] bg-white text-[var(--muted)] shadow-sm transition hover:text-[var(--accent-strong)]"
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className={`h-4 w-4 transition ${
                      isSidebarCollapsed ? "rotate-180" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </button>
              </div>
              <nav className="mt-6 flex flex-1 flex-col gap-1 text-sm text-[var(--muted)]">
                {navItems.map((item) => {
                  const isActive = item.view === activeView;
                  const isEnabled = Boolean(item.view);
                  return (
                    <button
                      key={item.label}
                      type="button"
                      disabled={!isEnabled}
                      title={item.label}
                      onClick={() => {
                        if (item.view) {
                          setActiveView(item.view);
                        }
                      }}
                      className={`flex items-center rounded-xl text-left font-semibold transition ${
                        isSidebarCollapsed ? "justify-center px-2 py-2" : "justify-between px-3 py-2 text-sm"
                      } ${
                        isActive
                          ? "bg-[var(--accent-soft)] text-[var(--accent-strong)]"
                          : isEnabled
                            ? "hover:bg-slate-50"
                            : "opacity-50"
                      }`}
                    >
                      {isSidebarCollapsed ? (
                        <>
                          {item.icon({ className: "h-5 w-5" })}
                          <span className="sr-only">{item.label}</span>
                        </>
                      ) : (
                        <span>{item.label}</span>
                      )}
                    </button>
                  );
                })}
              </nav>
              <div
                className={`mt-6 rounded-2xl border border-[var(--border)] bg-white shadow-sm ${
                  isSidebarCollapsed ? "p-3" : "p-4"
                }`}
              >
                <div
                  className={`flex ${
                    isSidebarCollapsed ? "flex-col items-center gap-2" : "flex-col gap-3"
                  }`}
                >
                  {!isSidebarCollapsed ? (
                    <div className="flex items-center justify-between text-xs text-[var(--muted)]">
                      <span>Família</span>
                      <span className="ml-2 truncate font-semibold text-[var(--ink)]">
                        {activeMembership?.family?.name ?? "Selecione"}
                      </span>
                    </div>
                  ) : null}
                  <div
                    className={`flex ${
                      isSidebarCollapsed ? "flex-col items-center gap-2" : "items-center gap-3"
                    }`}
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-white text-xs font-semibold text-[var(--ink)]">
                      {userInitial}
                    </div>
                    {!isSidebarCollapsed ? (
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">
                          Sessão
                        </p>
                        <p
                          className="truncate text-[11px] font-semibold text-[var(--ink)]"
                          title={session.user.email ?? "usuário"}
                        >
                          {session.user.email ?? "usuário"}
                        </p>
                      </div>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    aria-label={signOutLabel}
                    title={signOutLabel}
                    disabled={isSigningOut}
                    onClick={handleSignOut}
                    className={`inline-flex items-center justify-center rounded-full border border-[var(--border)] bg-white text-xs font-semibold text-[var(--ink)] transition hover:border-[var(--accent)] ${
                      isSidebarCollapsed
                        ? "h-8 w-8"
                        : "h-8 w-full px-3 text-[11px]"
                    }`}
                  >
                    {isSidebarCollapsed ? (
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 24 24"
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M16 17l5-5-5-5" />
                        <path d="M21 12H9" />
                        <path d="M12 19H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h6" />
                      </svg>
                    ) : (
                      signOutLabel
                    )}
                  </button>
                </div>
              </div>
            </aside>

            <div
              className={`flex min-w-0 flex-col gap-6 ${
                isSidebarCollapsed ? "lg:pl-[112px]" : "lg:pl-[244px]"
              }`}
            >
	              <header className="rounded-3xl border border-[var(--border)] bg-white/80 px-4 py-4 shadow-sm backdrop-blur sm:px-5">
	                <div className="flex flex-col gap-3 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:items-center lg:gap-3">
	                  <div className="flex items-center gap-3 lg:col-start-1">
	                    <button
	                      type="button"
                      onClick={() => setIsMobileMenuOpen(true)}
                      aria-label="Abrir menu"
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-white text-[var(--muted)] shadow-sm transition hover:text-[var(--accent-strong)] lg:hidden"
                    >
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 24 24"
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M4 6h16" />
                        <path d="M4 12h16" />
                        <path d="M4 18h16" />
                      </svg>
                    </button>
	                    <button
	                      type="button"
	                      onClick={handleLogoClick}
	                      aria-label="Ir para o dashboard"
	                      className="flex h-10 flex-1 items-center justify-center rounded-xl px-1 transition hover:bg-slate-50 lg:hidden"
	                    >
	                      <img
	                        src="/logo_gestor.png"
	                        alt="Gestor"
	                        className="h-8 w-full max-w-[140px] object-contain"
	                      />
	                    </button>
	                  </div>

	                  <div className="flex flex-nowrap items-center justify-between gap-2 lg:contents">
	                    <div
	                      ref={monthPickerRef}
	                      className="relative flex min-w-0 flex-1 items-center justify-center gap-2 lg:col-start-2 lg:flex-none lg:justify-self-center"
	                    >
	                      <button
	                        type="button"
	                        onClick={() =>
	                          handleSelectMonth(prevMonth.index, prevMonth.year)
	                        }
	                        aria-label="Mês anterior"
	                        className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] bg-white text-[var(--muted)] shadow-sm transition hover:border-[var(--accent)] hover:text-[var(--accent-strong)] sm:h-10 sm:w-10"
	                      >
	                        <svg
	                          aria-hidden="true"
	                          viewBox="0 0 24 24"
	                          className="h-4 w-4"
	                          fill="none"
	                          stroke="currentColor"
	                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M15 18l-6-6 6-6" />
                        </svg>
                      </button>
	                      <button
	                        type="button"
	                        aria-haspopup="dialog"
	                        aria-expanded={isMonthPickerOpen}
	                        onClick={() => {
	                          setMonthPickerYear(activeYear);
	                          setIsMonthPickerOpen((prev) => !prev);
	                        }}
	                        className="flex h-8 min-w-0 items-center gap-2 rounded-full border border-[var(--border)] bg-white px-2 text-xs font-semibold text-[var(--ink)] shadow-sm transition hover:border-[var(--accent)] sm:h-10 sm:px-4 sm:text-sm"
	                      >
	                        <span className="min-w-0 max-w-[92px] truncate sm:max-w-none">
	                          <span className="sm:hidden">
	                            {monthNames[activeMonthIndex]} {activeYear}
	                          </span>
	                          <span className="hidden sm:inline">{activeMonthLabel}</span>
	                        </span>
	                        <svg
	                          aria-hidden="true"
	                          viewBox="0 0 24 24"
                          className="h-4 w-4 text-[var(--muted)]"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M6 9l6 6 6-6" />
                        </svg>
                      </button>
	                      <button
	                        type="button"
	                        onClick={() =>
	                          handleSelectMonth(nextMonth.index, nextMonth.year)
	                        }
	                        aria-label="Próximo mês"
	                        className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] bg-white text-[var(--muted)] shadow-sm transition hover:border-[var(--accent)] hover:text-[var(--accent-strong)] sm:h-10 sm:w-10"
	                      >
	                        <svg
	                          aria-hidden="true"
	                          viewBox="0 0 24 24"
	                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M9 6l6 6-6 6" />
                        </svg>
                      </button>
                      {isMonthPickerOpen ? (
                        <div className="absolute right-0 top-full z-30 mt-2 w-64 max-w-[calc(100vw-2rem)] rounded-2xl border border-[var(--border)] bg-white p-3 shadow-[var(--shadow)] lg:left-1/2 lg:right-auto lg:-translate-x-1/2">
                          <div className="flex items-center justify-between px-2 py-1">
                            <button
                              type="button"
                              onClick={() => setMonthPickerYear((prev) => prev - 1)}
                              className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] text-[var(--muted)] transition hover:border-[var(--accent)]"
                              aria-label="Ano anterior"
                            >
                              <svg
                                aria-hidden="true"
                                viewBox="0 0 24 24"
                                className="h-4 w-4"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M15 18l-6-6 6-6" />
                              </svg>
                            </button>
                            <span className="text-sm font-semibold text-[var(--ink)]">
                              {monthPickerYear}
                            </span>
                            <button
                              type="button"
                              onClick={() => setMonthPickerYear((prev) => prev + 1)}
                              className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] text-[var(--muted)] transition hover:border-[var(--accent)]"
                              aria-label="Próximo ano"
                            >
                              <svg
                                aria-hidden="true"
                                viewBox="0 0 24 24"
                                className="h-4 w-4"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M9 6l6 6-6 6" />
                              </svg>
                            </button>
                          </div>
                          <div className="mt-2 grid grid-cols-3 gap-2">
                            {monthNames.map((monthName, index) => {
                              const isActive =
                                index === activeMonthIndex &&
                                monthPickerYear === activeYear;
                              return (
                                <button
                                  key={monthName}
                                  type="button"
                                  onClick={() => handleSelectMonth(index)}
                                  className={`rounded-xl px-2 py-2 text-xs font-semibold transition ${
                                    isActive
                                      ? "bg-[var(--accent-soft)] text-[var(--accent-strong)]"
                                      : "text-[var(--ink)] hover:bg-slate-50"
                                  }`}
                                >
                                  {monthName}
                                </button>
                              );
                            })}
                          </div>
                          <div className="mt-3 grid grid-cols-3 gap-2">
                            {[
                              {
                                label: `${monthNames[prevMonth.index]} ${prevMonth.year}`,
                                value: prevMonth,
                              },
                              {
                                label: `${monthNames[activeMonthIndex]} ${activeYear}`,
                                value: { year: activeYear, index: activeMonthIndex },
                              },
                              {
                                label: `${monthNames[nextMonth.index]} ${nextMonth.year}`,
                                value: nextMonth,
                              },
                            ].map((item, idx) => {
                              const isCurrent = idx === 1;
                              return (
                                <button
                                  key={item.label}
                                  type="button"
                                  onClick={() =>
                                    handleSelectMonth(
                                      item.value.index,
                                      item.value.year,
                                    )
                                  }
                                  className={`rounded-full border px-2 py-2 text-[11px] font-semibold transition ${
                                    isCurrent
                                      ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-strong)]"
                                      : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--ink)]"
                                  }`}
                                >
                                  {item.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ) : null}
                    </div>
	                    <div className="flex shrink-0 items-center gap-2 lg:col-start-3 lg:justify-self-end">
	                      <div className="flex h-8 items-center gap-1 rounded-full border border-[var(--border)] bg-white px-1 py-1 shadow-sm sm:h-10">
	                        <span className="hidden px-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)] sm:inline sm:px-2">
	                          Criar
	                        </span>
	                      <button
	                        type="button"
	                        onClick={() => openTransactionModal("expense")}
                        disabled={!canCreateTransaction}
                        aria-label="Criar despesa"
                        title="Criar despesa"
	                        className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-rose-500 text-white shadow-sm shadow-rose-500/30 transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-60 sm:h-8 sm:w-8"
	                      >
                        <svg
                          aria-hidden="true"
                          viewBox="0 0 24 24"
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M12 5v14" />
                          <path d="M18 13l-6 6-6-6" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => openTransactionModal("income")}
                        disabled={!canCreateTransaction}
                        aria-label="Criar receita"
                        title="Criar receita"
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm shadow-emerald-500/30 transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60 sm:h-8 sm:w-8"
                      >
                        <svg
                          aria-hidden="true"
                          viewBox="0 0 24 24"
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M12 19V5" />
                          <path d="M6 11l6-6 6 6" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => openTransactionModal("transfer")}
                        disabled={!canCreateTransaction}
                        aria-label="Criar transferência"
                        title="Criar transferência"
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-sky-500 text-white shadow-sm shadow-sky-500/30 transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60 sm:h-8 sm:w-8"
                      >
                        <svg
                          aria-hidden="true"
                          viewBox="0 0 24 24"
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M21 7H3" />
                          <path d="M7 3L3 7l4 4" />
                          <path d="M3 17h18" />
                          <path d="M17 13l4 4-4 4" />
                        </svg>
                      </button>
                      </div>
	                      <button
	                        type="button"
	                        aria-label="Importar extrato"
	                        title="Importar extrato"
	                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] bg-white text-[var(--muted)] shadow-sm transition hover:border-[var(--accent)] hover:text-[var(--ink)] sm:h-10 sm:w-10"
	                        disabled
	                      >
                        <svg
                          aria-hidden="true"
                          viewBox="0 0 24 24"
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <path d="M7 10l5 5 5-5" />
                          <path d="M12 15V3" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </header>
              {isMobileMenuOpen ? (
                <div className="fixed inset-0 z-50 lg:hidden">
                  <button
                    type="button"
                    aria-label="Fechar menu"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                  />
                  <div className="relative z-10 h-full w-[260px] max-w-[85vw] overflow-y-auto rounded-r-3xl border-r border-[var(--border)] bg-white/95 p-5 shadow-[var(--shadow)]">
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={handleLogoClick}
                        aria-label="Ir para o dashboard"
                        className="flex items-center rounded-xl px-1 transition hover:bg-slate-50"
                      >
                        <img
                          src="/logo_gestor.png"
                          alt="Gestor"
                          className="h-9 w-auto object-contain"
                        />
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsMobileMenuOpen(false)}
                        aria-label="Fechar menu"
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] text-[var(--muted)] transition hover:text-[var(--accent-strong)]"
                      >
                        <svg
                          aria-hidden="true"
                          viewBox="0 0 24 24"
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M18 6L6 18" />
                          <path d="M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <nav className="mt-6 flex flex-col gap-1 text-sm text-[var(--muted)]">
                      {navItems.map((item) => {
                        const isActive = item.view === activeView;
                        const isEnabled = Boolean(item.view);
                        return (
                          <button
                            key={item.label}
                            type="button"
                            disabled={!isEnabled}
                            onClick={() => {
                              if (item.view) {
                                setActiveView(item.view);
                                setIsMobileMenuOpen(false);
                              }
                            }}
                            className={`flex items-center gap-3 rounded-xl px-3 py-2 text-left font-semibold transition ${
                              isActive
                                ? "bg-[var(--accent-soft)] text-[var(--accent-strong)]"
                                : isEnabled
                                  ? "hover:bg-slate-50"
                                  : "opacity-50"
                            }`}
                          >
                            {item.icon({ className: "h-5 w-5" })}
                            <span>{item.label}</span>
                          </button>
                        );
                      })}
                    </nav>
                    <div className="mt-6 rounded-2xl border border-[var(--border)] bg-white p-4 shadow-sm">
                      <div className="flex items-center justify-between text-xs text-[var(--muted)]">
                        <span>Família</span>
                        <span className="ml-2 truncate font-semibold text-[var(--ink)]">
                          {activeMembership?.family?.name ?? "Selecione"}
                        </span>
                      </div>
                      <div className="mt-3 flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-white text-xs font-semibold text-[var(--ink)]">
                          {userInitial}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">
                            Sessão
                          </p>
                          <p
                            className="truncate text-[11px] font-semibold text-[var(--ink)]"
                            title={session.user.email ?? "usuário"}
                          >
                            {session.user.email ?? "usuário"}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleSignOut}
                        disabled={isSigningOut}
                        className="mt-3 inline-flex h-8 w-full items-center justify-center rounded-full border border-[var(--border)] bg-white text-xs font-semibold text-[var(--ink)] transition hover:border-[var(--accent)]"
                      >
                        {isSigningOut ? "Saindo..." : "Sair"}
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}

              {isTransactionModalOpen ? (
                <div className="fixed inset-0 z-50 flex items-start justify-center px-3 py-4 sm:items-center sm:px-4 sm:py-6">
                  <button
                    type="button"
                    aria-label="Fechar modal"
                    onClick={() => setIsTransactionModalOpen(false)}
                    className="absolute inset-0 animate-[overlay-in_0.2s_ease-out] bg-slate-900/40 backdrop-blur-sm"
                  />
                  <div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="novo-lançamento-title"
                    className={`relative z-10 flex w-full max-w-2xl animate-[modal-in_0.22s_ease-out] flex-col overflow-hidden rounded-2xl border bg-white sm:rounded-3xl ${
                      isCalendarOpen
                        ? "border-transparent shadow-none"
                        : "border-[var(--border)] shadow-[var(--shadow)]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 border-b border-[var(--border)] px-4 py-3 sm:border-none sm:px-6 sm:pt-6 sm:pb-0">
                      <div className="min-w-0">
                        <p className="hidden text-[10px] font-semibold uppercase tracking-[0.3em] text-[var(--muted)] sm:block">
                          Novo lançamento
                        </p>
                        <h2
                          id="novo-lançamento-title"
                          className="mt-0.5 text-base font-semibold text-[var(--ink)] sm:mt-2 sm:text-xl"
                        >
                          Registrar movimentação
                        </h2>
                        <p className="mt-1 hidden text-sm text-[var(--muted)] sm:block">
                          Preencha os campos abaixo.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsTransactionModalOpen(false)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] bg-white text-[var(--muted)] shadow-sm transition hover:border-[var(--accent)] hover:text-[var(--ink)] sm:h-auto sm:w-auto sm:px-4 sm:py-2 sm:text-xs sm:font-semibold sm:text-[var(--ink)]"
                        aria-label="Fechar"
                      >
                        <svg
                          aria-hidden="true"
                          viewBox="0 0 24 24"
                          className="h-4 w-4 sm:mr-2"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M18 6L6 18" />
                          <path d="M6 6l12 12" />
                        </svg>
                        <span className="hidden sm:inline">Fechar</span>
                      </button>
                    </div>

                    <div className="max-h-[calc(100vh-10rem)] flex-1 overflow-y-auto px-5 py-4 sm:max-h-[calc(100vh-16rem)] sm:px-6 sm:py-6">
                      {!canCreateTransaction ? (
                        <div className="rounded-2xl border border-dashed border-[var(--border)] bg-slate-50 px-4 py-4 text-sm text-[var(--muted)]">
                          Crie ao menos uma conta para liberar os lançamentos.
                        </div>
                      ) : (
                        <form
                          className="grid gap-5 sm:gap-6"
                          onSubmit={handleCreateTransaction}
                        >
                          <div className="flex flex-col gap-2">
                            <label className="text-xs font-semibold text-[var(--muted)]">
                              Tipo
                            </label>
                            <div
                              role="group"
                              className="grid grid-cols-3 rounded-xl border border-[var(--border)] bg-slate-50 p-1"
                            >
                              {transactionTypeOptions.map((option) => (
                                <button
                                  key={option.value}
                                  type="button"
                                  onClick={() => {
                                    setTransactionType(option.value);
                                    setTransactionDestinationAccountId("");
                                    setTransactionCategoryId("");
                                  }}
                                  className={`min-w-0 rounded-lg px-2 py-2 text-xs font-semibold transition ${
                                    transactionType === option.value
                                      ? (transactionTypeStyles[option.value]?.active ??
                                        "bg-white text-[var(--accent-strong)] shadow-sm")
                                      : (transactionTypeStyles[option.value]?.inactive ??
                                        "text-[var(--muted)] hover:text-[var(--ink)]")
                                  }`}
                                  aria-pressed={transactionType === option.value}
                                >
                                  <span className="block truncate">
                                    {option.label}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="grid gap-4 sm:grid-cols-2">
                            <div className="flex flex-col gap-2">
                              <label className="text-xs font-semibold text-[var(--muted)]">
                                {isTransfer ? "Conta origem" : "Conta"}
                              </label>
                              <div className="relative">
                                <svg
                                  aria-hidden="true"
                                  viewBox="0 0 24 24"
                                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="1.5"
                                >
                                  <rect x="3" y="6" width="18" height="12" rx="2" />
                                  <path d="M3 10h18" />
                                </svg>
                                <select
                                  value={transactionAccountId}
                                  onChange={(event) =>
                                    setTransactionAccountId(event.target.value)
                                  }
                                  className="w-full rounded-xl border border-[var(--border)] bg-white px-10 py-3 text-sm text-[var(--ink)] shadow-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]"
                                >
                                  <option value="">Selecione a conta</option>
                                  {accounts.map((account) => (
                                    <option key={account.id} value={account.id}>
                                      {account.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                            {isTransfer ? (
                              <div className="flex flex-col gap-2">
                                <label className="text-xs font-semibold text-[var(--muted)]">
                                  Conta destino
                                </label>
                                <div className="relative">
                                  <svg
                                    aria-hidden="true"
                                    viewBox="0 0 24 24"
                                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                  >
                                    <path d="M4 12h12" />
                                    <path d="M12 6l6 6-6 6" />
                                  </svg>
                                  <select
                                    value={transactionDestinationAccountId}
                                    onChange={(event) =>
                                      setTransactionDestinationAccountId(
                                        event.target.value,
                                      )
                                    }
                                    disabled={destinationSelectDisabled}
                                    className="w-full rounded-xl border border-[var(--border)] bg-white px-10 py-3 text-sm text-[var(--ink)] shadow-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)] disabled:cursor-not-allowed disabled:bg-slate-50"
                                  >
                                    <option value="">{destinationPlaceholder}</option>
                                    {destinationAccounts.map((account) => (
                                      <option key={account.id} value={account.id}>
                                        {account.name}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-col gap-2">
                                <label className="text-xs font-semibold text-[var(--muted)]">
                                  Categoria
                                </label>
                                <div className="relative">
                                  <svg
                                    aria-hidden="true"
                                    viewBox="0 0 24 24"
                                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                  >
                                    <path d="M7 7h7l5 5-7 7-5-5V7z" />
                                    <circle cx="10" cy="10" r="1.2" />
                                  </svg>
                                  <select
                                    value={transactionCategoryId}
                                    onChange={(event) =>
                                      setTransactionCategoryId(event.target.value)
                                    }
                                    disabled={categorySelectDisabled}
                                    className="w-full rounded-xl border border-[var(--border)] bg-white px-10 py-3 text-sm text-[var(--ink)] shadow-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)] disabled:cursor-not-allowed disabled:bg-slate-50"
                                  >
                                    <option value="">{categoryPlaceholder}</option>
                                    {transactionCategoryOptions.map((category) => (
                                      <option key={category.id} value={category.id}>
                                        {category.label}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                {transactionType && !hasCategoryOptions ? (
                                  <p className="text-xs text-amber-600">
                                    Crie uma categoria de {activeTypeLabel} antes
                                    de registrar.
                                  </p>
                                ) : null}
                              </div>
                            )}
                          </div>

	                          <div className="grid gap-4 sm:grid-cols-2">
	                            <div className="flex flex-col gap-2">
	                              <label className="text-xs font-semibold text-[var(--muted)]">
	                                Valor
	                              </label>
                              <div className="relative">
                                <svg
                                  aria-hidden="true"
                                  viewBox="0 0 24 24"
                                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="1.5"
                                >
                                  <circle cx="12" cy="12" r="8" />
                                  <path d="M9 10h6M9 14h6" />
                                </svg>
                                <input
                                  value={transactionAmount}
                                  onChange={(event) =>
                                    setTransactionAmount(event.target.value)
                                  }
                                  placeholder="R$ 0,00"
                                  inputMode="decimal"
                                  className="w-full rounded-xl border border-[var(--border)] bg-white px-10 py-3 text-sm text-[var(--ink)] shadow-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]"
                                />
	                              </div>
	                            </div>
	                            <div className="flex flex-col gap-2">
	                              <label className="text-xs font-semibold text-[var(--muted)]">
	                                Data
	                              </label>
                              <div className="grid gap-2">
                                <div
                                  role="group"
                                  className="grid grid-cols-3 rounded-xl border border-[var(--border)] bg-slate-50 p-1"
                                >
                                  {[
                                    { label: "Hoje", value: "today" as const },
                                    { label: "Ontem", value: "yesterday" as const },
                                    { label: "Outros", value: "custom" as const },
                                  ].map((option) => (
                                    <button
                                      key={option.value}
                                      type="button"
                                      onClick={() => applyDatePreset(option.value)}
                                      className={`min-w-0 rounded-lg px-2 py-2 text-xs font-semibold transition ${
                                        datePreset === option.value
                                          ? "bg-white text-[var(--accent-strong)] shadow-sm"
                                          : "text-[var(--muted)] hover:text-[var(--ink)]"
                                      }`}
                                      aria-pressed={datePreset === option.value}
                                    >
                                      <span className="block truncate">
                                        {option.label}
                                      </span>
                                    </button>
                                  ))}
                                </div>
                                {datePreset === "custom" ? (
                                  <button
                                    type="button"
                                    onClick={openCalendarPicker}
                                    className="flex w-full items-center justify-between rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm font-semibold text-[var(--ink)] shadow-sm transition hover:border-[var(--accent)]"
                                  >
                                    <span>{selectedDateLabel}</span>
                                    <svg
                                      aria-hidden="true"
                                      viewBox="0 0 24 24"
                                      className="h-4 w-4 text-[var(--muted)]"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="1.5"
                                    >
                                      <rect x="3" y="5" width="18" height="16" rx="2" />
                                      <path d="M16 3v4M8 3v4M3 11h18" />
                                    </svg>
                                  </button>
                                ) : null}
	                            </div>
	                          </div>

	                          <div className="flex flex-col gap-2">
	                            <label className="text-xs font-semibold text-[var(--muted)]">
	                              Hora (opcional)
	                            </label>
	                            <div className="relative">
	                              <svg
	                                aria-hidden="true"
	                                viewBox="0 0 24 24"
	                                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]"
	                                fill="none"
	                                stroke="currentColor"
	                                strokeWidth="1.5"
	                              >
	                                <circle cx="12" cy="12" r="8" />
	                                <path d="M12 7v6l3 2" />
	                              </svg>
	                              <input
	                                value={transactionTime}
	                                onChange={(event) => setTransactionTime(event.target.value)}
	                                type="time"
	                                step="60"
	                                placeholder="HH:MM"
	                                className="w-full rounded-xl border border-[var(--border)] bg-white px-10 py-3 text-sm text-[var(--ink)] shadow-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]"
	                              />
	                            </div>
	                            <p className="text-xs text-[var(--muted)]">
	                              Usado apenas no extrato para ordenar lançamentos do mesmo dia.
	                            </p>
	                          </div>
                          </div>

                          <div className="flex flex-col gap-2">
                            <label className="text-xs font-semibold text-[var(--muted)]">
                              Descrição
                            </label>
                            <div className="relative">
                              <svg
                                aria-hidden="true"
                                viewBox="0 0 24 24"
                                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.5"
                              >
                                <path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
                                <path d="M14 3v6h6" />
                              </svg>
                              <input
                                value={transactionDescription}
                                onChange={(event) =>
                                  setTransactionDescription(event.target.value)
                                }
                                placeholder="Descrição (opcional)"
                                className="w-full rounded-xl border border-[var(--border)] bg-white px-10 py-3 text-sm text-[var(--ink)] shadow-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]"
                              />
                            </div>
                          </div>
                          {transactionError ? (
                            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                              {transactionError}
                            </div>
                          ) : null}
                          <div className="grid gap-3 grid-cols-2">
                            <button
                              type="submit"
                              data-action="close"
                              disabled={isCreatingTransaction}
                              className={`${primaryButton} w-full disabled:cursor-not-allowed disabled:opacity-70`}
                            >
                              {isCreatingTransaction
                                ? "Salvando..."
                                : "Salvar e fechar"}
                            </button>
                            <button
                              type="submit"
                              data-action="repeat"
                              disabled={isCreatingTransaction}
                              className="inline-flex w-full items-center justify-center rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--ink)] shadow-sm transition hover:border-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-70"
                            >
                              {isCreatingTransaction
                                ? "Salvando..."
                                : "Salvar e criar outro"}
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                    {isCalendarOpen ? (
                      <div className="absolute inset-0 z-20 flex items-center justify-center">
                        <button
                          type="button"
                          aria-label="Fechar calendário"
                          onClick={() => setIsCalendarOpen(false)}
                          className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                        />
                        <div className="relative z-10 w-full max-w-sm overflow-hidden rounded-3xl border border-[var(--border)] bg-white shadow-[var(--shadow)]">
                          <div className="bg-[var(--accent)] px-5 py-4 text-white">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/70">
                              {calendarYear}
                            </p>
                            <p className="mt-1 text-lg font-semibold">
                              {calendarSelectedLabel}
                            </p>
                          </div>
                          <div className="px-5 py-4">
                            <div className="flex items-center justify-between">
                              <button
                                type="button"
                                onClick={() => {
                                  if (calendarMonth === 0) {
                                    setCalendarMonth(11);
                                    setCalendarYear((prev) => prev - 1);
                                  } else {
                                    setCalendarMonth((prev) => prev - 1);
                                  }
                                }}
                                className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] text-[var(--muted)] transition hover:border-[var(--accent)]"
                                aria-label="Mês anterior"
                              >
                                <svg
                                  aria-hidden="true"
                                  viewBox="0 0 24 24"
                                  className="h-4 w-4"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M15 18l-6-6 6-6" />
                                </svg>
                              </button>
                              <span className="text-sm font-semibold text-[var(--ink)]">
                                {calendarLabel}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  if (calendarMonth === 11) {
                                    setCalendarMonth(0);
                                    setCalendarYear((prev) => prev + 1);
                                  } else {
                                    setCalendarMonth((prev) => prev + 1);
                                  }
                                }}
                                className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] text-[var(--muted)] transition hover:border-[var(--accent)]"
                                aria-label="Próximo mês"
                              >
                                <svg
                                  aria-hidden="true"
                                  viewBox="0 0 24 24"
                                  className="h-4 w-4"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M9 6l6 6-6 6" />
                                </svg>
                              </button>
                            </div>
                            <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-[var(--muted)]">
                              {calendarWeekdays.map((weekday) => (
                                <span key={weekday}>{weekday}</span>
                              ))}
                            </div>
                            <div className="mt-2 grid grid-cols-7 gap-1 text-center text-sm">
                              {calendarDays.map((day, index) => {
                                if (!day) {
                                  return <span key={`empty-${index}`} />;
                                }
                                const isSelected =
                                  Boolean(calendarSelectedParts) &&
                                  day === calendarSelectedParts?.day &&
                                  calendarMonth === calendarSelectedParts?.monthIndex &&
                                  calendarYear === calendarSelectedParts?.year;
                                return (
                                  <button
                                    key={`${calendarYear}-${calendarMonth}-${day}`}
                                    type="button"
                                    onClick={() => {
                                      setCalendarTempDate(
                                        formatDateKey(
                                          calendarYear,
                                          calendarMonth,
                                          day,
                                        ),
                                      );
                                    }}
                                    className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition ${
                                      isSelected
                                        ? "bg-[var(--accent)] text-white"
                                        : "text-[var(--ink)] hover:bg-slate-100"
                                    }`}
                                  >
                                    {day}
                                  </button>
                                );
                              })}
                            </div>
                            <div className="mt-4 flex items-center justify-between">
                              <button
                                type="button"
                                onClick={() => setIsCalendarOpen(false)}
                                className="text-xs font-semibold text-[var(--muted)] transition hover:text-[var(--ink)]"
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setTransactionDate(calendarTempDate);
                                  setDatePreset("custom");
                                  setIsCalendarOpen(false);
                                }}
                                className="text-xs font-semibold text-[var(--accent-strong)] transition hover:text-[var(--accent)]"
                              >
                                OK
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {isAccountModalOpen ? (
                <div className="fixed inset-0 z-50 flex items-start justify-center px-3 py-4 sm:items-center sm:px-4 sm:py-6">
                  <button
                    type="button"
                    aria-label="Fechar modal"
                    onClick={closeAccountModal}
                    className="absolute inset-0 animate-[overlay-in_0.2s_ease-out] bg-slate-900/40 backdrop-blur-sm"
                  />
                  <div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="conta-modal-title"
                    className="relative z-10 w-full max-w-lg animate-[modal-in_0.22s_ease-out] overflow-hidden rounded-3xl border border-[var(--border)] bg-white shadow-[var(--shadow)]"
                  >
                    <div className="flex items-start justify-between gap-2 border-b border-[var(--border)] px-5 py-4">
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">
                          {isEditingAccount ? "Editar conta" : "Nova conta"}
                        </p>
                        <h2
                          id="conta-modal-title"
                          className="mt-1 text-lg font-semibold text-[var(--ink)]"
                        >
                          {isEditingAccount
                            ? "Atualizar informações"
                            : "Adicionar conta"}
                        </h2>
                      </div>
                      <button
                        type="button"
                        onClick={closeAccountModal}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] bg-white text-[var(--muted)] shadow-sm transition hover:border-[var(--accent)] hover:text-[var(--ink)]"
                        aria-label="Fechar"
                      >
                        <svg
                          aria-hidden="true"
                          viewBox="0 0 24 24"
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M18 6L6 18" />
                          <path d="M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <div className="px-5 py-5">
                      <form
                        className="grid gap-4"
                        onSubmit={
                          isEditingAccount ? handleUpdateAccount : handleCreateAccount
                        }
                      >
                        <div className="grid gap-2">
                          <label className="text-xs font-semibold text-[var(--muted)]">
                            Nome da conta
                          </label>
                          <input
                            value={accountName}
                            onChange={(event) =>
                              setAccountName(event.target.value)
                            }
                            placeholder="Ex.: Conta principal"
                            className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm text-[var(--ink)] shadow-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]"
                          />
                        </div>
                        <div className="grid gap-2">
                          <label className="text-xs font-semibold text-[var(--muted)]">
                            Ícone da conta
                          </label>
                          <div className="grid gap-4">
                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">
                                Ícones
                              </p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {baseAccountIconOptions.map((option) => {
                                  const isActive = accountIconKey === option.key;
                                  return (
                                    <button
                                      key={option.key}
                                      type="button"
                                      onClick={() => setAccountIconKey(option.key)}
                                      aria-label={option.label}
                                      aria-pressed={isActive}
                                      title={option.label}
                                      className={`flex h-10 w-10 items-center justify-center rounded-full border transition ${
                                        isActive
                                          ? "border-[var(--accent)] ring-2 ring-[var(--ring)]"
                                          : "border-[var(--border)] hover:border-[var(--accent)]"
                                      }`}
                                      style={{
                                        backgroundColor: accountIconBg,
                                        color: accountIconColor,
                                      }}
                                    >
                                      {option.key === "initials" ? (
                                        <span className="text-[10px] font-semibold">
                                          Aa
                                        </span>
                                      ) : (
                                        option.icon?.({ className: "h-4 w-4" })
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                            {bankLogoOptions.length ? (
                              <div>
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">
                                    Bancos
                                  </p>
                                  <input
                                    value={bankLogoSearch}
                                    onChange={(event) =>
                                      setBankLogoSearch(event.target.value)
                                    }
                                    placeholder="Buscar banco"
                                    className="w-full max-w-[220px] rounded-full border border-[var(--border)] bg-white px-3 py-1.5 text-xs text-[var(--ink)] shadow-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]"
                                  />
                                </div>
                                <div className="mt-2 grid max-h-48 grid-cols-6 gap-2 overflow-auto pr-1 sm:grid-cols-8">
                                  {filteredBankLogoOptions.map((option) => {
                                    const isActive = accountIconKey === option.key;
                                    return (
                                      <button
                                        key={option.key}
                                        type="button"
                                        onClick={() => setAccountIconKey(option.key)}
                                        aria-label={option.label}
                                        aria-pressed={isActive}
                                        title={option.label}
                                        className={`flex h-10 w-10 items-center justify-center rounded-full border transition ${
                                          isActive
                                            ? "border-[var(--accent)] ring-2 ring-[var(--ring)]"
                                            : "border-[var(--border)] hover:border-[var(--accent)]"
                                        }`}
                                        style={{
                                          backgroundColor: accountIconBg,
                                        }}
                                      >
                                        <img
                                          src={option.imageSrc}
                                          alt={option.label}
                                          className="h-5 w-5 object-contain"
                                          loading="lazy"
                                        />
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            ) : null}
                          </div>
                          <p className="text-xs text-[var(--muted)]">
                            Escolha um ícone para facilitar a identificação da conta.
                          </p>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="grid gap-2">
                            <label className="text-xs font-semibold text-[var(--muted)]">
                              Cor do fundo
                            </label>
                            <div className="flex items-center gap-3">
                              <input
                                type="color"
                                value={accountIconBg}
                                onChange={(event) =>
                                  setAccountIconBg(event.target.value)
                                }
                                className="h-10 w-12 rounded-lg border border-[var(--border)] bg-white shadow-sm"
                              />
                              <span className="text-xs font-semibold text-[var(--muted)]">
                                {accountIconBg.toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <div className="grid gap-2">
                            <label className="text-xs font-semibold text-[var(--muted)]">
                              Cor do ícone
                            </label>
                            <div className="flex items-center gap-3">
                              <input
                                type="color"
                                value={accountIconColor}
                                onChange={(event) =>
                                  setAccountIconColor(event.target.value)
                                }
                                className="h-10 w-12 rounded-lg border border-[var(--border)] bg-white shadow-sm"
                              />
                              <span className="text-xs font-semibold text-[var(--muted)]">
                                {accountIconColor.toUpperCase()}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="grid gap-2">
                          <label className="text-xs font-semibold text-[var(--muted)]">
                            Saldo inicial (opcional)
                          </label>
                          <input
                            value={accountOpeningBalance}
                            onChange={(event) =>
                              setAccountOpeningBalance(event.target.value)
                            }
                            placeholder="R$ 0,00"
                            inputMode="decimal"
                            className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm text-[var(--ink)] shadow-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]"
                          />
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="grid gap-2">
                            <label className="text-xs font-semibold text-[var(--muted)]">
                              Tipo
                            </label>
                            <select
                              value={accountType}
                              onChange={(event) =>
                                setAccountType(event.target.value)
                              }
                              className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm text-[var(--ink)] shadow-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <option value="checking">Conta corrente</option>
                              <option value="savings">Poupança</option>
                              <option value="credit_card">Cartão</option>
                              <option value="cash">Dinheiro</option>
                            </select>
                          </div>
                          <div className="grid gap-2">
                            <label className="text-xs font-semibold text-[var(--muted)]">
                              Visibilidade
                            </label>
                            <select
                              value={accountVisibility}
                              onChange={(event) =>
                                setAccountVisibility(event.target.value)
                              }
                              className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm text-[var(--ink)] shadow-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]"
                            >
                              <option value="shared">Compartilhada</option>
                              <option value="private">Privada</option>
                            </select>
                          </div>
                        </div>
                        {accountError ? (
                          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                            {accountError}
                          </div>
                        ) : null}
                        <div className="grid gap-3 sm:grid-cols-2">
                          <button
                            type="button"
                            onClick={closeAccountModal}
                            className={`${secondaryButton} w-full`}
                          >
                            Cancelar
                          </button>
                          <button
                            type="submit"
                            disabled={isCreatingAccount || !activeFamilyId}
                            className={`${primaryButton} w-full disabled:cursor-not-allowed disabled:opacity-70`}
                          >
                            {isCreatingAccount
                              ? "Salvando..."
                              : isEditingAccount
                                ? "Salvar alterações"
                                : "Criar conta"}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              ) : null}

              {isCategoryModalOpen ? (
                <div className="fixed inset-0 z-50 flex items-start justify-center px-3 py-4 sm:items-center sm:px-4 sm:py-6">
                  <button
                    type="button"
                    aria-label="Fechar modal"
                    onClick={closeCategoryModal}
                    className="absolute inset-0 animate-[overlay-in_0.2s_ease-out] bg-slate-900/40 backdrop-blur-sm"
                  />
                  <div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="categoria-modal-title"
                    className="relative z-10 w-full max-w-lg animate-[modal-in_0.22s_ease-out] overflow-hidden rounded-3xl border border-[var(--border)] bg-white shadow-[var(--shadow)]"
                  >
                    <div className="flex items-start justify-between gap-2 border-b border-[var(--border)] px-5 py-4">
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">
                          {isEditingCategory ? "Editar categoria" : "Nova categoria"}
                        </p>
                        <h2
                          id="categoria-modal-title"
                          className="mt-1 text-lg font-semibold text-[var(--ink)]"
                        >
                          {isEditingCategory
                            ? "Atualizar informações"
                            : "Adicionar categoria"}
                        </h2>
                      </div>
                      <button
                        type="button"
                        onClick={closeCategoryModal}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] bg-white text-[var(--muted)] shadow-sm transition hover:border-[var(--accent)] hover:text-[var(--ink)]"
                        aria-label="Fechar"
                      >
                        <svg
                          aria-hidden="true"
                          viewBox="0 0 24 24"
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M18 6L6 18" />
                          <path d="M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <div className="px-5 py-5">
                      <form
                        className="grid gap-4"
                        onSubmit={
                          isEditingCategory
                            ? handleUpdateCategory
                            : handleCreateCategory
                        }
                      >
                        <div className="grid gap-2">
                          <label className="text-xs font-semibold text-[var(--muted)]">
                            Nome da categoria
                          </label>
                          <input
                            value={categoryName}
                            onChange={(event) =>
                              setCategoryName(event.target.value)
                            }
                            placeholder="Ex.: Moradia"
                            className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm text-[var(--ink)] shadow-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]"
                          />
                        </div>
                        <div className="grid gap-2">
                          <label className="text-xs font-semibold text-[var(--muted)]">
                            Tipo
                          </label>
                          <div className="flex items-center gap-1 rounded-full border border-[var(--border)] bg-white px-1 py-1 shadow-sm">
                            {categoryTypeTabs.map((option) => {
                              const isActive = categoryType === option.value;
                              return (
                                <button
                                  key={option.value}
                                  type="button"
                                  onClick={() => {
                                    if (isCategoryTypeLocked) {
                                      return;
                                    }
                                    setCategoryType(option.value);
                                    if (
                                      categoryParentId &&
                                      selectedParentCategory &&
                                      selectedParentCategory.category_type !==
                                        option.value
                                    ) {
                                      setCategoryParentId("");
                                    }
                                  }}
                                  disabled={isCategoryTypeLocked}
                                  className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                                    isActive ? option.active : option.inactive
                                  } ${
                                    isCategoryTypeLocked
                                      ? "cursor-not-allowed opacity-60"
                                      : ""
                                  }`}
                                >
                                  {option.label}
                                </button>
                              );
                            })}
                          </div>
                          {isCategoryTypeLocked ? (
                            <p className="text-xs text-[var(--muted)]">
                              O tipo segue a categoria principal.
                            </p>
                          ) : null}
                        </div>
                        <div className="grid gap-2">
                          <label className="text-xs font-semibold text-[var(--muted)]">
                            Categoria principal (opcional)
                          </label>
                          <select
                            value={categoryParentId}
                            onChange={(event) => {
                              if (isEditingCategory && editingCategoryHasChildren) {
                                return;
                              }
                              const nextParentId = event.target.value;
                              setCategoryParentId(nextParentId);
                              if (nextParentId) {
                                const parentCategory =
                                  categoriesById[nextParentId];
                                if (
                                  parentCategory &&
                                  parentCategory.category_type !== categoryType
                                ) {
                                  setCategoryType(parentCategory.category_type);
                                }
                              }
                            }}
                            disabled={isEditingCategory && editingCategoryHasChildren}
                            className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm text-[var(--ink)] shadow-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]"
                          >
                            <option value="">Sem categoria principal</option>
                            {categoryParentOptions.map((category) => (
                              <option key={category.id} value={category.id}>
                                {getCategoryDisplayLabel(category.id, category.name)}
                              </option>
                            ))}
                          </select>
                          {isEditingCategory && editingCategoryHasChildren ? (
                            <p className="text-xs text-[var(--muted)]">
                              Essa categoria tem subcategorias; não pode virar subcategoria.
                            </p>
                          ) : null}
                        </div>
                        <div className="grid gap-2">
                          <label className="text-xs font-semibold text-[var(--muted)]">
                            Ícone da categoria
                          </label>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {categoryIconOptions.map((option) => {
                              const isActive = categoryIconKey === option.key;
                              return (
                                <button
                                  key={option.key}
                                  type="button"
                                  onClick={() => setCategoryIconKey(option.key)}
                                  aria-label={option.label}
                                  aria-pressed={isActive}
                                  title={option.label}
                                  className={`flex h-10 w-10 items-center justify-center rounded-full border transition ${
                                    isActive
                                      ? "border-[var(--accent)] ring-2 ring-[var(--ring)]"
                                      : "border-[var(--border)] hover:border-[var(--accent)]"
                                  }`}
                                  style={{
                                    backgroundColor: categoryIconBg,
                                    color: categoryIconColor,
                                  }}
                                >
                                  {option.icon ? (
                                    option.icon({ className: "h-4 w-4" })
                                  ) : (
                                    <span className="text-[10px] font-semibold">
                                      Aa
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                          <p className="text-xs text-[var(--muted)]">
                            Escolha um ícone para identificar rapidamente a
                            categoria.
                          </p>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="grid gap-2">
                            <label className="text-xs font-semibold text-[var(--muted)]">
                              Cor do fundo
                            </label>
                            <div className="flex items-center gap-3">
                              <input
                                type="color"
                                value={categoryIconBg}
                                onChange={(event) =>
                                  setCategoryIconBg(event.target.value)
                                }
                                className="h-10 w-12 rounded-lg border border-[var(--border)] bg-white shadow-sm"
                              />
                              <span className="text-xs font-semibold text-[var(--muted)]">
                                {categoryIconBg.toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <div className="grid gap-2">
                            <label className="text-xs font-semibold text-[var(--muted)]">
                              Cor do ícone
                            </label>
                            <div className="flex items-center gap-3">
                              <input
                                type="color"
                                value={categoryIconColor}
                                onChange={(event) =>
                                  setCategoryIconColor(event.target.value)
                                }
                                className="h-10 w-12 rounded-lg border border-[var(--border)] bg-white shadow-sm"
                              />
                              <span className="text-xs font-semibold text-[var(--muted)]">
                                {categoryIconColor.toUpperCase()}
                              </span>
                            </div>
                          </div>
                        </div>
                        {categoryError ? (
                          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                            {categoryError}
                          </div>
                        ) : null}
                        <div className="grid gap-3 sm:grid-cols-2">
                          <button
                            type="button"
                            onClick={closeCategoryModal}
                            className={`${secondaryButton} w-full`}
                          >
                            Cancelar
                          </button>
                          <button
                            type="submit"
                            disabled={isCreatingCategory || !activeFamilyId}
                            className={`${primaryButton} w-full disabled:cursor-not-allowed disabled:opacity-70`}
                          >
                            {isCreatingCategory
                              ? "Salvando..."
                              : isEditingCategory
                                ? "Salvar alterações"
                                : "Criar categoria"}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              ) : null}

              {isBalanceAdjustOpen ? (
                <div className="fixed inset-0 z-50 flex items-start justify-center px-3 py-4 sm:items-center sm:px-4 sm:py-6">
                  <button
                    type="button"
                    aria-label="Fechar modal"
                    onClick={closeBalanceAdjust}
                    className="absolute inset-0 animate-[overlay-in_0.2s_ease-out] bg-slate-900/40 backdrop-blur-sm"
                  />
                  <div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="ajuste-modal-title"
                    className="relative z-10 w-full max-w-lg animate-[modal-in_0.22s_ease-out] overflow-hidden rounded-3xl border border-[var(--border)] bg-white shadow-[var(--shadow)]"
                  >
                    <div className="flex items-start justify-between gap-2 border-b border-[var(--border)] px-5 py-4">
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">
                          Ajuste de saldo
                        </p>
                        <h2
                          id="ajuste-modal-title"
                          className="mt-1 text-lg font-semibold text-[var(--ink)]"
                        >
                          {balanceAdjustAccount?.name ?? "Conta"}
                        </h2>
                      </div>
                      <button
                        type="button"
                        onClick={closeBalanceAdjust}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] bg-white text-[var(--muted)] shadow-sm transition hover:border-[var(--accent)] hover:text-[var(--ink)]"
                        aria-label="Fechar"
                      >
                        <svg
                          aria-hidden="true"
                          viewBox="0 0 24 24"
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M18 6L6 18" />
                          <path d="M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <div className="px-5 py-5">
                      <form className="grid gap-4" onSubmit={handleAdjustBalance}>
                        <div className="rounded-2xl border border-[var(--border)] bg-slate-50 px-4 py-3 text-sm text-[var(--muted)]">
                          Saldo atual:{" "}
                          <span className="font-semibold text-[var(--ink)]">
                            {currencyFormatter.format(balanceAdjustCurrent)}
                          </span>{" "}
                          <span className="text-xs">(até {monthLabel})</span>
                        </div>
                        <div className="grid gap-2">
                          <label className="text-xs font-semibold text-[var(--muted)]">
                            Saldo desejado
                          </label>
                          <input
                            value={balanceAdjustTarget}
                            onChange={(event) =>
                              setBalanceAdjustTarget(event.target.value)
                            }
                            placeholder="R$ 0,00"
                            inputMode="decimal"
                            className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm text-[var(--ink)] shadow-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]"
                          />
                        </div>
                        {balanceAdjustDifference !== null &&
                        Number.isFinite(balanceAdjustDifference) ? (
                          <div className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm">
                            <span className="text-[var(--muted)]">Diferença</span>
                            <span
                              className={`font-semibold ${
                                balanceAdjustDifference < 0
                                  ? "text-rose-600"
                                  : balanceAdjustDifference > 0
                                    ? "text-emerald-600"
                                    : "text-[var(--muted)]"
                              }`}
                            >
                              {balanceAdjustDifference < 0 ? "-" : "+"}{" "}
                              {currencyFormatter.format(
                                Math.abs(balanceAdjustDifference),
                              )}
                            </span>
                          </div>
                        ) : null}
                        <div className="grid gap-2">
                          <label className="text-xs font-semibold text-[var(--muted)]">
                            Como ajustar
                          </label>
                          <div className="grid gap-2 sm:grid-cols-2">
                            <button
                              type="button"
                              onClick={() => {
                                setBalanceAdjustMethod("opening");
                                setBalanceAdjustCategoryId("");
                              }}
                              className={`rounded-xl border px-4 py-3 text-xs font-semibold transition ${
                                balanceAdjustMethod === "opening"
                                  ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-strong)]"
                                  : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--ink)]"
                              }`}
                              aria-pressed={balanceAdjustMethod === "opening"}
                            >
                              Alterar saldo inicial
                            </button>
                            <button
                              type="button"
                              onClick={() => setBalanceAdjustMethod("transaction")}
                              className={`rounded-xl border px-4 py-3 text-xs font-semibold transition ${
                                balanceAdjustMethod === "transaction"
                                  ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-strong)]"
                                  : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--ink)]"
                              }`}
                              aria-pressed={balanceAdjustMethod === "transaction"}
                            >
                              Criar lançamento
                            </button>
                          </div>
                        </div>
                        {balanceAdjustMethod === "transaction" ? (
                          <div className="grid gap-2">
                            <label className="text-xs font-semibold text-[var(--muted)]">
                              Categoria do ajuste
                            </label>
                            <select
                              value={balanceAdjustCategoryId}
                              onChange={(event) =>
                                setBalanceAdjustCategoryId(event.target.value)
                              }
                              disabled={!balanceAdjustType}
                              className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm text-[var(--ink)] shadow-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]"
                            >
                              <option value="">
                                Ajuste de saldo (padrão)
                              </option>
                              {balanceAdjustCategories.map((category) => (
                                <option key={category.id} value={category.id}>
                                  {getCategoryDisplayLabel(category.id, category.name)}
                                </option>
                              ))}
                            </select>
                            <p className="text-xs text-[var(--muted)]">
                              Se não escolher, criamos a categoria padrão para o tipo
                              do ajuste.
                            </p>
                          </div>
                        ) : (
                          <p className="text-xs text-[var(--muted)]">
                            Essa opção altera o saldo inicial da conta para atingir o
                            valor desejado.
                          </p>
                        )}
                        {balanceAdjustError ? (
                          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                            {balanceAdjustError}
                          </div>
                        ) : null}
                        <div className="grid gap-3 sm:grid-cols-2">
                          <button
                            type="button"
                            onClick={closeBalanceAdjust}
                            className={`${secondaryButton} w-full`}
                          >
                            Cancelar
                          </button>
                          <button
                            type="submit"
                            disabled={isAdjustingBalance}
                            className={`${primaryButton} w-full disabled:cursor-not-allowed disabled:opacity-70`}
                          >
                            {isAdjustingBalance ? "Ajustando..." : "Confirmar ajuste"}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              ) : null}

              {isFilterCalendarOpen ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
                  <button
                    type="button"
                    aria-label="Fechar calendário"
                    onClick={closeFilterCalendar}
                    className="absolute inset-0 animate-[overlay-in_0.2s_ease-out] bg-slate-900/40 backdrop-blur-sm"
                  />
                  <div className="relative z-10 w-full max-w-sm overflow-hidden rounded-3xl border border-[var(--border)] bg-white shadow-[var(--shadow)]">
                    <div className="-mx-px -mt-px rounded-t-3xl bg-[var(--accent)] px-5 py-4 text-white">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/70">
                        {filterCalendarContext === "statement"
                          ? filterCalendarTarget === "end"
                            ? "Data final do extrato"
                            : "Data inicial do extrato"
                          : filterCalendarTarget === "end"
                            ? "Data final"
                            : "Data inicial"}
                      </p>
                      <p className="mt-1 text-lg font-semibold">
                        {filterCalendarSelectedLabel}
                      </p>
                    </div>
                    <div className="px-5 py-4">
                      <div className="flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => {
                            if (filterCalendarMonth === 0) {
                              setFilterCalendarMonth(11);
                              setFilterCalendarYear((prev) => prev - 1);
                            } else {
                              setFilterCalendarMonth((prev) => prev - 1);
                            }
                          }}
                          className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] text-[var(--muted)] transition hover:border-[var(--accent)]"
                          aria-label="Mês anterior"
                        >
                          <svg
                            aria-hidden="true"
                            viewBox="0 0 24 24"
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M15 18l-6-6 6-6" />
                          </svg>
                        </button>
                        <span className="text-sm font-semibold text-[var(--ink)]">
                          {filterCalendarLabel}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            if (filterCalendarMonth === 11) {
                              setFilterCalendarMonth(0);
                              setFilterCalendarYear((prev) => prev + 1);
                            } else {
                              setFilterCalendarMonth((prev) => prev + 1);
                            }
                          }}
                          className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] text-[var(--muted)] transition hover:border-[var(--accent)]"
                          aria-label="Próximo mês"
                        >
                          <svg
                            aria-hidden="true"
                            viewBox="0 0 24 24"
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M9 6l6 6-6 6" />
                          </svg>
                        </button>
                      </div>
                      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-[var(--muted)]">
                        {calendarWeekdays.map((weekday) => (
                          <span key={weekday}>{weekday}</span>
                        ))}
                      </div>
                      <div className="mt-2 grid grid-cols-7 gap-1 text-center text-sm">
                        {filterCalendarDays.map((day, index) => {
                          if (!day) {
                            return <span key={`empty-${index}`} />;
                          }
                          const isSelected =
                            Boolean(filterCalendarSelectedParts) &&
                            day === filterCalendarSelectedParts?.day &&
                            filterCalendarMonth ===
                              filterCalendarSelectedParts?.monthIndex &&
                            filterCalendarYear === filterCalendarSelectedParts?.year;
                          return (
                            <button
                              key={`${filterCalendarYear}-${filterCalendarMonth}-${day}`}
                              type="button"
                              onClick={() => {
                                setFilterCalendarTempDate(
                                  formatDateKey(
                                    filterCalendarYear,
                                    filterCalendarMonth,
                                    day,
                                  ),
                                );
                              }}
                              className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition ${
                                isSelected
                                  ? "bg-[var(--accent)] text-white"
                                  : "text-[var(--ink)] hover:bg-slate-100"
                              }`}
                            >
                              {day}
                            </button>
                          );
                        })}
                      </div>
                      <div className="mt-4 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={closeFilterCalendar}
                          className="text-xs font-semibold text-[var(--muted)] transition hover:text-[var(--ink)]"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={applyFilterCalendar}
                          className="text-xs font-semibold text-[var(--accent-strong)] transition hover:text-[var(--accent)]"
                        >
                          OK
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {isLoadingMemberships ? (
                <div className="rounded-3xl border border-[var(--border)] bg-white/80 p-6 shadow-sm">
                  <p className="text-sm text-[var(--muted)]">
                    Carregando famílias...
                  </p>
                </div>
              ) : memberships.length === 0 ? (
                <section className="rounded-3xl border border-[var(--border)] bg-white/80 p-6 shadow-sm">
                  <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">
                    Criar família
                  </h2>
                  <p className="mt-3 text-sm text-[var(--muted)]">
                    Defina o grupo principal para organizar contas, lançamentos
                    e permissoes.
                  </p>
                  <form
                    className="mt-4 flex flex-col gap-3"
                    onSubmit={handleCreateFamily}
                  >
                    <input
                      value={familyName}
                      onChange={(event) => setFamilyName(event.target.value)}
                      placeholder="Ex.: Família Silva"
                      className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm text-[var(--ink)] shadow-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]"
                    />
                    {createError ? (
                      <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                        {createError}
                      </div>
                    ) : null}
                    <button
                      type="submit"
                      disabled={isCreatingFamily}
                      className={`${primaryButton} w-full disabled:cursor-not-allowed disabled:opacity-70`}
                    >
                      {isCreatingFamily ? "Criando..." : "Criar família"}
                    </button>
                  </form>
                </section>
              ) : (
                <main className="flex flex-col gap-4 sm:gap-6">
                  {isDashboardView ? (
                    <>
                    <section className="grid gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-2xl bg-gradient-to-br from-sky-500 to-sky-600 px-3 py-4 text-white shadow-sm sm:p-4">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-100">
                            Saldo nas contas
                          </p>
                          <span
                            aria-label={`Saldo ${balanceIndicator.label}`}
                            className={`inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold ${balanceIndicator.text}`}
                          >
                            <span className={`h-2 w-2 rounded-full ${balanceIndicator.dot}`} />
                            {balanceIndicator.label}
                          </span>
                        </div>
                        <p className={`mt-2 text-2xl font-semibold ${balanceValueTone}`}>
                          {balanceDisplay}
                        </p>
                        <p className="mt-1 text-xs text-sky-100">
                          Até {monthLabel}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 px-3 py-4 text-white shadow-sm sm:p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-100">
                          Receitas
                        </p>
                        <p className="mt-2 text-2xl font-semibold">
                          {currencyFormatter.format(monthlySummary.income)}
                        </p>
                        <p className="mt-1 text-xs text-emerald-100">
                          Período: {monthLabel}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-gradient-to-br from-rose-500 to-rose-600 px-3 py-4 text-white shadow-sm sm:p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-rose-100">
                          Despesas
                        </p>
                        <p className="mt-2 text-2xl font-semibold">
                          {currencyFormatter.format(monthlySummary.expense)}
                        </p>
                        <p className="mt-1 text-xs text-rose-100">
                          Período: {monthLabel}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 px-3 py-4 text-white shadow-sm sm:p-4">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-100">
                            Resultado do mês
                          </p>
                          <span
                            aria-label={`Resultado ${resultIndicator.label}`}
                            className={`inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold ${resultIndicator.text}`}
                          >
                            <span className={`h-2 w-2 rounded-full ${resultIndicator.dot}`} />
                            {resultIndicator.label}
                          </span>
                        </div>
                        <p className={`mt-2 text-2xl font-semibold ${resultValueTone}`}>
                          {resultDisplay}
                        </p>
                        <p className="mt-1 text-xs text-amber-100">
                          Período: {monthLabel}
                        </p>
                      </div>
                    </section>
                    <section className="grid gap-4 sm:gap-6 xl:grid-cols-2">
	                      <div className="rounded-3xl border border-[var(--border)] bg-white/80 px-1.5 py-4 shadow-sm sm:p-6">
	                        <div className="flex flex-wrap items-center justify-between gap-2">
	                          <div className="pl-1 sm:pl-0">
	                            <h3 className="text-base font-semibold uppercase tracking-[0.2em] text-[var(--ink)] sm:text-lg sm:tracking-[0.24em]">
	                              Contas com maior saldo
	                            </h3>
	                            <p className="mt-1 text-sm text-[var(--muted)]">
	                              Até {monthLabel}
	                            </p>
	                          </div>
	                        </div>
	                        <div className="mt-4 space-y-3">
	                          {isLoadingBalances ? (
	                            <p className="text-sm text-[var(--muted)]">
	                              Calculando saldos...
                            </p>
                          ) : topAccountsByBalance.length === 0 ? (
                            <p className="text-sm text-[var(--muted)]">
                              Nenhuma conta criada ainda.
                            </p>
                          ) : (
                            topAccountsByBalance.map((account) => {
                              const tone =
                                account.balance < 0
                                  ? "text-rose-600"
                                  : account.balance > 0
                                    ? "text-emerald-600"
                                    : "text-[var(--muted)]";
		                              return (
		                                <button
		                                  key={account.id}
		                                  type="button"
		                                  onClick={() => openAccountTransactions(account.id)}
		                                  className="flex w-full min-w-0 items-center justify-between gap-3 overflow-hidden rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-left shadow-sm transition hover:border-[var(--accent)]"
		                                >
		                                  <div className="flex min-w-0 flex-1 items-center gap-3">
		                                    {renderAccountIcon(account)}
		                                    <div className="min-w-0">
	                                      <p className="truncate text-sm font-semibold text-[var(--ink)]">
	                                        {account.name}
	                                      </p>
                                      <p className="text-xs text-[var(--muted)]">
                                        {account.account_type}
                                      </p>
                                    </div>
                                  </div>
		                                  <span
		                                    className={`shrink-0 max-w-[110px] truncate text-right text-sm font-semibold tabular-nums ${tone}`}
		                                    title={currencyFormatter.format(account.balance)}
		                                  >
		                                    <span className="sm:hidden">
		                                      {formatCompactBRL(account.balance)}
		                                    </span>
		                                    <span className="hidden sm:inline">
		                                      {currencyFormatter.format(account.balance)}
	                                    </span>
	                                  </span>
	                                </button>
		                              );
		                            })
		                          )}
	                        </div>
	                        {!isLoadingBalances && topAccountsByBalance.length > 0 ? (
	                          <button
	                            type="button"
	                            onClick={() => setActiveView("accounts")}
	                            className="mt-4 inline-flex w-full items-center justify-center rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm font-semibold text-[var(--ink)] shadow-sm transition hover:border-[var(--accent)]"
	                          >
	                            Ver todas as contas
	                          </button>
	                        ) : null}
	                      </div>

	                      <div className="rounded-3xl border border-[var(--border)] bg-white/80 px-1.5 py-4 shadow-sm sm:p-6">
	                        <div className="flex flex-wrap items-center justify-between gap-2">
	                          <div className="pl-1 sm:pl-0">
	                            <h3 className="text-base font-semibold uppercase tracking-[0.2em] text-[var(--ink)] sm:text-lg sm:tracking-[0.24em]">
	                              Últimas transações
	                            </h3>
	                            <p className="mt-1 text-sm text-[var(--muted)]">
	                              {monthLabel}
	                            </p>
	                          </div>
	                        </div>
	                        <div className="mt-4 space-y-3">
                          {isLoadingTransactions ? (
                            <p className="text-sm text-[var(--muted)]">
                              Carregando lançamentos...
                            </p>
                          ) : transactions.length === 0 ? (
                            <p className="text-sm text-[var(--muted)]">
                              Nenhum lançamento encontrado.
                            </p>
                          ) : (
                            transactions.slice(0, 8).map((item) => {
                              const type =
                                item.source === "transfer"
                                  ? "transfer"
                                  : item.source === "adjustment"
                                    ? "adjustment"
                                    : item.category?.category_type ?? "expense";
                              const sign =
                                type === "income"
                                  ? "+"
                                  : type === "transfer"
                                    ? item.amount > 0
                                      ? "+"
                                      : "-"
                                    : type === "adjustment"
                                      ? item.amount >= 0
                                        ? "+"
                                        : "-"
                                      : "-";
                              const tone =
                                sign === "+"
                                  ? "text-emerald-600"
                                  : "text-rose-600";
                              const label =
                                type === "transfer"
                                  ? "Transferência"
                                  : type === "adjustment"
                                    ? "Ajuste"
                                    : item.category
                                      ? getCategoryDisplayLabel(
                                          item.category.id,
                                          item.category.name,
                                        )
                                      : "Categoria";
                              const dateLabel = isDateOnly(item.posted_at)
                                ? shortDateFormatter.format(parseBrazilDate(item.posted_at))
                                : shortDateFormatter.format(parseDateValue(item.posted_at));
	                              return (
	                                <button
	                                  key={item.id}
	                                  type="button"
	                                  onClick={() => setActiveView("transactions")}
	                                  className="flex w-full min-w-0 items-center justify-between gap-3 overflow-hidden rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-left shadow-sm transition hover:border-[var(--accent)]"
	                                >
	                                  <div className="min-w-0 flex-1">
	                                    <div className="flex min-w-0 items-center justify-between gap-3">
	                                      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--ink)]">
	                                        {item.description || label}
	                                      </span>
	                                      <span
	                                        className={`shrink-0 max-w-[110px] truncate text-right text-sm font-semibold tabular-nums ${tone}`}
	                                        title={`${sign} ${currencyFormatter.format(Math.abs(item.amount))}`}
	                                      >
	                                        <span className="sm:hidden">
	                                          {sign} {formatCompactBRL(Math.abs(item.amount))}
	                                        </span>
	                                        <span className="hidden sm:inline">
	                                          {sign} {currencyFormatter.format(Math.abs(item.amount))}
	                                        </span>
	                                      </span>
	                                    </div>
	                                    <p className="mt-1 truncate text-xs text-[var(--muted)]">
	                                      {dateLabel} • {label}
	                                      {item.account?.name ? ` • ${item.account.name}` : ""}
	                                    </p>
	                                  </div>
	                                </button>
	                              );
	                            })
	                          )}
	                        </div>
	                        {!isLoadingTransactions && transactions.length > 0 ? (
	                          <button
	                            type="button"
	                            onClick={() => setActiveView("transactions")}
	                            className="mt-4 inline-flex w-full items-center justify-center rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm font-semibold text-[var(--ink)] shadow-sm transition hover:border-[var(--accent)]"
	                          >
	                            Ver todos os lançamentos
	                          </button>
	                        ) : null}
	                      </div>
                    </section>

                    <section className="grid items-stretch gap-4 sm:gap-6 xl:grid-cols-3">
                      <div className={isLoadingDashboardAnalytics ? "opacity-60" : ""}>
                        <DonutChart
                          title="Despesas por categoria"
                          segments={dashboardExpenseData}
                        />
                      </div>
                      <div className={isLoadingDashboardAnalytics ? "opacity-60" : ""}>
                        <DonutChart
                          title="Receitas por categoria"
                          segments={dashboardIncomeData}
                        />
                      </div>
                      <div className={isLoadingDashboardAnalytics ? "opacity-60" : ""}>
                        <CashflowChart
                          title="Fluxo de caixa no mês"
                          points={dashboardCashflowPoints}
                        />
                      </div>
                    </section>
                    </>
                  ) : null}

                  {isTransactionsView ? (
                    <section
                      className={`grid gap-4 sm:gap-6 ${
                        isDashboardView ? "xl:grid-cols-[minmax(0,1fr)_320px]" : ""
                      }`}
                    >
                    <div className="rounded-3xl border border-[var(--border)] bg-white/80 px-1.5 py-4 shadow-sm sm:p-6">
                      <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-4">
                        <div className="pl-1 sm:pl-0">
                          <h3 className="text-base font-semibold uppercase tracking-[0.2em] text-[var(--ink)] sm:text-lg sm:tracking-[0.24em]">
                            {isTransactionsView ? "Lançamentos" : "Últimos lançamentos"}
                          </h3>
                        </div>
                        {isTransactionsView && hasActiveFilters ? (
                          <button
                            type="button"
                            onClick={() => {
                              setFilterAccountId("");
                              setFilterCategoryId("");
                              setSearchQuery("");
                              setTypeFilters([...typeFilterAll]);
                              resetFilterDateRange();
                            }}
                            className="hidden rounded-full border border-[var(--border)] bg-white px-4 py-2 text-xs font-semibold text-[var(--ink)] transition hover:border-[var(--accent)] sm:inline-flex"
                          >
                            Limpar filtros
                          </button>
                        ) : null}
                        {isDashboardView ? (
                          <button
                            type="button"
                            onClick={() => setActiveView("transactions")}
                            className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-xs font-semibold text-[var(--ink)] transition hover:border-[var(--accent)]"
                          >
                            Ver lançamentos
                          </button>
                        ) : null}
                      </div>

                      <div className="mt-2 h-px w-full bg-[var(--border)]/60 sm:mt-3" />

                      {isTransactionsView ? (
                        <>
                          <div className="mt-4 sm:hidden">
                            <div className="rounded-2xl border border-[var(--border)] bg-white shadow-sm">
                              <div className="flex items-center justify-between px-3 py-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setIsMobileFiltersOpen((prev) => !prev)
                                  }
                                  className="flex items-center gap-2 text-xs font-semibold text-[var(--ink)]"
                                >
                                  <span className="uppercase tracking-[0.2em] text-[var(--muted)]">
                                    Filtros
                                  </span>
                                  {activeFiltersCount > 0 ? (
                                    <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--accent-strong)]">
                                      {activeFiltersCount}
                                    </span>
                                  ) : null}
                                  <svg
                                    aria-hidden="true"
                                    viewBox="0 0 24 24"
                                    className={`h-4 w-4 text-[var(--muted)] transition ${
                                      isMobileFiltersOpen ? "rotate-180" : ""
                                    }`}
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <path d="M6 9l6 6 6-6" />
                                  </svg>
                                </button>
                                {hasActiveFilters ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setFilterAccountId("");
                                      setFilterCategoryId("");
                                      setSearchQuery("");
                                      setTypeFilters([...typeFilterAll]);
                                      resetFilterDateRange();
                                      setIsMobileFiltersOpen(false);
                                    }}
                                    className="text-xs font-semibold text-[var(--accent-strong)]"
                                  >
                                    Limpar
                                  </button>
                                ) : null}
                              </div>
                              {!isMobileFiltersOpen &&
                              activeFilterChips.length > 0 ? (
                                <div className="flex flex-wrap gap-2 px-3 pb-3">
                                  {activeFilterChips.map((chip) => (
                                    <span
                                      key={chip.key}
                                      title={chip.title ?? chip.label}
                                      className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                                        chip.key === "period"
                                          ? "max-w-full whitespace-normal"
                                          : "max-w-[160px] truncate"
                                      } ${chip.className}`}
                                    >
                                      {chip.label}
                                    </span>
                                  ))}
                                </div>
                              ) : null}
                              {isMobileFiltersOpen ? (
                                <div className="grid gap-3 border-t border-[var(--border)] px-3 py-3">
                                <div className="grid gap-2">
                                  <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                                    Conta
                                  </label>
                                  <select
                                    value={filterAccountId}
                                    onChange={(event) =>
                                      setFilterAccountId(event.target.value)
                                    }
                                    className="h-10 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm text-[var(--ink)] shadow-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]"
                                  >
                                    <option value="">Todas as contas</option>
                                    {accounts.map((account) => (
                                      <option key={account.id} value={account.id}>
                                        {account.name}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div className="grid gap-2">
                                  <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                                    Categoria
                                  </label>
                                  <select
                                    value={filterCategoryId}
                                    onChange={(event) =>
                                      setFilterCategoryId(event.target.value)
                                    }
                                    className="h-10 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm text-[var(--ink)] shadow-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]"
                                  >
                                    <option value="">Todas as categorias</option>
                                    {buildCategoryOptions(
                                      undefined,
                                      true,
                                      true,
                                    ).map(
                                      (category) => (
                                        <option key={category.id} value={category.id}>
                                          {category.label}
                                        </option>
                                      ),
                                    )}
                                  </select>
                                </div>
                                <div className="grid gap-2">
                                  <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                                    Período
                                  </label>
                                  <div className="grid grid-cols-2 gap-2">
                                    <button
                                      type="button"
                                      onClick={() => openFilterCalendar("start")}
                                      aria-label="Selecionar data inicial"
                                      className="flex h-10 w-full items-center justify-between gap-2 rounded-xl border border-[var(--border)] bg-white px-3 text-xs font-semibold text-[var(--ink)] shadow-sm transition hover:border-[var(--accent)]"
                                    >
                                      <span className="truncate">
                                        {filterStartDate
                                          ? formatDate(filterStartDate)
                                          : "Data inicial"}
                                      </span>
                                      <svg
                                        aria-hidden="true"
                                        viewBox="0 0 24 24"
                                        className="h-4 w-4 text-[var(--muted)]"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      >
                                        <rect x="3" y="4" width="18" height="18" rx="2" />
                                        <path d="M16 2v4M8 2v4M3 10h18" />
                                      </svg>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => openFilterCalendar("end")}
                                      aria-label="Selecionar data final"
                                      className="flex h-10 w-full items-center justify-between gap-2 rounded-xl border border-[var(--border)] bg-white px-3 text-xs font-semibold text-[var(--ink)] shadow-sm transition hover:border-[var(--accent)]"
                                    >
                                      <span className="truncate">
                                        {filterEndDate
                                          ? formatDate(filterEndDate)
                                          : "Data final"}
                                      </span>
                                      <svg
                                        aria-hidden="true"
                                        viewBox="0 0 24 24"
                                        className="h-4 w-4 text-[var(--muted)]"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      >
                                        <rect x="3" y="4" width="18" height="18" rx="2" />
                                        <path d="M16 2v4M8 2v4M3 10h18" />
                                      </svg>
                                    </button>
                                  </div>
                                </div>
                                <div className="grid gap-2">
                                  <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                                    Tipo
                                  </label>
                                  <div className="flex flex-wrap items-center gap-1 rounded-full border border-[var(--border)] bg-white px-1 py-1 shadow-sm">
                                    {typeFilterOptions.map((option) => {
                                      const isActive = typeFilters.includes(option.value);
                                      return (
                                        <button
                                          key={option.value}
                                          type="button"
                                          aria-pressed={isActive}
                                          onClick={() => toggleTypeFilter(option.value)}
                                          className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                                            isActive ? option.active : option.inactive
                                          }`}
                                        >
                                          {option.label}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                                <div className="grid gap-2">
                                  <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                                    Busca
                                  </label>
                                  <input
                                    value={searchQuery}
                                    onChange={(event) =>
                                      setSearchQuery(event.target.value)
                                    }
                                    placeholder="Buscar lançamentos, contas ou categorias..."
                                    className="h-10 w-full rounded-xl border border-[var(--border)] bg-white px-4 text-xs font-semibold text-[var(--ink)] shadow-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]"
                                  />
                                </div>
                              </div>
                              ) : null}
                            </div>
                          </div>
                          <div className="mt-4 hidden flex-wrap items-center gap-3 sm:flex">
                            <select
                              value={filterAccountId}
                              onChange={(event) =>
                                setFilterAccountId(event.target.value)
                              }
                              className="min-w-[180px] rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--ink)] shadow-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]"
                            >
                              <option value="">Todas as contas</option>
                              {accounts.map((account) => (
                                <option key={account.id} value={account.id}>
                                  {account.name}
                                </option>
                              ))}
                            </select>
                            <select
                              value={filterCategoryId}
                              onChange={(event) =>
                                setFilterCategoryId(event.target.value)
                              }
                              className="min-w-[180px] rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--ink)] shadow-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]"
                            >
                              <option value="">Todas as categorias</option>
                              {buildCategoryOptions(
                                undefined,
                                true,
                                true,
                              ).map(
                                (category) => (
                                  <option key={category.id} value={category.id}>
                                    {category.label}
                                  </option>
                                ),
                              )}
                            </select>
                            <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-3 py-2 shadow-sm">
                              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                                Período
                              </span>
                              <button
                                type="button"
                                onClick={() => openFilterCalendar("start")}
                                aria-label="Selecionar data inicial"
                                className="flex min-w-[120px] items-center justify-between gap-2 text-xs font-semibold text-[var(--ink)] transition hover:text-[var(--accent-strong)]"
                              >
                                <span className="truncate">
                                  {filterStartDate
                                    ? formatDate(filterStartDate)
                                    : "Data inicial"}
                                </span>
                                <svg
                                  aria-hidden="true"
                                  viewBox="0 0 24 24"
                                  className="h-4 w-4 text-[var(--muted)]"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <rect x="3" y="4" width="18" height="18" rx="2" />
                                  <path d="M16 2v4M8 2v4M3 10h18" />
                                </svg>
                              </button>
                              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                                até
                              </span>
                              <button
                                type="button"
                                onClick={() => openFilterCalendar("end")}
                                aria-label="Selecionar data final"
                                className="flex min-w-[120px] items-center justify-between gap-2 text-xs font-semibold text-[var(--ink)] transition hover:text-[var(--accent-strong)]"
                              >
                                <span className="truncate">
                                  {filterEndDate ? formatDate(filterEndDate) : "Data final"}
                                </span>
                                <svg
                                  aria-hidden="true"
                                  viewBox="0 0 24 24"
                                  className="h-4 w-4 text-[var(--muted)]"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <rect x="3" y="4" width="18" height="18" rx="2" />
                                  <path d="M16 2v4M8 2v4M3 10h18" />
                                </svg>
                              </button>
                            </div>
                            <div className="flex flex-wrap items-center gap-1 rounded-full border border-[var(--border)] bg-white px-1 py-1 shadow-sm">
                              {typeFilterOptions.map((option) => {
                                const isActive = typeFilters.includes(option.value);
                                return (
                                  <button
                                    key={option.value}
                                    type="button"
                                    aria-pressed={isActive}
                                    onClick={() => toggleTypeFilter(option.value)}
                                    className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                                      isActive ? option.active : option.inactive
                                    }`}
                                  >
                                    {option.label}
                                  </button>
                                );
                              })}
                            </div>
                            <div className="min-w-[220px] flex-1">
                              <input
                                value={searchQuery}
                                onChange={(event) =>
                                  setSearchQuery(event.target.value)
                                }
                                placeholder="Buscar lançamentos, contas ou categorias..."
                                className="h-10 w-full rounded-xl border border-[var(--border)] bg-white px-4 text-xs font-semibold text-[var(--ink)] shadow-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]"
                              />
                            </div>
                          </div>
                        </>
                      ) : null}

                      <div className="mt-4 sm:hidden">
                        {isLoadingTransactions ? (
                          <p className="text-sm text-[var(--muted)]">
                            Carregando lançamentos...
                          </p>
                        ) : visibleTransactions.length === 0 ? (
                          <p className="text-sm text-[var(--muted)]">
                            Nenhum lançamento encontrado.
                          </p>
                        ) : (
                        <div className="space-y-3">
                          {mobileTransactionEntries.map(
                            ([dateKey, dayTransactions]) => (
                              <div key={dateKey}>
                                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                                    {formatMobileDate(dateKey)}
                                  </p>
                                  <div className="mt-2 space-y-2">
                                    {dayTransactions.map((transaction) => {
                                      const isTransferRow =
                                        transaction.source === "transfer";
                                      const isAdjustRow =
                                        transaction.source === "adjustment";
                                      const rawValue = Number(transaction.amount);
                                      const isNumeric = Number.isFinite(rawValue);
                                      const displayValue =
                                        (isTransferRow || isAdjustRow) && isNumeric
                                          ? Math.abs(rawValue)
                                          : rawValue;
                                      const formattedValue = isNumeric
                                        ? currencyFormatter.format(displayValue)
                                        : transaction.amount;
                                      const categoryType =
                                        transaction.category?.category_type;
                                      const sign = isTransferRow || isAdjustRow
                                        ? rawValue < 0
                                          ? "-"
                                          : "+"
                                        : categoryType === "income"
                                          ? "+"
                                          : categoryType === "expense"
                                            ? "-"
                                            : "";
                                      const valueTone =
                                        isTransferRow || isAdjustRow
                                          ? rawValue < 0
                                            ? "text-rose-600"
                                            : "text-emerald-600"
                                          : categoryType === "expense"
                                            ? "text-rose-600"
                                            : categoryType === "income"
                                              ? "text-emerald-600"
                                              : "text-[var(--ink)]";
                                      const categoryLabel = transaction.category?.id
                                        ? getCategoryDisplayLabel(
                                            transaction.category.id,
                                            transaction.category?.name,
                                          )
                                        : isTransferRow
                                          ? "Transferência"
                                          : isAdjustRow
                                            ? "Ajuste de saldo"
                                            : "Sem categoria";
                                      const title =
                                        transaction.description?.trim() ||
                                        categoryLabel;
                                      const meta = [
                                        categoryLabel,
                                        transaction.account?.name ?? "Conta",
                                      ].join(" | ");
                                      const iconTone = isTransferRow
                                        ? "bg-sky-100 text-sky-600"
                                        : isAdjustRow
                                          ? "bg-amber-100 text-amber-600"
                                        : categoryType === "income"
                                          ? "bg-emerald-100 text-emerald-600"
                                          : categoryType === "expense"
                                            ? "bg-rose-100 text-rose-600"
                                            : "bg-slate-100 text-slate-500";

                                      return (
                                        <div
                                          key={transaction.id}
                                          className="flex w-full items-start gap-3 rounded-2xl border border-[var(--border)] bg-white px-3 py-2 shadow-sm"
                                        >
                                          <div
                                            className={`flex h-10 w-10 items-center justify-center rounded-full ${iconTone}`}
                                          >
                                            {isTransferRow ? (
                                              <svg
                                                aria-hidden="true"
                                                viewBox="0 0 24 24"
                                                className="h-5 w-5"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                              >
                                                <path d="M7 7h10" />
                                                <path d="M14 4l3 3-3 3" />
                                                <path d="M17 17H7" />
                                                <path d="M10 20l-3-3 3-3" />
                                              </svg>
                                            ) : isAdjustRow ? (
                                              <svg
                                                aria-hidden="true"
                                                viewBox="0 0 24 24"
                                                className="h-5 w-5"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                              >
                                                <path d="M4 6h16" />
                                                <path d="M4 12h10" />
                                                <path d="M4 18h7" />
                                                <circle cx="18" cy="12" r="2" />
                                              </svg>
                                            ) : categoryType === "income" ? (
                                              <svg
                                                aria-hidden="true"
                                                viewBox="0 0 24 24"
                                                className="h-5 w-5"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                              >
                                                <path d="M12 19V5" />
                                                <path d="M5 12l7-7 7 7" />
                                              </svg>
                                            ) : (
                                              <svg
                                                aria-hidden="true"
                                                viewBox="0 0 24 24"
                                                className="h-5 w-5"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                              >
                                                <path d="M12 5v14" />
                                                <path d="M19 12l-7 7-7-7" />
                                              </svg>
                                            )}
                                          </div>
                                          <div className="min-w-0 flex-1">
                                            <p className="text-sm font-semibold leading-snug text-[var(--ink)] break-words">
                                              {title}
                                            </p>
                                            <p className="mt-0.5 text-xs leading-snug text-[var(--muted)] break-words">
                                              {meta}
                                            </p>
                                          </div>
                                          <div className="ml-2 shrink-0 text-right">
                                            <p
                                              className={`min-w-[88px] text-sm font-semibold ${valueTone}`}
                                            >
                                              {sign} {formattedValue}
                                            </p>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              ),
                            )}
                          </div>
                        )}
                      </div>
                      <div className="mt-4 hidden overflow-x-auto sm:block">
                        <table className="w-full text-sm">
                          <thead className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                            <tr className="border-b border-[var(--border)]">
                              <th className="py-2 text-left font-semibold">
                                Data
                              </th>
                              <th className="py-2 text-left font-semibold">
                                Categoria
                              </th>
                              <th className="py-2 text-left font-semibold">
                                Tipo
                              </th>
                              <th className="py-2 text-left font-semibold">
                                Conta
                              </th>
                              <th className="py-2 text-right font-semibold">
                                Valor
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {isLoadingTransactions ? (
                              <tr>
                                <td
                                  colSpan={5}
                                  className="py-4 text-sm text-[var(--muted)]"
                                >
                                  Carregando lançamentos...
                                </td>
                              </tr>
                            ) : visibleTransactions.length === 0 ? (
                              <tr>
                                <td
                                  colSpan={5}
                                  className="py-4 text-sm text-[var(--muted)]"
                                >
                                  Nenhum lançamento encontrado.
                                </td>
                              </tr>
                            ) : (
                              visibleTransactions.map((transaction) => {
                                const isTransferRow = transaction.source === "transfer";
                                const isAdjustRow = transaction.source === "adjustment";
                                const rawValue = Number(transaction.amount);
                                const isNumeric = Number.isFinite(rawValue);
                                const displayValue =
                                  (isTransferRow || isAdjustRow) && isNumeric
                                    ? Math.abs(rawValue)
                                    : rawValue;
                                const formattedValue = isNumeric
                                  ? currencyFormatter.format(displayValue)
                                  : transaction.amount;
                                const categoryType =
                                  transaction.category?.category_type;
                                const sign = isTransferRow || isAdjustRow
                                  ? rawValue < 0
                                    ? "-"
                                    : "+"
                                  : categoryType === "income"
                                    ? "+"
                                    : categoryType === "expense"
                                      ? "-"
                                      : "";
                                const valueTone =
                                  isTransferRow || isAdjustRow
                                    ? rawValue < 0
                                      ? "text-rose-600"
                                      : "text-emerald-600"
                                    : categoryType === "expense"
                                      ? "text-rose-600"
                                      : categoryType === "income"
                                        ? "text-emerald-600"
                                        : "text-[var(--ink)]";
                                const categoryLabel = transaction.category?.id
                                  ? getCategoryDisplayLabel(
                                      transaction.category.id,
                                      transaction.category?.name,
                                    )
                                  : isTransferRow
                                    ? "Transferência"
                                    : isAdjustRow
                                      ? "Ajuste de saldo"
                                      : "Sem categoria";
                                const typeLabel = isTransferRow
                                  ? "Transferência"
                                  : isAdjustRow
                                    ? "Ajuste"
                                    : categoryType === "income"
                                      ? "Receita"
                                      : categoryType === "expense"
                                        ? "Despesa"
                                        : "Outro";

                                return (
                                  <tr
                                    key={transaction.id}
                                    className="border-b border-[var(--border)] last:border-b-0"
                                  >
                                    <td className="py-3 text-sm text-[var(--muted)]">
                                      {formatDate(transaction.posted_at)}
                                    </td>
                                    <td className="py-3 text-sm text-[var(--ink)]">
                                      {categoryLabel}
                                    </td>
                                    <td className="py-3 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                                      {typeLabel}
                                    </td>
                                    <td className="py-3 text-sm text-[var(--muted)]">
                                      {transaction.account?.name ?? "Conta"}
                                    </td>
                                    <td className={`py-3 text-right text-sm font-semibold ${valueTone}`}>
                                      {sign} {formattedValue}
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                      {transactionsTotal !== null ? (
                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                          {showLocalFilter ? (
                            <span>Resultados: {visibleTransactions.length}</span>
                          ) : (
                            <span>
                              Exibindo {transactions.length} de {transactionsTotal}
                            </span>
                          )}
                          {isTransactionsView ? (
                            showPagination ? (
                              transactions.length < transactionsTotal ? (
                                <button
                                  type="button"
                                  disabled={isLoadingTransactions}
                                  onClick={() =>
                                    setTransactionsLimit((prev) => prev + 8)
                                  }
                                  className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-xs font-semibold text-[var(--ink)] transition hover:border-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  Mostrar mais
                                </button>
                              ) : (
                                <span>Fim da lista</span>
                              )
                            ) : (
                              <span>Filtro local aplicado</span>
                            )
                          ) : (
                            <span>Últimos lançamentos</span>
                          )}
                        </div>
                      ) : null}
                    </div>

                    {isDashboardView ? (
                      <aside className="space-y-4 sm:space-y-6">
                      <div className="rounded-3xl border border-[var(--border)] bg-white/80 px-1.5 py-4 shadow-sm sm:p-6">
                        <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">
                          Alertas
                        </h3>
                        <div className="mt-4 space-y-3 text-sm text-[var(--ink)]">
                          <div className="flex items-start gap-3 rounded-2xl border border-[var(--border)] bg-white px-3 py-2.5 sm:px-4 sm:py-3">
                            <span className="mt-1 h-2 w-2 rounded-full bg-rose-500" />
                            <div>
                              <p className="font-semibold">
                                Orçamento de alimentação estourado
                              </p>
                              <p className="text-xs text-[var(--muted)]">
                                Revise as despesas do mês.
                              </p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3 rounded-2xl border border-[var(--border)] bg-white px-3 py-2.5 sm:px-4 sm:py-3">
                            <span className="mt-1 h-2 w-2 rounded-full bg-amber-500" />
                            <div>
                              <p className="font-semibold">
                                Fatura do cartão em 5 dias
                              </p>
                              <p className="text-xs text-[var(--muted)]">
                                Agende o pagamento.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-3xl border border-[var(--border)] bg-white/80 px-1.5 py-4 shadow-sm sm:p-6">
                        <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">
                          Atalhos rápidos
                        </h3>
                        <div className="mt-4 flex flex-col gap-2 sm:gap-3">
                          <button
                            type="button"
                            onClick={() => openTransactionModal("expense")}
                            className="inline-flex items-center justify-center rounded-xl bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-blue-500/30 transition hover:bg-[var(--accent-strong)]"
                          >
                            Lançamento rápido
                          </button>
                          <button
                            type="button"
                            className="inline-flex items-center justify-center rounded-xl border border-[var(--border)] bg-white px-4 py-2 text-xs font-semibold text-[var(--ink)] shadow-sm transition hover:border-[var(--accent)]"
                            disabled
                          >
                            Criar regra
                          </button>
                          <button
                            type="button"
                            className="inline-flex items-center justify-center rounded-xl border border-[var(--border)] bg-white px-4 py-2 text-xs font-semibold text-[var(--ink)] shadow-sm transition hover:border-[var(--accent)]"
                            disabled
                          >
                            Importar extrato
                          </button>
                        </div>
                      </div>

                      <div className="rounded-3xl border border-[var(--border)] bg-white/80 px-1.5 py-4 shadow-sm sm:p-6">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">
                            Saldo por conta
                          </h3>
                          <span className="text-xs font-semibold text-[var(--muted)]">
                            Até {monthLabel}
                          </span>
                        </div>
                        <div className="mt-4 space-y-3">
                          {isLoadingBalances ? (
                            <p className="text-sm text-[var(--muted)]">
                              Calculando saldos...
                            </p>
                          ) : accounts.length === 0 ? (
                            <p className="text-sm text-[var(--muted)]">
                              Nenhuma conta criada ainda.
                            </p>
                          ) : (
                            accounts.map((account) => {
                              const balance = accountBalances[account.id] ?? 0;
                              const tone =
                                balance < 0 ? "text-rose-600" : "text-emerald-600";
                              return (
                                <div
                                  key={account.id}
                                  className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm sm:px-4 sm:py-3"
                                >
                                  <div>
                                    <p className="font-semibold text-[var(--ink)]">
                                      {account.name}
                                    </p>
                                    <p className="text-xs text-[var(--muted)]">
                                      {account.account_type.replace("_", " ")}
                                    </p>
                                  </div>
                                  <span className={`text-sm font-semibold ${tone}`}>
                                    {currencyFormatter.format(balance)}
                                  </span>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>

                      <div className="rounded-3xl border border-[var(--border)] bg-white/80 px-1.5 py-4 shadow-sm sm:p-6">
                        <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">
                          Família ativa
                        </h3>
                        <p className="mt-3 text-lg font-semibold text-[var(--ink)]">
                          {activeMembership?.family?.name ?? "Família"}
                        </p>
                        <p className="mt-1 text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                          Papel: {activeMembership?.role ?? "-"}
                        </p>
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          <div className="rounded-2xl border border-[var(--border)] bg-white px-3 py-2.5 sm:px-4 sm:py-3">
                            <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                              Famílias
                            </p>
                            <p className="mt-1 text-base font-semibold text-[var(--ink)]">
                              {memberships.length}
                            </p>
                          </div>
                          <div className="rounded-2xl border border-[var(--border)] bg-white px-3 py-2.5 sm:px-4 sm:py-3">
                            <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                              Contas
                            </p>
                            <p className="mt-1 text-base font-semibold text-[var(--ink)]">
                              {isLoadingAccounts ? "..." : accounts.length}
                            </p>
                          </div>
                          <div className="rounded-2xl border border-[var(--border)] bg-white px-3 py-2.5 sm:px-4 sm:py-3">
                            <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                              Categorias
                            </p>
                            <p className="mt-1 text-base font-semibold text-[var(--ink)]">
                              {isLoadingCategories ? "..." : categories.length}
                            </p>
                          </div>
                          <div className="rounded-2xl border border-[var(--border)] bg-white px-3 py-2.5 sm:px-4 sm:py-3">
                            <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                              Lançamentos
                            </p>
                            <p className="mt-1 text-base font-semibold text-[var(--ink)]">
                              {transactionsTotal ?? transactions.length}
                            </p>
                          </div>
                        </div>
                      </div>
                      </aside>
                    ) : null}
                  </section>
                  ) : null}

                  {isAccountsView ? (
                    <section className="rounded-3xl border border-[var(--border)] bg-white/80 px-3 py-4 shadow-sm sm:p-6">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">
                            Contas
                          </h3>
                          <p className="mt-2 text-sm text-[var(--muted)]">
                            Gerencie suas contas e crie lançamentos diretos.
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-white px-3 py-2 text-xs font-semibold text-[var(--muted)]">
                            <span>Saldo total</span>
                            <span
                              className={`text-sm ${
                                totalBalance < 0
                                  ? "text-rose-600"
                                  : totalBalance > 0
                                    ? "text-emerald-600"
                                    : "text-slate-600"
                              }`}
                            >
                              {currencyFormatter.format(totalBalance)}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowArchivedAccounts((prev) => !prev)}
                            className={`inline-flex items-center justify-center rounded-full border px-4 py-2 text-xs font-semibold transition ${
                              showArchivedAccounts
                                ? "border-[var(--accent)] text-[var(--accent)]"
                                : "border-[var(--border)] text-[var(--ink)] hover:border-[var(--accent)]"
                            }`}
                          >
                            {showArchivedAccounts ? "Ocultar arquivadas" : "Ver arquivadas"}
                          </button>
                          <button
                            type="button"
                            onClick={openAccountModal}
                            className="inline-flex items-center justify-center rounded-full border border-[var(--border)] bg-white px-4 py-2 text-xs font-semibold text-[var(--ink)] transition hover:border-[var(--accent)]"
                          >
                            Nova conta
                          </button>
                        </div>
                      </div>
                      {accountActionError ? (
                        <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                          {accountActionError}
                        </div>
                      ) : null}

                      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {accounts.map((account) => {
                          const balance = accountBalances[account.id] ?? 0;
                          const transactionCount = accountTxnCounts[account.id];
                          const hasTransactions =
                            typeof transactionCount === "number"
                              ? transactionCount > 0
                              : null;
                          const isCountLoading =
                            openAccountMenuId === account.id &&
                            transactionCount === undefined;
                          const isActionLoading = accountActionLoadingId === account.id;
                          const valueTone =
                            balance < 0 ? "text-rose-600" : "text-emerald-600";
                          const iconKey = account.icon_key ?? "initials";
                          const iconOption = accountIconLookup[iconKey];
                          const iconBg = account.icon_bg ?? "var(--accent-soft)";
                          const iconColor =
                            account.icon_color ?? "var(--accent-strong)";
                          const shouldShowInitials =
                            iconKey === "initials" ||
                            (!iconOption?.icon && !iconOption?.imageSrc);
                          const isLogo = Boolean(iconOption?.imageSrc);
                          return (
                            <div
                              key={account.id}
                              className="rounded-3xl border border-[var(--border)] bg-white p-5 shadow-sm"
                            >
                                <div className="flex items-start justify-between gap-3">
                                <div className="flex min-w-0 items-center gap-3">
                                  <span
                                    className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold"
                                    style={{ backgroundColor: iconBg, color: iconColor }}
                                  >
                                    {isLogo ? (
                                      <img
                                        src={iconOption?.imageSrc}
                                        alt={iconOption?.label ?? account.name}
                                        className="h-5 w-5 object-contain"
                                        loading="lazy"
                                      />
                                    ) : shouldShowInitials ? (
                                      account.name.slice(0, 2).toUpperCase()
                                    ) : (
                                      iconOption?.icon?.({ className: "h-5 w-5" })
                                    )}
                                  </span>
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-[var(--ink)]">
                                      {account.name}
                                    </p>
                                    <p className="text-xs text-[var(--muted)]">
                                      {account.account_type.replace("_", " ")}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => openAccountTransactions(account.id)}
                                    className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--ink)]"
                                    aria-label="Ver lançamentos da conta"
                                  >
                                    <svg
                                      aria-hidden="true"
                                      viewBox="0 0 24 24"
                                      className="h-4 w-4"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <path d="M8 6h13" />
                                      <path d="M8 12h13" />
                                      <path d="M8 18h13" />
                                      <circle cx="3" cy="6" r="1" />
                                      <circle cx="3" cy="12" r="1" />
                                      <circle cx="3" cy="18" r="1" />
                                    </svg>
                                  </button>
                                  <div
                                    className="relative"
                                    data-account-menu-id={account.id}
                                  >
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setOpenAccountMenuId((prev) => {
                                          setAccountActionError(null);
                                          return prev === account.id ? null : account.id;
                                        })
                                      }
                                      className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--ink)]"
                                      aria-label="Opções da conta"
                                      aria-expanded={openAccountMenuId === account.id}
                                    >
                                      <svg
                                        aria-hidden="true"
                                        viewBox="0 0 24 24"
                                        className="h-4 w-4"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      >
                                        <circle cx="12" cy="12" r="1.5" />
                                        <circle cx="19" cy="12" r="1.5" />
                                        <circle cx="5" cy="12" r="1.5" />
                                      </svg>
                                    </button>
	                                    {openAccountMenuId === account.id ? (
	                                      <div className="absolute right-0 z-20 mt-2 w-44 rounded-2xl border border-[var(--border)] bg-white p-2 text-sm text-[var(--ink)] shadow-lg">
	                                        <button
	                                          type="button"
	                                          onClick={() => {
	                                            setOpenAccountMenuId(null);
	                                            openAccountStatement(account.id);
	                                          }}
	                                          disabled={isActionLoading}
	                                          className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-semibold text-[var(--ink)] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
	                                        >
	                                          Ver extrato
	                                        </button>
	                                        <button
	                                          type="button"
	                                          onClick={() => {
	                                            setOpenAccountMenuId(null);
	                                            openAccountEditor(account);
                                          }}
                                          disabled={isActionLoading}
                                          className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-semibold text-[var(--ink)] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                          Editar conta
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setOpenAccountMenuId(null);
                                            handleArchiveAccount(account);
                                          }}
                                          disabled={isActionLoading}
                                          className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-semibold text-[var(--ink)] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                          {isActionLoading ? "Arquivando..." : "Arquivar conta"}
                                        </button>
                                        {isCountLoading ? (
                                          <div className="px-3 py-2 text-xs font-semibold text-[var(--muted)]">
                                            Verificando lançamentos...
                                          </div>
                                        ) : hasTransactions === false ? (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setOpenAccountMenuId(null);
                                              handleDeleteAccount(account);
                                            }}
                                            disabled={isActionLoading}
                                            className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                                          >
                                            {isActionLoading
                                              ? "Excluindo..."
                                              : "Excluir conta"}
                                          </button>
                                        ) : null}
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setOpenAccountMenuId(null);
                                            openBalanceAdjust(account.id);
                                          }}
                                          disabled={isActionLoading}
                                          className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-semibold text-[var(--ink)] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                          Ajustar saldo
                                        </button>
                                      </div>
                                    ) : null}
                                  </div>
                                </div>
                              </div>

                              <div className="mt-4 space-y-2 text-sm">
                                <div className="flex items-center justify-between text-[var(--muted)]">
                                  <span>Saldo atual</span>
                                  <span className={`font-semibold ${valueTone}`}>
                                    {currencyFormatter.format(balance)}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-xs text-[var(--muted)]">
                                  <span>Até {monthLabel}</span>
                                  <span
                                    className={
                                      account.visibility === "private"
                                        ? "text-amber-600"
                                        : "text-emerald-600"
                                    }
                                  >
                                    {account.visibility === "private"
                                      ? "Privada"
                                      : "Compartilhada"}
                                  </span>
                                </div>
                              </div>

                              <div className="mt-4 flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => openTransactionModal("expense", account.id)}
                                  className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 text-xs font-semibold text-rose-600 transition hover:border-rose-300"
                                >
                                  <svg
                                    aria-hidden="true"
                                    viewBox="0 0 24 24"
                                    className="h-4 w-4"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <path d="M12 19V5" />
                                    <path d="M18 13l-6 6-6-6" />
                                  </svg>
                                  Despesa
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openTransactionModal("income", account.id)}
                                  className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 text-xs font-semibold text-emerald-600 transition hover:border-emerald-300"
                                >
                                  <svg
                                    aria-hidden="true"
                                    viewBox="0 0 24 24"
                                    className="h-4 w-4"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <path d="M12 5v14" />
                                    <path d="M18 11l-6-6-6 6" />
                                  </svg>
                                  Receita
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openTransactionModal("transfer", account.id)}
                                  className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-sky-200 bg-sky-50 text-xs font-semibold text-sky-600 transition hover:border-sky-300"
                                >
                                  <svg
                                    aria-hidden="true"
                                    viewBox="0 0 24 24"
                                    className="h-4 w-4"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <path d="M16 3h5v5" />
                                    <path d="M4 20l5-5" />
                                    <path d="M21 3l-7 7" />
                                    <path d="M9 15l-5 5" />
                                  </svg>
                                  Transferir
                                </button>
                              </div>
                            </div>
                          );
                        })}
                        <button
                          type="button"
                          onClick={openAccountModal}
                          className="flex min-h-[190px] flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-[var(--border)] bg-white/70 p-6 text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--accent-strong)]"
                        >
                          <span className="flex h-12 w-12 items-center justify-center rounded-full border border-current">
                            <svg
                              aria-hidden="true"
                              viewBox="0 0 24 24"
                              className="h-5 w-5"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M12 5v14" />
                              <path d="M5 12h14" />
                            </svg>
                          </span>
                          <span className="text-sm font-semibold uppercase tracking-[0.2em]">
                            Nova conta
                          </span>
                        </button>
                      </div>

                      {showArchivedAccounts ? (
                        <div className="mt-8">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <h4 className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">
                              Arquivadas
                            </h4>
                            <span className="text-xs font-semibold text-[var(--muted)]">
                              {isLoadingArchivedAccounts
                                ? "Carregando..."
                                : `${archivedAccounts.length} conta(s)`}
                            </span>
                          </div>
                          {archivedAccounts.length === 0 && !isLoadingArchivedAccounts ? (
                            <p className="mt-3 text-sm text-[var(--muted)]">
                              Nenhuma conta arquivada.
                            </p>
                          ) : null}
                          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                            {archivedAccounts.map((account) => (
                              <div
                                key={account.id}
                                className="rounded-3xl border border-dashed border-[var(--border)] bg-white/60 p-5 text-[var(--muted)]"
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-[var(--ink)]">
                                      {account.name}
                                    </p>
                                    <p className="text-xs text-[var(--muted)]">
                                      {account.account_type.replace("_", " ")}
                                    </p>
                                  </div>
                                  <span className="rounded-full border border-[var(--border)] bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                                    Arquivada
                                  </span>
                                </div>
                                <div className="mt-4 flex items-center justify-between text-xs text-[var(--muted)]">
                                  <span>Saldo final</span>
                                  <span className="font-semibold text-[var(--ink)]">
                                    {currencyFormatter.format(0)}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleUnarchiveAccount(account)}
                                  disabled={accountActionLoadingId === account.id}
                                  className="mt-4 inline-flex w-full items-center justify-center rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-xs font-semibold text-[var(--ink)] transition hover:border-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {accountActionLoadingId === account.id
                                    ? "Reativando..."
                                    : "Reativar conta"}
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </section>
                  ) : null}

                  {isStatementView ? (
                    <section className="rounded-3xl border border-[var(--border)] bg-white/80 px-3 py-4 shadow-sm sm:p-6">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">
                            Extrato
                          </h3>
                          <p className="mt-2 truncate text-sm font-semibold text-[var(--ink)]">
                            {statementAccountId
                              ? accounts.find((a) => a.id === statementAccountId)
                                  ?.name ?? "Conta"
                              : "Selecione uma conta"}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveView("accounts")}
                          className="inline-flex items-center justify-center rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-xs font-semibold text-[var(--ink)] shadow-sm transition hover:border-[var(--accent)] hover:text-[var(--accent-strong)]"
                        >
                          Voltar
                        </button>
                      </div>

                      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
                        <div className="rounded-2xl border border-[var(--border)] bg-white px-4 py-3 shadow-sm">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                            Conta
                          </p>
                          <select
                            value={statementAccountId}
                            onChange={(event) =>
                              setStatementAccountId(event.target.value)
                            }
                            className="mt-2 h-10 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm font-semibold text-[var(--ink)] shadow-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]"
                          >
                            <option value="">Selecione a conta</option>
                            {accounts.map((account) => (
                              <option key={account.id} value={account.id}>
                                {account.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="rounded-2xl border border-[var(--border)] bg-white px-4 py-3 shadow-sm">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                            Período
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openFilterCalendar("start", "statement")}
                              aria-label="Selecionar data inicial do extrato"
                              className="flex flex-1 items-center justify-between gap-2 rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-xs font-semibold text-[var(--ink)] shadow-sm transition hover:border-[var(--accent)]"
                            >
                              <span className="truncate">
                                {statementStartDate
                                  ? formatDate(statementStartDate)
                                  : "Data inicial"}
                              </span>
                              <svg
                                aria-hidden="true"
                                viewBox="0 0 24 24"
                                className="h-4 w-4 text-[var(--muted)]"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <rect x="3" y="4" width="18" height="18" rx="2" />
                                <path d="M16 2v4M8 2v4M3 10h18" />
                              </svg>
                            </button>
                            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                              até
                            </span>
                            <button
                              type="button"
                              onClick={() => openFilterCalendar("end", "statement")}
                              aria-label="Selecionar data final do extrato"
                              className="flex flex-1 items-center justify-between gap-2 rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-xs font-semibold text-[var(--ink)] shadow-sm transition hover:border-[var(--accent)]"
                            >
                              <span className="truncate">
                                {statementEndDate
                                  ? formatDate(statementEndDate)
                                  : "Data final"}
                              </span>
                              <svg
                                aria-hidden="true"
                                viewBox="0 0 24 24"
                                className="h-4 w-4 text-[var(--muted)]"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <rect x="3" y="4" width="18" height="18" rx="2" />
                                <path d="M16 2v4M8 2v4M3 10h18" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={resetStatementDateRange}
                              className="ml-auto text-xs font-semibold text-[var(--accent-strong)] transition hover:text-[var(--accent)]"
                            >
                              Mês selecionado
                            </button>
                          </div>
                        </div>
                      </div>

                      {statementError ? (
                        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                          {statementError}
                        </div>
                      ) : null}

                      <div className="mt-4 overflow-hidden rounded-3xl border border-[var(--border)] bg-white shadow-sm">
                        {isLoadingStatement ? (
                          <div className="p-4 text-sm text-[var(--muted)]">
                            Carregando extrato...
                          </div>
                        ) : statementRows.length === 0 ? (
                          <div className="p-4 text-sm text-[var(--muted)]">
                            Nenhum lançamento no período.
                          </div>
                        ) : (
                          <>
                            <div className="hidden grid-cols-[96px_64px_minmax(0,1fr)_140px_140px] gap-3 border-b border-[var(--border)] px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)] sm:grid">
                              <span>Data</span>
                              <span>Hora</span>
                              <span>Lançamento</span>
                              <span className="text-right">Valor</span>
                              <span className="text-right">Saldo</span>
                            </div>
                            <div className="divide-y divide-[var(--border)]">
                              <div className="bg-slate-50/60 px-4 py-3">
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-[96px_64px_minmax(0,1fr)_140px_140px] sm:items-center sm:gap-3">
                                  <div className="text-xs font-semibold text-[var(--ink)]">
                                    {statementStartDate
                                      ? formatDate(statementStartDate)
                                      : "--"}
                                  </div>
                                  <div className="text-xs font-semibold text-[var(--muted)]">
                                    --
                                  </div>
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-[var(--ink)]">
                                      Saldo inicial
                                    </p>
                                    <p className="truncate text-xs text-[var(--muted)]">
                                      Antes do período selecionado
                                    </p>
                                  </div>
                                  <div className="text-right text-sm font-semibold text-[var(--muted)]">
                                    —
                                  </div>
                                  <div className="text-right text-sm font-semibold text-[var(--ink)]">
                                    {currencyFormatter.format(statementOpeningBalance)}
                                  </div>
                                </div>
                              </div>
                              {statementRows.map((row) => {
                                const timeLabel = row.occurred_time
                                  ? row.occurred_time.slice(0, 5)
                                  : "";
                                const valueTone =
                                  row.delta < 0
                                    ? "text-rose-600"
                                    : row.delta > 0
                                      ? "text-emerald-600"
                                      : "text-[var(--ink)]";
                                const valueSign =
                                  row.delta < 0 ? "-" : row.delta > 0 ? "+" : "";
                                return (
                                  <div key={row.id} className="px-4 py-3">
                                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-[96px_64px_minmax(0,1fr)_140px_140px] sm:items-center sm:gap-3">
                                      <div className="text-xs font-semibold text-[var(--ink)]">
                                        {formatDate(row.posted_at)}
                                      </div>
                                      <div className="text-xs font-semibold text-[var(--muted)]">
                                        {timeLabel || "--"}
                                      </div>
                                      <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold text-[var(--ink)]">
                                          {row.description?.trim() || row.label}
                                        </p>
                                        <p className="truncate text-xs text-[var(--muted)]">
                                          {row.label}
                                        </p>
                                      </div>
                                      <div
                                        className={`text-right text-sm font-semibold ${valueTone}`}
                                      >
                                        {valueSign}
                                        {currencyFormatter.format(Math.abs(row.delta))}
                                      </div>
                                      <div className="text-right text-sm font-semibold text-[var(--ink)]">
                                        {currencyFormatter.format(row.balance_after)}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                              <div className="bg-slate-50/60 px-4 py-3">
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-[96px_64px_minmax(0,1fr)_140px_140px] sm:items-center sm:gap-3">
                                  <div className="text-xs font-semibold text-[var(--ink)]">
                                    {statementEndDate
                                      ? formatDate(statementEndDate)
                                      : "--"}
                                  </div>
                                  <div className="text-xs font-semibold text-[var(--muted)]">
                                    --
                                  </div>
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-[var(--ink)]">
                                      Saldo final
                                    </p>
                                    <p className="truncate text-xs text-[var(--muted)]">
                                      Após o último lançamento do período
                                    </p>
                                  </div>
                                  <div className="text-right text-sm font-semibold text-[var(--muted)]">
                                    —
                                  </div>
                                  <div className="text-right text-sm font-semibold text-[var(--ink)]">
                                    {currencyFormatter.format(statementClosingBalance)}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </section>
                  ) : null}

                  {isCategoriesView ? (
                    <section className="rounded-3xl border border-[var(--border)] bg-white/80 px-3 py-4 shadow-sm sm:p-6">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">
                            Categorias
                          </h3>
                          <p className="mt-2 text-sm text-[var(--muted)]">
                            Organize despesas e receitas com subcategorias.
                          </p>
                        </div>
                        <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-start">
                          <div className="min-w-0 overflow-x-auto">
                            <div className="flex w-max items-center gap-1 rounded-full border border-[var(--border)] bg-white px-1 py-1 shadow-sm">
                              {categoryTypeTabs.map((option) => {
                                const isActive = categoryViewType === option.value;
                                return (
                                  <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => setCategoryViewType(option.value)}
                                    className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                                      isActive ? option.active : option.inactive
                                    }`}
                                  >
                                    {option.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div className="flex shrink-0 items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setShowArchivedCategories((prev) => !prev)
                              }
                              aria-label={
                                showArchivedCategories
                                  ? "Ocultar categorias arquivadas"
                                  : "Ver categorias arquivadas"
                              }
                              title={
                                showArchivedCategories
                                  ? "Ocultar arquivadas"
                                  : "Ver arquivadas"
                              }
                              className={`flex h-10 w-10 items-center justify-center rounded-full border bg-white text-[var(--muted)] shadow-sm transition hover:border-[var(--accent)] hover:text-[var(--ink)] ${
                                showArchivedCategories
                                  ? "border-[var(--accent)] text-[var(--accent-strong)]"
                                  : "border-[var(--border)]"
                              }`}
                            >
                              <svg
                                aria-hidden="true"
                                viewBox="0 0 24 24"
                                className="h-5 w-5"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M21 8v13H3V8" />
                                <path d="M1 3h22v5H1z" />
                                <path d="M10 12h4" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                openCategoryModal({ type: categoryViewType })
                              }
                              aria-label="Criar nova categoria"
                              title="Nova categoria"
                              className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent)] text-white shadow-sm shadow-blue-500/30 transition hover:bg-[var(--accent-strong)]"
                            >
                              <svg
                                aria-hidden="true"
                                viewBox="0 0 24 24"
                                className="h-5 w-5"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M12 5v14" />
                                <path d="M5 12h14" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>

                      {categoryActionError ? (
                        <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                          {categoryActionError}
                        </div>
                      ) : null}

                      {isLoadingCategories ? (
                        <p className="mt-4 text-sm text-[var(--muted)]">
                          Carregando categorias...
                        </p>
                      ) : null}

                      {!isLoadingCategories &&
                      sortedActiveCategoryRoots.length === 0 ? (
                        <p className="mt-4 text-sm text-[var(--muted)]">
                          Nenhuma categoria criada ainda.
                        </p>
                      ) : null}

                      <div className="mt-5 overflow-hidden rounded-3xl border border-[var(--border)] bg-white shadow-sm">
                        {sortedActiveCategoryRoots.map((category) => {
                          const children = [
                            ...(activeCategoryChildrenByParent[category.id] ?? []),
                          ].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
                          return (
                            <div
                              key={category.id}
                              className="border-b border-[var(--border)] last:border-b-0"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
                                <div className="flex min-w-0 items-center gap-3">
                                  {renderCategoryIcon(category)}
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-[var(--ink)]">
                                      {category.name}
                                    </p>
                                    <p className="text-xs text-[var(--muted)]">
                                      {children.length === 0
                                        ? "Sem subcategorias"
                                        : `${children.length} subcategoria(s)`}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {renderCategoryActions(category, {
                                    canAddChild: true,
                                  })}
                                </div>
                              </div>

                              {children.length > 0 ? (
                                <div className="pb-4 pl-14 pr-4">
                                  <div className="space-y-2 border-l border-[var(--border)] pl-6">
                                    {children.map((child) => (
                                      <div
                                        key={child.id}
                                        className="relative flex items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-white px-3 py-2"
                                      >
                                        <span
                                          aria-hidden="true"
                                          className="absolute -left-6 top-1/2 h-px w-6 bg-[var(--border)]"
                                        />
                                        <div className="flex min-w-0 items-center gap-2">
                                          {renderCategoryIcon(
                                            child,
                                            "h-8 w-8",
                                            "h-4 w-4",
                                          )}
                                          <span className="truncate text-sm font-semibold text-[var(--ink)]">
                                            {child.name}
                                          </span>
                                        </div>
                                        {renderCategoryActions(child)}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                        <button
                          type="button"
                          onClick={() => openCategoryModal({ type: categoryViewType })}
                          className="flex w-full items-center justify-center gap-3 px-4 py-4 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)] transition hover:bg-slate-50 hover:text-[var(--accent-strong)]"
                        >
                          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-current">
                            <svg
                              aria-hidden="true"
                              viewBox="0 0 24 24"
                              className="h-4 w-4"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M12 5v14" />
                              <path d="M5 12h14" />
                            </svg>
                          </span>
                          Nova categoria
                        </button>
                      </div>

                      {showArchivedCategories ? (
                        <div className="mt-8">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <h4 className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">
                              Arquivadas
                            </h4>
                            <span className="text-xs font-semibold text-[var(--muted)]">
                              {isLoadingArchivedCategories
                                ? "Carregando..."
                                : `${archivedCategoryCount} categoria(s)`}
                            </span>
                          </div>
                          {sortedArchivedCategoryRoots.length === 0 &&
                          !isLoadingArchivedCategories ? (
                            <p className="mt-3 text-sm text-[var(--muted)]">
                              Nenhuma categoria arquivada.
                            </p>
                          ) : null}
                          <div className="mt-4 overflow-hidden rounded-3xl border border-[var(--border)] bg-white/70 shadow-sm">
                            {sortedArchivedCategoryRoots.map((category) => {
                              const children = [
                                ...(archivedCategoryChildrenByParent[category.id] ??
                                  []),
                              ].sort((a, b) =>
                                a.name.localeCompare(b.name, "pt-BR"),
                              );
                              const isRestoring = categoryActionLoadingId === category.id;
                              return (
                                <div
                                  key={category.id}
                                  className="border-b border-[var(--border)] last:border-b-0"
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
                                    <div className="flex min-w-0 items-center gap-3">
                                      {renderCategoryIcon(category)}
                                      <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold text-[var(--ink)]">
                                          {category.name}
                                        </p>
                                        <p className="text-xs text-[var(--muted)]">
                                          {children.length === 0
                                            ? "Arquivada"
                                            : `Arquivada • ${children.length} subcategoria(s)`}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="rounded-full border border-[var(--border)] bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                                        Arquivada
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => handleUnarchiveCategory(category)}
                                        disabled={isRestoring}
                                        className="inline-flex items-center justify-center rounded-full border border-[var(--border)] bg-white px-3 py-2 text-xs font-semibold text-[var(--ink)] transition hover:border-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
                                      >
                                        {isRestoring ? "Reativando..." : "Reativar"}
                                      </button>
                                    </div>
                                  </div>
                                  {children.length > 0 ? (
                                    <div className="pb-4 pl-14 pr-4">
                                      <div className="space-y-2 border-l border-[var(--border)] pl-6">
                                        {children.map((child) => (
                                          <div
                                            key={child.id}
                                            className="relative flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-white px-3 py-2"
                                          >
                                            <span
                                              aria-hidden="true"
                                              className="absolute -left-6 top-1/2 h-px w-6 bg-[var(--border)]"
                                            />
                                            {renderCategoryIcon(
                                              child,
                                              "h-8 w-8",
                                              "h-4 w-4",
                                            )}
                                            <span className="truncate text-sm font-semibold text-[var(--ink)]">
                                              {child.name}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ) : null}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : null}
                    </section>
                  ) : null}

                  {isTransfersView ? (
                    <section className="rounded-3xl border border-[var(--border)] bg-white/80 p-6 shadow-sm">
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                          <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">
                            Transferências
                          </h3>
                          <p className="mt-2 text-sm text-[var(--muted)]">
                            Período selecionado: {monthLabel}
                          </p>
                        </div>
                        {hasTransferFilters ? (
                          <button
                            type="button"
                            onClick={() => {
                              setTransferFromAccountId("");
                              setTransferToAccountId("");
                              setTransferSearch("");
                              setTransferMinAmount("");
                              setTransferMaxAmount("");
                            }}
                            className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-xs font-semibold text-[var(--ink)] transition hover:border-[var(--accent)]"
                          >
                            Limpar filtros
                          </button>
                        ) : null}
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-3">
                        <select
                          value={transferFromAccountId}
                          onChange={(event) =>
                            setTransferFromAccountId(event.target.value)
                          }
                          className="min-w-[180px] rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--ink)] shadow-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]"
                        >
                          <option value="">Conta origem</option>
                          {accounts.map((account) => (
                            <option key={account.id} value={account.id}>
                              {account.name}
                            </option>
                          ))}
                        </select>
                        <select
                          value={transferToAccountId}
                          onChange={(event) =>
                            setTransferToAccountId(event.target.value)
                          }
                          className="min-w-[180px] rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--ink)] shadow-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]"
                        >
                          <option value="">Conta destino</option>
                          {accounts.map((account) => (
                            <option key={account.id} value={account.id}>
                              {account.name}
                            </option>
                          ))}
                        </select>
                        <input
                          value={transferMinAmount}
                          onChange={(event) =>
                            setTransferMinAmount(event.target.value)
                          }
                          placeholder="Valor mínimo"
                          inputMode="decimal"
                          className="min-w-[140px] rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--ink)] shadow-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]"
                        />
                        <input
                          value={transferMaxAmount}
                          onChange={(event) =>
                            setTransferMaxAmount(event.target.value)
                          }
                          placeholder="Valor máximo"
                          inputMode="decimal"
                          className="min-w-[140px] rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--ink)] shadow-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]"
                        />
                        <div className="min-w-[220px] flex-1">
                          <input
                            value={transferSearch}
                            onChange={(event) =>
                              setTransferSearch(event.target.value)
                            }
                            placeholder="Buscar por conta ou descrição..."
                            className="h-10 w-full rounded-xl border border-[var(--border)] bg-white px-4 text-xs font-semibold text-[var(--ink)] shadow-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]"
                          />
                        </div>
                      </div>

                      <div className="mt-4 overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                            <tr className="border-b border-[var(--border)]">
                              <th className="py-2 text-left font-semibold">
                                Data
                              </th>
                              <th className="py-2 text-left font-semibold">
                                Origem
                              </th>
                              <th className="py-2 text-left font-semibold">
                                Destino
                              </th>
                              <th className="py-2 text-left font-semibold">
                                Descrição
                              </th>
                              <th className="py-2 text-right font-semibold">
                                Valor
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredTransfers.length === 0 ? (
                              <tr>
                                <td
                                  colSpan={5}
                                  className="py-4 text-sm text-[var(--muted)]"
                                >
                                  Nenhuma transferência encontrada.
                                </td>
                              </tr>
                            ) : (
                              filteredTransfers.map((transfer) => (
                                <tr
                                  key={transfer.id}
                                  className="border-b border-[var(--border)] last:border-b-0"
                                >
                                  <td className="py-3 text-sm text-[var(--muted)]">
                                    {formatDate(transfer.posted_at)}
                                  </td>
                                  <td className="py-3 text-sm text-[var(--ink)]">
                                    {transfer.from?.name ?? "Conta"}
                                  </td>
                                  <td className="py-3 text-sm text-[var(--ink)]">
                                    {transfer.to?.name ?? "Conta"}
                                  </td>
                                  <td className="py-3 text-sm text-[var(--muted)]">
                                    {transfer.description || "Transferência"}
                                  </td>
                                  <td className="py-3 text-right text-sm font-semibold text-sky-600">
                                    {currencyFormatter.format(transfer.amount)}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                        <span>Transferências: {filteredTransfers.length}</span>
                      </div>
                    </section>
                  ) : null}

                  
                </main>
              )}
            </div>
          </div>
        ) : (
          <main className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
            <section className="space-y-6 motion-safe:animate-[fade-up_0.6s_ease-out]">
              <span className="w-fit rounded-full border border-[var(--border)] bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">
                Controle familiar
              </span>
              <h1 className="font-heading text-3xl text-[var(--ink)] sm:text-4xl tracking-tight">
                Um painel único para organizar a rotina financeira da família.
              </h1>
              <p className="max-w-xl text-base text-[var(--muted)]">
                Centralize contas, lançamentos e anexos. Automatize entradas via
                email e OFX, e mantenha cada pessoa com o acesso certo.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link className={primaryButton} href="/register">
                  Criar conta
                </Link>
                <Link className={secondaryButton} href="/login">
                  Entrar
                </Link>
              </div>
            </section>

            <section className="grid gap-4 motion-safe:animate-[fade-up_0.7s_ease-out]">
              {[
                {
                  title: "Lançamentos e categorias",
                  body: "Cadastre entradas e saídas em segundos, com regras claras.",
                },
                {
                  title: "Permissoes por membro",
                  body: "Cada pessoa ve apenas as contas que importam.",
                },
                {
                  title: "Automações e bots",
                  body: "Email, n8n e chat para lancar sem abrir o app.",
                },
                {
                  title: "Relatórios vivos",
                  body: "Visão por período, conta e categoria em tempo real.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-3xl border border-[var(--border)] bg-[var(--panel)] p-5 shadow-sm"
                >
                  <h2 className="text-sm font-semibold text-[var(--ink)]">
                    {item.title}
                  </h2>
                  <p className="mt-2 text-sm text-[var(--muted)]">
                    {item.body}
                  </p>
                </div>
              ))}
            </section>
          </main>
        )}
      </div>
    </div>
  );
}
