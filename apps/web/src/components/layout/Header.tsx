"use client";

import { useRef, useState, useEffect } from "react";
import { useApp } from "@/contexts/AppContext";
import { getBrazilToday, getDateParts } from "@/lib/date-utils";

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

export function Header() {
  const {
    activeMonth,
    setActiveMonth,
    setIsMobileMenuOpen,
    accounts,
    openTransactionModal,
  } = useApp();

  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [monthPickerYear, setMonthPickerYear] = useState(() => {
    const parts = getDateParts(getBrazilToday());
    return parts ? parts.year : new Date().getFullYear();
  });
  const monthPickerRef = useRef<HTMLDivElement | null>(null);

  // Parse active month
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

  const canCreateTransaction = accounts.length > 0;

  const handleSelectMonth = (monthIndex: number, year = monthPickerYear) => {
    const monthValue = String(monthIndex + 1).padStart(2, "0");
    setActiveMonth(`${year}-${monthValue}`);
    setIsMonthPickerOpen(false);
  };

  // Close month picker when clicking outside
  useEffect(() => {
    if (!isMonthPickerOpen) return;

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

  // Sync month picker year with active year
  useEffect(() => {
    setMonthPickerYear(activeYear);
  }, [activeYear]);

  return (
    <header className="rounded-3xl border border-[var(--border)] bg-white/80 px-4 py-4 shadow-sm backdrop-blur sm:px-5">
      <div className="flex flex-col gap-3 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:items-center lg:gap-3">
        {/* Mobile menu button and logo */}
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
            onClick={() => window.location.href = "/"}
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

        {/* Month navigation */}
        <div className="flex flex-nowrap items-center justify-between gap-2 lg:contents">
          <div
            ref={monthPickerRef}
            className="relative flex min-w-0 flex-1 items-center justify-center gap-2 lg:col-start-2 lg:flex-none lg:justify-self-center"
          >
            <button
              type="button"
              onClick={() => handleSelectMonth(prevMonth.index, prevMonth.year)}
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
              onClick={() => handleSelectMonth(nextMonth.index, nextMonth.year)}
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

            {/* Month picker dropdown */}
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
                          handleSelectMonth(item.value.index, item.value.year)
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

          {/* Create transaction buttons */}
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
                  <path d="M7 10l5-5 5 5" />
                  <path d="M7 14l5 5 5-5" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
