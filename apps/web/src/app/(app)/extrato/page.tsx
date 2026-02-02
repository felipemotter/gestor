"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { useApp } from "@/contexts/AppContext";
import { getSupabaseClient } from "@/lib/supabase/client";
import { currencyFormatter, shortDateFormatter } from "@/lib/formatters";
import { subtractDaysFromBrazilDate, getDateParts, formatDateKey, parseDateValue, calendarWeekdays } from "@/lib/date-utils";
import type { StatementRow } from "@/types";

const supabase = getSupabaseClient();

const monthNamesFull = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function getMonthRange(monthValue: string) {
  const [year, month] = monthValue.split("-").map(Number);
  if (!year || !month) return { startDate: "", endDate: "" };
  const paddedMonth = String(month).padStart(2, "0");
  const endDay = new Date(year, month, 0).getDate();
  return {
    startDate: `${year}-${paddedMonth}-01`,
    endDate: `${year}-${paddedMonth}-${String(endDay).padStart(2, "0")}`,
  };
}

function formatDate(value: string) {
  const parsed = parseDateValue(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return shortDateFormatter.format(parsed);
}

export default function ExtratoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    session,
    activeFamilyId,
    accounts,
    categories,
    archivedCategories,
    activeMonth,
  } = useApp();

  // State
  const [statementAccountId, setStatementAccountId] = useState(() => searchParams.get("account") ?? "");
  const [statementStartDate, setStatementStartDate] = useState("");
  const [statementEndDate, setStatementEndDate] = useState("");
  const [statementRows, setStatementRows] = useState<StatementRow[]>([]);
  const [statementOpeningBalance, setStatementOpeningBalance] = useState(0);
  const [statementClosingBalance, setStatementClosingBalance] = useState(0);
  const [isLoadingStatement, setIsLoadingStatement] = useState(false);
  const [statementError, setStatementError] = useState<string | null>(null);

  // Calendar picker state
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calendarTarget, setCalendarTarget] = useState<"start" | "end">("start");
  const [calendarTempDate, setCalendarTempDate] = useState("");
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());

  // Computed
  const monthRange = useMemo(() => getMonthRange(activeMonth), [activeMonth]);
  const effectiveStartDate = statementStartDate || monthRange.startDate;
  const effectiveEndDate = statementEndDate || monthRange.endDate;

  // Reset date range to active month
  const resetStatementDateRange = useCallback(() => {
    setStatementStartDate("");
    setStatementEndDate("");
  }, []);

  // Open calendar picker
  const openFilterCalendar = useCallback((target: "start" | "end") => {
    setCalendarTarget(target);
    const dateValue = target === "start" ? effectiveStartDate : effectiveEndDate;
    setCalendarTempDate(dateValue);
    const parts = getDateParts(dateValue);
    if (parts) {
      setCalendarMonth(parts.monthIndex);
      setCalendarYear(parts.year);
    }
    setIsCalendarOpen(true);
  }, [effectiveStartDate, effectiveEndDate]);

  // Confirm calendar selection
  const confirmCalendarDate = useCallback(() => {
    if (calendarTarget === "start") {
      setStatementStartDate(calendarTempDate);
    } else {
      setStatementEndDate(calendarTempDate);
    }
    setIsCalendarOpen(false);
  }, [calendarTarget, calendarTempDate]);

  // Calendar computed values
  const calendarLabel = `${monthNamesFull[calendarMonth]} ${calendarYear}`;
  const firstWeekday = new Date(calendarYear, calendarMonth, 1).getDay();
  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
  const calendarDays: Array<number | null> = [];
  for (let idx = 0; idx < firstWeekday; idx++) calendarDays.push(null);
  for (let day = 1; day <= daysInMonth; day++) calendarDays.push(day);
  while (calendarDays.length % 7 !== 0) calendarDays.push(null);

  const calendarSelectedParts = getDateParts(calendarTempDate);

  // Load statement data
  useEffect(() => {
    if (!activeFamilyId || !session?.access_token) return;
    if (!statementAccountId) {
      /* eslint-disable react-hooks/set-state-in-effect -- Intentional: reset state on missing data */
      setStatementRows([]);
      setStatementOpeningBalance(0);
      setStatementClosingBalance(0);
      /* eslint-enable react-hooks/set-state-in-effect */
      return;
    }

    const startDate = effectiveStartDate;
    const endDate = effectiveEndDate;
    if (!startDate || !endDate) return;

    type StatementQueryRow = {
      id: string;
      amount: string | number;
      description: string | null;
      posted_at: string;
      occurred_time: string | null;
      created_at: string;
      source: string | null;
      account: { name: string } | null;
      category: { id: string; name: string; category_type: string; parent_id: string | null } | null;
    };

    let cancelled = false;
    const loadStatement = async () => {
      setIsLoadingStatement(true);
      setStatementError(null);

      const startMinusOne = subtractDaysFromBrazilDate(startDate, 1);
      const { data: opening, error: openingError } = await supabase
        .rpc("account_balance_at", { account_uuid: statementAccountId, at_date: startMinusOne })
        .single();

      if (cancelled) return;

      if (openingError) {
        setStatementError(openingError.message);
        setIsLoadingStatement(false);
        return;
      }

      const openingBalanceValue = Number(typeof opening === "number" || typeof opening === "string" ? opening : 0);

      const { data, error } = await supabase
        .from("transactions")
        .select("id, amount, description, posted_at, occurred_time, created_at, source, account:accounts(name), category:categories(id, name, category_type, parent_id)")
        .eq("account_id", statementAccountId)
        .gte("posted_at", startDate)
        .lte("posted_at", endDate)
        .order("posted_at", { ascending: true })
        .order("occurred_time", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: true })
        .range(0, 4999);

      if (cancelled) return;

      if (error) {
        setStatementError(error.message);
        setIsLoadingStatement(false);
        return;
      }

      let running = Number.isFinite(openingBalanceValue) ? openingBalanceValue : 0;
      const categoryIndex = [...categories, ...archivedCategories].reduce<Record<string, { id: string; name: string; parent_id: string | null }>>((acc, cat) => {
        acc[cat.id] = { id: cat.id, name: cat.name, parent_id: cat.parent_id };
        return acc;
      }, {});

      const getStatementCategoryLabel = (category: StatementQueryRow["category"]) => {
        if (!category?.id) return "Sem categoria";
        if (!category.parent_id) return category.name;
        const parent = categoryIndex[category.parent_id];
        return parent ? `${parent.name} / ${category.name}` : category.name;
      };

      const rows: StatementRow[] = ((data ?? []) as unknown as StatementQueryRow[]).map((item) => {
        const amountValue = Number(item.amount);
        const isNumeric = Number.isFinite(amountValue);
        const source = item.source;

        const delta = isNumeric ? amountValue : 0;

        running += delta;

        const label = source === "transfer"
          ? "Transferência"
          : source === "adjustment"
            ? "Ajuste"
            : getStatementCategoryLabel(item.category);

        return {
          id: item.id,
          posted_at: item.posted_at,
          occurred_time: item.occurred_time ?? null,
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
    return () => { cancelled = true; };
  }, [activeFamilyId, session?.access_token, statementAccountId, effectiveStartDate, effectiveEndDate, categories, archivedCategories]);

  return (
    <>
      <Header />
      <main className="flex flex-col gap-4 sm:gap-6">
        <section className="rounded-3xl border border-[var(--border)] bg-white/80 px-3 py-4 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">
                Extrato
              </h3>
              <p className="mt-2 truncate text-sm font-semibold text-[var(--ink)]">
                {statementAccountId
                  ? accounts.find((a) => a.id === statementAccountId)?.name ?? "Conta"
                  : "Selecione uma conta"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => router.push("/contas")}
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
                onChange={(e) => setStatementAccountId(e.target.value)}
                className="mt-2 h-10 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm font-semibold text-[var(--ink)] shadow-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]"
              >
                <option value="">Selecione a conta</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>{account.name}</option>
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
                  onClick={() => openFilterCalendar("start")}
                  className="flex flex-1 items-center justify-between gap-2 rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-xs font-semibold text-[var(--ink)] shadow-sm transition hover:border-[var(--accent)]"
                >
                  <span className="truncate">{effectiveStartDate ? formatDate(effectiveStartDate) : "Data inicial"}</span>
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 text-[var(--muted)]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <path d="M16 2v4M8 2v4M3 10h18" />
                  </svg>
                </button>
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">até</span>
                <button
                  type="button"
                  onClick={() => openFilterCalendar("end")}
                  className="flex flex-1 items-center justify-between gap-2 rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-xs font-semibold text-[var(--ink)] shadow-sm transition hover:border-[var(--accent)]"
                >
                  <span className="truncate">{effectiveEndDate ? formatDate(effectiveEndDate) : "Data final"}</span>
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 text-[var(--muted)]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
              <div className="p-4 text-sm text-[var(--muted)]">Carregando extrato...</div>
            ) : statementRows.length === 0 ? (
              <div className="p-4 text-sm text-[var(--muted)]">Nenhum lançamento no período.</div>
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
                      <div className="text-xs font-semibold text-[var(--ink)]">{effectiveStartDate ? formatDate(effectiveStartDate) : "--"}</div>
                      <div className="text-xs font-semibold text-[var(--muted)]">--</div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[var(--ink)]">Saldo inicial</p>
                        <p className="truncate text-xs text-[var(--muted)]">Antes do período selecionado</p>
                      </div>
                      <div className="text-right text-sm font-semibold text-[var(--muted)]">—</div>
                      <div className="text-right text-sm font-semibold text-[var(--ink)]">{currencyFormatter.format(statementOpeningBalance)}</div>
                    </div>
                  </div>
                  {statementRows.map((row) => {
                    const timeLabel = row.occurred_time ? row.occurred_time.slice(0, 5) : "";
                    const valueTone = row.delta < 0 ? "text-rose-600" : row.delta > 0 ? "text-emerald-600" : "text-[var(--ink)]";
                    const valueSign = row.delta < 0 ? "-" : row.delta > 0 ? "+" : "";
                    return (
                      <div key={row.id} className="px-4 py-3">
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[96px_64px_minmax(0,1fr)_140px_140px] sm:items-center sm:gap-3">
                          <div className="text-xs font-semibold text-[var(--ink)]">{formatDate(row.posted_at)}</div>
                          <div className="text-xs font-semibold text-[var(--muted)]">{timeLabel || "--"}</div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-[var(--ink)]">{row.description?.trim() || row.label}</p>
                            <p className="truncate text-xs text-[var(--muted)]">{row.label}</p>
                          </div>
                          <div className={`text-right text-sm font-semibold ${valueTone}`}>
                            {valueSign}{currencyFormatter.format(Math.abs(row.delta))}
                          </div>
                          <div className="text-right text-sm font-semibold text-[var(--ink)]">{currencyFormatter.format(row.balance_after)}</div>
                        </div>
                      </div>
                    );
                  })}
                  <div className="bg-slate-50/60 px-4 py-3">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-[96px_64px_minmax(0,1fr)_140px_140px] sm:items-center sm:gap-3">
                      <div className="text-xs font-semibold text-[var(--ink)]">{effectiveEndDate ? formatDate(effectiveEndDate) : "--"}</div>
                      <div className="text-xs font-semibold text-[var(--muted)]">--</div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[var(--ink)]">Saldo final</p>
                        <p className="truncate text-xs text-[var(--muted)]">Após o último lançamento do período</p>
                      </div>
                      <div className="text-right text-sm font-semibold text-[var(--muted)]">—</div>
                      <div className="text-right text-sm font-semibold text-[var(--ink)]">{currencyFormatter.format(statementClosingBalance)}</div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </section>
      </main>

      {/* Calendar Modal */}
      {isCalendarOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-3 py-4">
          <button
            type="button"
            aria-label="Fechar calendário"
            onClick={() => setIsCalendarOpen(false)}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />
          <div className="relative z-10 w-full max-w-sm overflow-hidden rounded-3xl border border-[var(--border)] bg-white shadow-[var(--shadow)]">
            <div className="bg-[var(--accent)] px-5 py-4 text-white">
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/70">{calendarYear}</p>
              <p className="mt-1 text-lg font-semibold">
                {calendarTempDate ? formatDate(calendarTempDate) : "Selecione"}
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
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
                </button>
                <span className="text-sm font-semibold text-[var(--ink)]">{calendarLabel}</span>
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
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 6l6 6-6 6" /></svg>
                </button>
              </div>
              <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-[var(--muted)]">
                {calendarWeekdays.map((wd) => <span key={wd}>{wd}</span>)}
              </div>
              <div className="mt-2 grid grid-cols-7 gap-1 text-center text-sm">
                {calendarDays.map((day, idx) => {
                  if (!day) return <span key={`empty-${idx}`} />;
                  const isSelected = calendarSelectedParts && day === calendarSelectedParts.day && calendarMonth === calendarSelectedParts.monthIndex && calendarYear === calendarSelectedParts.year;
                  return (
                    <button
                      key={`${calendarYear}-${calendarMonth}-${day}`}
                      type="button"
                      onClick={() => setCalendarTempDate(formatDateKey(calendarYear, calendarMonth, day))}
                      className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition ${isSelected ? "bg-[var(--accent)] text-white" : "text-[var(--ink)] hover:bg-slate-100"}`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 flex items-center justify-between">
                <button type="button" onClick={() => setIsCalendarOpen(false)} className="text-xs font-semibold text-[var(--muted)] transition hover:text-[var(--ink)]">Cancelar</button>
                <button type="button" onClick={confirmCalendarDate} className="text-xs font-semibold text-[var(--accent-strong)] transition hover:text-[var(--accent)]">OK</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
