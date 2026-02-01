"use client";

import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { useApp, type Category } from "@/contexts/AppContext";
import { getSupabaseClient } from "@/lib/supabase/client";
import { primaryButton } from "@/constants/styles";
import {
  getBrazilToday,
  getDateParts,
  formatDateKey,
  parseBrazilDate,
  addDaysToBrazilDate,
  calendarWeekdays,
} from "@/lib/date-utils";
import { calendarDateFormatter } from "@/lib/formatters";

const supabase = getSupabaseClient();

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

const transactionTypeOptions = [
  { value: "expense", label: "Despesa" },
  { value: "income", label: "Receita" },
  { value: "transfer", label: "Transferência" },
];

const transactionTypeStyles: Record<
  string,
  { active: string; inactive: string }
> = {
  expense: {
    active: "bg-rose-500/10 text-rose-700 shadow-sm",
    inactive: "text-[var(--muted)] hover:text-rose-700",
  },
  income: {
    active: "bg-emerald-500/10 text-emerald-700 shadow-sm",
    inactive: "text-[var(--muted)] hover:text-emerald-700",
  },
  transfer: {
    active: "bg-sky-500/10 text-sky-700 shadow-sm",
    inactive: "text-[var(--muted)] hover:text-sky-700",
  },
};

function isBalanceAdjustCategory(name: string) {
  const normalized = name.toLowerCase().trim();
  return normalized === "ajuste de saldo" || normalized === "balance adjustment";
}

export function TransactionModal() {
  const {
    session,
    activeFamilyId,
    accounts,
    categories,
    archivedCategories,
    transactionModal,
    closeTransactionModal,
    triggerRefresh,
    activeMembership,
  } = useApp();

  // Form state
  const [transactionType, setTransactionType] = useState("expense");
  const [transactionAccountId, setTransactionAccountId] = useState("");
  const [transactionDestinationAccountId, setTransactionDestinationAccountId] =
    useState("");
  const [transactionCategoryId, setTransactionCategoryId] = useState("");
  const [transactionAmount, setTransactionAmount] = useState("");
  const [transactionDescription, setTransactionDescription] = useState("");
  const [transactionTime, setTransactionTime] = useState("");
  const [transactionDate, setTransactionDate] = useState(() =>
    getBrazilToday(),
  );
  const [datePreset, setDatePreset] = useState<
    "today" | "yesterday" | "custom"
  >("today");

  // Calendar state
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

  // Error and loading state
  const [transactionError, setTransactionError] = useState<string | null>(null);
  const [isCreatingTransaction, setIsCreatingTransaction] = useState(false);

  // Build category map for parent lookups (needed before useLayoutEffect for edit mode)
  const categoriesById = [...categories, ...archivedCategories].reduce<
    Record<string, Category>
  >((acc, category) => {
    acc[category.id] = category;
    return acc;
  }, {});

  // Derived: editing mode
  const isEditing = Boolean(transactionModal.editTransaction);
  const editTx = transactionModal.editTransaction;
  const isOFXTransaction = Boolean(editTx?.source === "ofx" || editTx?.external_id);

  // Reset form when modal opens
  const prevIsOpen = useRef(false);
  useLayoutEffect(() => {
    if (transactionModal.isOpen && !prevIsOpen.current) {
      const today = getBrazilToday();
      /* eslint-disable react-hooks/set-state-in-effect -- Intentional: reset form when modal opens */
      if (editTx) {
        // Edit mode: pre-fill from existing transaction
        const cat = editTx.category_id ? categoriesById[editTx.category_id] : null;
        const catType = cat?.category_type as "expense" | "income" | undefined;
        setTransactionType(catType ?? transactionModal.initialType ?? "expense");
        setTransactionAccountId(editTx.account_id ?? "");
        setTransactionDestinationAccountId("");
        setTransactionCategoryId(editTx.category_id ?? "");
        const rawAmount = Number(editTx.amount);
        setTransactionAmount(Number.isFinite(rawAmount) ? String(Math.abs(rawAmount)) : editTx.amount);
        setTransactionDescription(editTx.description ?? "");
        setTransactionTime("");
        const editDate = editTx.posted_at?.slice(0, 10) || today;
        setTransactionDate(editDate);
        setDatePreset("custom");
        setCalendarTempDate(editDate);
        const editParts = getDateParts(editDate);
        if (editParts) {
          setCalendarMonth(editParts.monthIndex);
          setCalendarYear(editParts.year);
        }
      } else {
        // Create mode
        setTransactionType(transactionModal.initialType ?? "expense");
        setTransactionAccountId("");
        setTransactionDestinationAccountId("");
        setTransactionCategoryId("");
        setTransactionAmount("");
        setTransactionDescription("");
        setTransactionTime("");
        setTransactionDate(today);
        setDatePreset("today");
        setCalendarTempDate(today);
        const todayParts = getDateParts(today);
        if (todayParts) {
          setCalendarMonth(todayParts.monthIndex);
          setCalendarYear(todayParts.year);
        }
      }
      setTransactionError(null);
      setIsCalendarOpen(false);
      /* eslint-enable react-hooks/set-state-in-effect */
    }
    prevIsOpen.current = transactionModal.isOpen;
  }, [transactionModal.isOpen, transactionModal.initialType, editTx, categoriesById]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (!transactionModal.isOpen) return;

    const { body } = document;
    const previousOverflow = body.style.overflow;
    body.style.overflow = "hidden";
    return () => {
      body.style.overflow = previousOverflow;
    };
  }, [transactionModal.isOpen]);

  // Escape key handling
  useEffect(() => {
    if (!transactionModal.isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (isCalendarOpen) {
          setIsCalendarOpen(false);
        } else {
          closeTransactionModal();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [transactionModal.isOpen, isCalendarOpen, closeTransactionModal]);

  // Derived state
  const isTransfer = transactionType === "transfer";
  const canCreateTransaction = accounts.length > 0;

  const getCategoryDisplayLabel = (id: string, name: string) => {
    const category = categoriesById[id];
    if (!category?.parent_id) return name;
    const parent = categoriesById[category.parent_id];
    return parent ? `${parent.name} / ${name}` : name;
  };

  const buildCategoryOptions = (targetType?: string) => {
    return categories
      .filter((category) => !isBalanceAdjustCategory(category.name))
      .filter((category) =>
        targetType
          ? category.category_type === targetType
          : category.category_type !== "transfer",
      )
      .map((category) => ({
        ...category,
        label: getCategoryDisplayLabel(category.id, category.name),
      }))
      .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
  };

  const transactionCategoryOptions =
    transactionType && !isTransfer
      ? buildCategoryOptions(transactionType)
      : [];

  const hasCategoryOptions = transactionCategoryOptions.length > 0;
  const activeTypeLabel =
    transactionTypeOptions.find((option) => option.value === transactionType)
      ?.label ?? "";

  const categorySelectDisabled =
    !transactionType || isTransfer || !hasCategoryOptions;
  const categoryPlaceholder = transactionType
    ? `Categoria de ${activeTypeLabel.toLowerCase()}`
    : "Selecione o tipo primeiro";

  // Reconciled period warning
  const selectedAccountForReconciliation = !isEditing ? accounts.find((a) => a.id === transactionAccountId) : null;
  const isInReconciledPeriod = Boolean(
    selectedAccountForReconciliation?.reconciled_until &&
    transactionDate &&
    transactionDate <= selectedAccountForReconciliation.reconciled_until,
  );
  const userRole = activeMembership?.role;
  const isAdminUser = userRole === "owner" || userRole === "admin";
  const showReconciledWarning = isInReconciledPeriod && isAdminUser;

  // Destination accounts (for transfers)
  const destinationAccounts = accounts.filter(
    (account) => account.id !== transactionAccountId,
  );
  const destinationSelectDisabled =
    destinationAccounts.length === 0 || !transactionAccountId;
  const destinationPlaceholder = !transactionAccountId
    ? "Selecione a conta origem"
    : destinationAccounts.length === 0
      ? "Nenhuma outra conta"
      : "Selecione a conta";

  // Date helpers
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

  // Calendar computed values
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

  // Form submission
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

    if (isTransfer && !isEditing) {
      if (!transactionDestinationAccountId) {
        setTransactionError("Selecione a conta destino.");
        return;
      }

      if (transactionDestinationAccountId === transactionAccountId) {
        setTransactionError("A conta destino deve ser diferente.");
        return;
      }
    }

    if (!isTransfer && !isEditing) {
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

    if (!isEditing && (!Number.isFinite(amountValue) || amountValue <= 0)) {
      setTransactionError("Informe um valor válido.");
      return;
    }

    if (!transactionDate) {
      setTransactionError("Informe a data.");
      return;
    }

    // Check reconciled period for manual transactions (not editing)
    if (!isEditing && transactionAccountId) {
      const selectedAccount = accounts.find((a) => a.id === transactionAccountId);
      if (selectedAccount?.reconciled_until && transactionDate <= selectedAccount.reconciled_until) {
        const userRole = activeMembership?.role;
        const isAdmin = userRole === "owner" || userRole === "admin";
        if (!isAdmin) {
          setTransactionError(
            `Período reconciliado até ${selectedAccount.reconciled_until}. Lançamentos manuais neste período exigem permissão de administrador.`,
          );
          return;
        }
      }
    }

    const submitter = (event.nativeEvent as SubmitEvent).submitter as
      | HTMLButtonElement
      | null;
    const submitAction = submitter?.dataset.action ?? "close";

    setIsCreatingTransaction(true);
    let insertError: { message: string } | null = null;

    // Edit mode: update existing transaction
    if (isEditing && editTx) {
      const { error } = await supabase
        .from("transactions")
        .update({
          description: transactionDescription.trim() || null,
          category_id: transactionCategoryId || null,
          posted_at: transactionDate,
          auto_categorized: false,
        })
        .eq("id", editTx.id);
      if (error) {
        insertError = error;
      }
    } else if (isTransfer) {
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
    triggerRefresh();
    setIsCreatingTransaction(false);
    if (submitAction === "repeat") {
      return;
    }
    closeTransactionModal();
  };

  if (!transactionModal.isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-3 py-4 sm:items-center sm:px-4 sm:py-6">
      <button
        type="button"
        aria-label="Fechar modal"
        onClick={closeTransactionModal}
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
              {isEditing ? "Editar lançamento" : "Novo lançamento"}
            </p>
            <h2
              id="novo-lançamento-title"
              className="mt-0.5 text-base font-semibold text-[var(--ink)] sm:mt-2 sm:text-xl"
            >
              {isEditing ? "Editar movimentação" : "Registrar movimentação"}
            </h2>
            <p className="mt-1 hidden text-sm text-[var(--muted)] sm:block">
              {isEditing ? "Altere os campos desejados." : "Preencha os campos abaixo."}
            </p>
          </div>
          <button
            type="button"
            onClick={closeTransactionModal}
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
              {/* Transaction Type */}
              {!isEditing && (
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
                        <span className="block truncate">{option.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Account & Category/Destination */}
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
                      disabled={isEditing}
                      className="w-full rounded-xl border border-[var(--border)] bg-white px-10 py-3 text-sm text-[var(--ink)] shadow-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)] disabled:cursor-not-allowed disabled:bg-slate-50"
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
                          setTransactionDestinationAccountId(event.target.value)
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
                        Crie uma categoria de {activeTypeLabel} antes de
                        registrar.
                      </p>
                    ) : null}
                  </div>
                )}
              </div>

              {/* Amount & Date */}
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
                      disabled={isEditing}
                      className="w-full rounded-xl border border-[var(--border)] bg-white px-10 py-3 text-sm text-[var(--ink)] shadow-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)] disabled:cursor-not-allowed disabled:bg-slate-50"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-[var(--muted)]">
                    Data
                  </label>
                  {isEditing && isOFXTransaction ? (
                    <div className="grid gap-2">
                      <div className="w-full rounded-xl border border-[var(--border)] bg-slate-50 px-4 py-3 text-sm font-semibold text-[var(--muted)]">
                        {selectedDateLabel}
                      </div>
                      <p className="text-xs text-amber-600">
                        Data não editável — veio do extrato bancário.
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-2">
                      <div
                        role="group"
                        className="grid grid-cols-3 rounded-xl border border-[var(--border)] bg-slate-50 p-1"
                      >
                        {(
                          [
                            { label: "Hoje", value: "today" },
                            { label: "Ontem", value: "yesterday" },
                            { label: "Outros", value: "custom" },
                          ] as const
                        ).map((option) => (
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
                            <span className="block truncate">{option.label}</span>
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
                  )}
                </div>

                {/* Time */}
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
                      onChange={(event) =>
                        setTransactionTime(event.target.value)
                      }
                      type="time"
                      step="60"
                      placeholder="HH:MM"
                      className="w-full rounded-xl border border-[var(--border)] bg-white px-10 py-3 text-sm text-[var(--ink)] shadow-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]"
                    />
                  </div>
                  <p className="text-xs text-[var(--muted)]">
                    Usado apenas no extrato para ordenar lançamentos do mesmo
                    dia.
                  </p>
                </div>
              </div>

              {/* Description */}
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
                {isEditing && editTx?.original_description && editTx.original_description !== transactionDescription && (
                  <p className="mt-1 text-xs italic text-[var(--muted)]">
                    Original: {editTx.original_description}
                  </p>
                )}
              </div>

              {/* Reconciled period warning (admin override) */}
              {showReconciledWarning && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                  Atenção: esta data está no período reconciliado (até {selectedAccountForReconciliation?.reconciled_until}). Como administrador, você pode prosseguir.
                </div>
              )}

              {/* Error */}
              {transactionError ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {transactionError}
                </div>
              ) : null}

              {/* Submit buttons */}
              {isEditing ? (
                <div>
                  <button
                    type="submit"
                    data-action="close"
                    disabled={isCreatingTransaction}
                    className={`${primaryButton} w-full disabled:cursor-not-allowed disabled:opacity-70`}
                  >
                    {isCreatingTransaction ? "Salvando..." : "Salvar"}
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="submit"
                    data-action="close"
                    disabled={isCreatingTransaction}
                    className={`${primaryButton} w-full disabled:cursor-not-allowed disabled:opacity-70`}
                  >
                    {isCreatingTransaction ? "Salvando..." : "Salvar e fechar"}
                  </button>
                  <button
                    type="submit"
                    data-action="repeat"
                    disabled={isCreatingTransaction}
                    className="inline-flex w-full items-center justify-center rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--ink)] shadow-sm transition hover:border-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isCreatingTransaction ? "Salvando..." : "Salvar e criar outro"}
                  </button>
                </div>
              )}
            </form>
          )}
        </div>

        {/* Calendar Modal */}
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
                            formatDateKey(calendarYear, calendarMonth, day),
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
  );
}
