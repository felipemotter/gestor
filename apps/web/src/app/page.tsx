"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { getAuthedSupabaseClient, getSupabaseClient } from "@/lib/supabase/client";

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
    "dashboard" | "transactions" | "transfers"
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
      name: string;
      account_type: string;
      currency: string;
      visibility: string;
      owner_user_id: string | null;
      created_at: string;
    }>
  >([]);
  const [categories, setCategories] = useState<
    Array<{
      id: string;
      name: string;
      category_type: string;
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
  const [accountName, setAccountName] = useState("");
  const [accountType, setAccountType] = useState("checking");
  const [accountVisibility, setAccountVisibility] = useState("shared");
  const [accountError, setAccountError] = useState<string | null>(null);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [categoryType, setCategoryType] = useState("expense");
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [transactionAccountId, setTransactionAccountId] = useState("");
  const [transactionDestinationAccountId, setTransactionDestinationAccountId] =
    useState("");
  const [transactionCategoryId, setTransactionCategoryId] = useState("");
  const [transactionType, setTransactionType] = useState("expense");
  const [transactionAmount, setTransactionAmount] = useState("");
  const [transactionDescription, setTransactionDescription] = useState("");
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
      isTransactionModalOpen || isMobileMenuOpen || isFilterCalendarOpen;
    if (!shouldLockScroll) {
      return undefined;
    }
    const { body } = document;
    const previousOverflow = body.style.overflow;
    body.style.overflow = "hidden";
    return () => {
      body.style.overflow = previousOverflow;
    };
  }, [isTransactionModalOpen, isMobileMenuOpen, isFilterCalendarOpen]);

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

  const loadMemberships = async (userId: string, accessToken: string) => {
    setIsLoadingMemberships(true);
    const authedSupabase = getAuthedSupabaseClient(accessToken);
  const { data, error } = await authedSupabase
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

  const loadAccounts = async (familyId: string, accessToken: string) => {
    setIsLoadingAccounts(true);
    const authedSupabase = getAuthedSupabaseClient(accessToken);
    const { data, error } = await authedSupabase
      .from("accounts")
      .select("id, name, account_type, currency, visibility, owner_user_id, created_at")
      .eq("family_id", familyId)
      .order("created_at", { ascending: true });

    if (error) {
      setAccounts([]);
      setIsLoadingAccounts(false);
      return;
    }

    setAccounts(data ?? []);
    setIsLoadingAccounts(false);
  };

  const loadCategories = async (familyId: string, accessToken: string) => {
    setIsLoadingCategories(true);
    const authedSupabase = getAuthedSupabaseClient(accessToken);
    const { data, error } = await authedSupabase
      .from("categories")
      .select("id, name, category_type, created_at")
      .eq("family_id", familyId)
      .order("created_at", { ascending: true });

    if (error) {
      setCategories([]);
      setIsLoadingCategories(false);
      return;
    }

    setCategories(data ?? []);
    setIsLoadingCategories(false);
  };

  const loadTransactions = async (
    accountIds: string[],
    accessToken: string,
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

    const authedSupabase = getAuthedSupabaseClient(accessToken);
    let query = authedSupabase
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
    accessToken: string,
    range?: { startDate?: string; endDate?: string },
  ) => {
    if (accountIds.length === 0) {
      setMonthlySummary({ income: 0, expense: 0, count: 0 });
      return;
    }

    const fallback = getMonthRange(getBrazilToday().slice(0, 7));
    const startDate = range?.startDate || fallback.startDate;
    const endDate = range?.endDate || fallback.endDate;

    const authedSupabase = getAuthedSupabaseClient(accessToken);
    const { data, error } = await authedSupabase
      .from("transactions")
      .select("amount, category:categories(category_type), posted_at")
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
    accessToken: string,
    range?: { startDate?: string; endDate?: string },
  ) => {
    if (accountIds.length === 0) {
      setAccountBalances({});
      return;
    }

    setIsLoadingBalances(true);
    const fallback = getMonthRange(getBrazilToday().slice(0, 7));
    const startDate = range?.startDate || fallback.startDate;
    const endDate = range?.endDate || fallback.endDate;
    const authedSupabase = getAuthedSupabaseClient(accessToken);
    let query = authedSupabase
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
      acc[id] = 0;
      return acc;
    }, {});

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

    loadMemberships(session.user.id, session.access_token);
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
      setTransactions([]);
      return;
    }

    loadAccounts(activeFamilyId, session.access_token);
    loadCategories(activeFamilyId, session.access_token);
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

    loadTransactions(
      accounts.map((account) => account.id),
      session.access_token,
      transactionsLimit,
      {
        accountId: filterAccountId || undefined,
        categoryId: filterCategoryId || undefined,
        startDate:
          (isTransactionsView
            ? filterStartDate
            : activeMonthRange.startDate) || undefined,
        endDate:
          (isTransactionsView
            ? filterEndDate
            : activeMonthRange.endDate) || undefined,
      },
    );
    loadMonthlySummary(
      accounts.map((account) => account.id),
      session.access_token,
      {
        startDate: activeMonthRange.startDate || undefined,
        endDate: activeMonthRange.endDate || undefined,
      },
    );
    loadAccountBalances(
      accounts.map((account) => account.id),
      session.access_token,
      {
        startDate: activeMonthRange.startDate || undefined,
        endDate: activeMonthRange.endDate || undefined,
      },
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

    if (!categories.some((category) => category.id === filterCategoryId)) {
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

  const handleLogoClick = () => {
    setActiveView("dashboard");
    setIsMobileMenuOpen(false);
  };

  const openTransactionModal = (nextType: string = "expense") => {
    setTransactionError(null);
    setTransactionDestinationAccountId("");
    setTransactionCategoryId("");
    setTransactionType(nextType);
    setDatePreset("today");
    const today = getBrazilToday();
    setTransactionDate(today);
    setCalendarTempDate(today);
    setIsTransactionModalOpen(true);
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
    const authedSupabase = getAuthedSupabaseClient(session.access_token);

    const { data: family, error: familyError } = await authedSupabase
      .from("families")
      .insert({ name: trimmedName })
      .select("id, name, created_at")
      .single();

    if (familyError || !family) {
      setCreateError(familyError?.message ?? "Falha ao criar família.");
      setIsCreatingFamily(false);
      return;
    }

    const { error: membershipError } = await authedSupabase.from("memberships").insert({
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
    await loadMemberships(session.user.id, session.access_token);
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

  const openFilterCalendar = (target: "start" | "end") => {
    const { startDate, endDate } = getMonthRange(activeMonth);
    const fallbackDate =
      target === "start"
        ? filterStartDate || startDate || getBrazilToday()
        : filterEndDate || endDate || getBrazilToday();
    const fallbackParts = getDateParts(fallbackDate);
    if (fallbackParts) {
      setFilterCalendarMonth(fallbackParts.monthIndex);
      setFilterCalendarYear(fallbackParts.year);
    }
    setFilterCalendarTempDate(fallbackDate);
    setFilterCalendarTarget(target);
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
    if (filterCalendarTarget === "start") {
      handleFilterStartDateChange(filterCalendarTempDate);
    } else {
      handleFilterEndDateChange(filterCalendarTempDate);
    }
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

    setIsCreatingAccount(true);
    const authedSupabase = getAuthedSupabaseClient(session.access_token);
    const payload: Record<string, string | null> = {
      family_id: activeFamilyId,
      name: trimmedName,
      account_type: accountType,
      currency: "BRL",
      visibility: accountVisibility,
      owner_user_id:
        accountVisibility === "private" ? session.user.id : null,
    };

    const { error: accountInsertError } = await authedSupabase
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
    await loadAccounts(activeFamilyId, session.access_token);
    setIsCreatingAccount(false);
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

    setIsCreatingCategory(true);
    const authedSupabase = getAuthedSupabaseClient(session.access_token);
    const { error: categoryInsertError } = await authedSupabase
      .from("categories")
      .insert({
        family_id: activeFamilyId,
        name: trimmedName,
        category_type: categoryType,
      });

    if (categoryInsertError) {
      setCategoryError(categoryInsertError.message);
      setIsCreatingCategory(false);
      return;
    }

    setCategoryName("");
    setCategoryType("expense");
    await loadCategories(activeFamilyId, session.access_token);
    setIsCreatingCategory(false);
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
    const authedSupabase = getAuthedSupabaseClient(session.access_token);
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

      const { error } = await authedSupabase.from("transactions").insert([
        {
          account_id: transactionAccountId,
          category_id: null,
          amount: -amountValue,
          currency: "BRL",
          description: outgoingDescription,
          posted_at: transactionDate,
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
          source: "transfer",
          external_id: transferId,
        },
      ]);
      if (error) {
        insertError = error;
      }
    } else {
      const { error } = await authedSupabase.from("transactions").insert({
        account_id: transactionAccountId,
        category_id: transactionCategoryId,
        amount: amountValue,
        currency: "BRL",
        description: transactionDescription.trim() || null,
        posted_at: transactionDate,
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
    const monthRange = getMonthRange(activeMonth);
    const isTransactionsScreen = activeView === "transactions";
    const rangeStartDate = isTransactionsScreen
      ? filterStartDate || monthRange.startDate
      : monthRange.startDate;
    const rangeEndDate = isTransactionsScreen
      ? filterEndDate || monthRange.endDate
      : monthRange.endDate;
    await loadTransactions(
      accounts.map((account) => account.id),
      session.access_token,
      transactionsLimit,
      {
        accountId: filterAccountId || undefined,
        categoryId: filterCategoryId || undefined,
        startDate: rangeStartDate || undefined,
        endDate: rangeEndDate || undefined,
      },
    );
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
  const monthNet = monthlySummary.income - monthlySummary.expense;
  const economy = Math.max(monthNet, 0);
  const isDashboardView = activeView === "dashboard";
  const isTransactionsView = activeView === "transactions";
  const isTransfersView = activeView === "transfers";
  const effectiveSearchQuery = isTransactionsView ? searchQuery : "";
  const normalizedSearch = effectiveSearchQuery.trim().toLowerCase();
  const effectiveTypeFilters = isTransactionsView
    ? typeFilters
    : [...typeFilterAll];
  const typeFilteredTransactions = transactions.filter((transaction) => {
    const typeValue =
      transaction.source === "transfer"
        ? "transfer"
        : transaction.category?.category_type;
    if (!typeValue) {
      return false;
    }
    return effectiveTypeFilters.includes(typeValue);
  });
  const visibleTransactions = normalizedSearch
    ? typeFilteredTransactions.filter((transaction) => {
        const haystack = [
          transaction.description,
          transaction.category?.name,
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
  const expenseTotals = transactions.reduce<
    Record<string, { name: string; total: number }>
  >((acc, transaction) => {
    if (transaction.category?.category_type !== "expense") {
      return acc;
    }
    const amountValue = Number(transaction.amount);
    if (!Number.isFinite(amountValue)) {
      return acc;
    }
    const key = transaction.category?.id ?? "unknown";
    if (!acc[key]) {
      acc[key] = {
        name: transaction.category?.name ?? "Sem categoria",
        total: 0,
      };
    }
    acc[key].total += amountValue;
    return acc;
  }, {});
  const expenseItems = Object.values(expenseTotals).sort(
    (a, b) => b.total - a.total,
  );
  const topExpenseItems = expenseItems.slice(0, 4);
  const expenseTotal = expenseItems.reduce((sum, item) => sum + item.total, 0);
  const donutColors = ["#f97316", "#22c55e", "#3b82f6", "#facc15"];
  let donutCursor = 0;
  const donutSlices = topExpenseItems
    .map((item, index) => {
      if (expenseTotal <= 0) {
        return null;
      }
      const portion = item.total / expenseTotal;
      const start = donutCursor;
      const end = donutCursor + portion * 360;
      donutCursor = end;
      return `${donutColors[index % donutColors.length]} ${start}deg ${end}deg`;
    })
    .filter(Boolean)
    .join(", ");
  const donutBackground =
    expenseTotal > 0 && donutSlices
      ? `conic-gradient(${donutSlices})`
      : "conic-gradient(#e2e8f0 0deg, #e2e8f0 360deg)";
  const isTransfer = transactionType === "transfer";
  const filteredCategories =
    transactionType && !isTransfer
      ? categories.filter((category) => category.category_type === transactionType)
      : [];
  const transactionTypeOptions = [
    { value: "expense", label: "Despesa" },
    { value: "income", label: "Receita" },
    { value: "transfer", label: "Transferência" },
  ];
  const activeTypeLabel =
    transactionTypeOptions.find((option) => option.value === transactionType)
      ?.label ?? "tipo";
  const hasCategoryOptions = filteredCategories.length > 0;
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
    const categoryLabel =
      categories.find((category) => category.id === filterCategoryId)?.name ??
      "Categoria";
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
      const fallbackId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${group[0]?.id ?? Date.now()}`;
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
              <header className="rounded-3xl border border-[var(--border)] bg-white/80 px-5 py-4 shadow-sm backdrop-blur">
                <div className="relative flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:gap-3 lg:flex-nowrap">
                  <div className="flex w-full items-center justify-between gap-3 lg:order-none lg:justify-start">
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
                    <div
                      ref={monthPickerRef}
                      className="relative lg:absolute lg:left-1/2 lg:top-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2"
                    >
                      <button
                        type="button"
                        aria-haspopup="dialog"
                        aria-expanded={isMonthPickerOpen}
                        onClick={() => {
                          setMonthPickerYear(activeYear);
                          setIsMonthPickerOpen((prev) => !prev);
                        }}
                        className="flex h-10 items-center gap-2 rounded-full border border-[var(--border)] bg-white px-3 text-[11px] font-semibold text-[var(--ink)] shadow-sm transition hover:border-[var(--accent)] lg:h-11 lg:px-4 lg:text-sm"
                      >
                        <span>{activeMonthLabel}</span>
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
                  </div>
                  <div className="flex w-full flex-nowrap items-center justify-center gap-2 lg:ml-auto lg:w-auto">
                    <div className="flex h-10 items-center gap-1 rounded-full border border-[var(--border)] bg-white px-1 py-1 shadow-sm sm:h-11">
                      <span className="px-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)] sm:px-2 sm:text-[10px]">
                        Criar
                      </span>
                      <button
                        type="button"
                        onClick={() => openTransactionModal("expense")}
                        disabled={!canCreateTransaction}
                        className="inline-flex h-8 items-center justify-center rounded-full bg-rose-500 px-2 text-[11px] font-semibold text-white shadow-sm shadow-rose-500/30 transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-60 sm:h-9 sm:px-3 sm:text-xs"
                      >
                        Despesa
                      </button>
                      <button
                        type="button"
                        onClick={() => openTransactionModal("income")}
                        disabled={!canCreateTransaction}
                        className="inline-flex h-8 items-center justify-center rounded-full bg-emerald-500 px-2 text-[11px] font-semibold text-white shadow-sm shadow-emerald-500/30 transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60 sm:h-9 sm:px-3 sm:text-xs"
                      >
                        Receita
                      </button>
                      <button
                        type="button"
                        onClick={() => openTransactionModal("transfer")}
                        disabled={!canCreateTransaction}
                        className="inline-flex h-8 items-center justify-center rounded-full bg-sky-500 px-2 text-[11px] font-semibold text-white shadow-sm shadow-sky-500/30 transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60 sm:h-9 sm:px-3 sm:text-xs"
                      >
                        Transferência
                      </button>
                    </div>
                    <button
                      type="button"
                      className="inline-flex h-10 items-center justify-center rounded-full border border-[var(--border)] bg-white px-3 text-[11px] font-semibold text-[var(--ink)] shadow-sm transition hover:border-[var(--accent)] sm:h-11 sm:px-4 sm:text-xs"
                      disabled
                    >
                      Importar
                    </button>
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
                                    {filteredCategories.map((category) => (
                                      <option key={category.id} value={category.id}>
                                        {category.name}
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
                        {filterCalendarTarget === "end" ? "Data final" : "Data inicial"}
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
                    <section className="grid gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 px-3 py-4 text-white shadow-sm sm:p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-100">
                          Saldo total
                        </p>
                        <p className="mt-2 text-2xl font-semibold">
                          {currencyFormatter.format(monthNet)}
                        </p>
                        <p className="mt-1 text-xs text-emerald-100">
                          Período: {monthLabel}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 px-3 py-4 text-white shadow-sm sm:p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-orange-100">
                          Receitas
                        </p>
                        <p className="mt-2 text-2xl font-semibold">
                          {currencyFormatter.format(monthlySummary.income)}
                        </p>
                        <p className="mt-1 text-xs text-orange-100">
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
                      <div className="rounded-2xl bg-gradient-to-br from-sky-500 to-sky-600 px-3 py-4 text-white shadow-sm sm:p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-100">
                          Economia
                        </p>
                        <p className="mt-2 text-2xl font-semibold">
                          {currencyFormatter.format(economy)}
                        </p>
                        <p className="mt-1 text-xs text-sky-100">
                          Lançamentos: {monthlySummary.count}
                        </p>
                      </div>
                    </section>
                  ) : null}

                  {!isTransfersView ? (
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
                                    {categories.map((category) => (
                                      <option key={category.id} value={category.id}>
                                        {category.name}
                                      </option>
                                    ))}
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
                              {categories.map((category) => (
                                <option key={category.id} value={category.id}>
                                  {category.name}
                                </option>
                              ))}
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
                                      const rawValue = Number(transaction.amount);
                                      const isNumeric = Number.isFinite(rawValue);
                                      const displayValue =
                                        isTransferRow && isNumeric
                                          ? Math.abs(rawValue)
                                          : rawValue;
                                      const formattedValue = isNumeric
                                        ? currencyFormatter.format(displayValue)
                                        : transaction.amount;
                                      const categoryType =
                                        transaction.category?.category_type;
                                      const sign = isTransferRow
                                        ? rawValue < 0
                                          ? "-"
                                          : "+"
                                        : categoryType === "income"
                                          ? "+"
                                          : categoryType === "expense"
                                            ? "-"
                                            : "";
                                      const valueTone =
                                        isTransferRow
                                          ? rawValue < 0
                                            ? "text-rose-600"
                                            : "text-emerald-600"
                                          : categoryType === "expense"
                                            ? "text-rose-600"
                                            : categoryType === "income"
                                              ? "text-emerald-600"
                                              : "text-[var(--ink)]";
                                      const categoryLabel =
                                        transaction.category?.name ??
                                        (isTransferRow
                                          ? "Transferência"
                                          : "Sem categoria");
                                      const title =
                                        transaction.description?.trim() ||
                                        categoryLabel;
                                      const meta = [
                                        categoryLabel,
                                        transaction.account?.name ?? "Conta",
                                      ].join(" | ");
                                      const iconTone = isTransferRow
                                        ? "bg-sky-100 text-sky-600"
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
                                const rawValue = Number(transaction.amount);
                                const isNumeric = Number.isFinite(rawValue);
                                const displayValue =
                                  isTransferRow && isNumeric
                                    ? Math.abs(rawValue)
                                    : rawValue;
                                const formattedValue = isNumeric
                                  ? currencyFormatter.format(displayValue)
                                  : transaction.amount;
                                const categoryType =
                                  transaction.category?.category_type;
                                const sign = isTransferRow
                                  ? rawValue < 0
                                    ? "-"
                                    : "+"
                                  : categoryType === "income"
                                    ? "+"
                                    : categoryType === "expense"
                                      ? "-"
                                      : "";
                                const valueTone =
                                  isTransferRow
                                    ? rawValue < 0
                                      ? "text-rose-600"
                                      : "text-emerald-600"
                                    : categoryType === "expense"
                                      ? "text-rose-600"
                                      : categoryType === "income"
                                        ? "text-emerald-600"
                                        : "text-[var(--ink)]";
                                const categoryLabel =
                                  transaction.category?.name ??
                                  (isTransferRow ? "Transferência" : "Sem categoria");
                                const typeLabel = isTransferRow
                                  ? "Transferência"
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
                            {monthLabel}
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

                  {isDashboardView ? (
                    <>
                      <section className="grid gap-4 sm:gap-6 xl:grid-cols-2">
                        <div className="rounded-3xl border border-[var(--border)] bg-white/80 px-1.5 py-4 shadow-sm sm:p-6">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">
                              Despesas por categoria
                            </h3>
                            <span className="text-xs font-semibold text-[var(--muted)]">
                              {monthLabel}
                            </span>
                          </div>
                          <div className="mt-5 flex flex-wrap items-center gap-4 sm:gap-6">
                            <div
                              className="relative h-28 w-28 rounded-full sm:h-32 sm:w-32"
                              style={{ background: donutBackground }}
                            >
                              <div className="absolute inset-3 rounded-full bg-white sm:inset-4" />
                            </div>
                            <div className="flex-1 space-y-3">
                              {topExpenseItems.length === 0 ? (
                                <p className="text-sm text-[var(--muted)]">
                                  Sem despesas no período.
                                </p>
                              ) : (
                                topExpenseItems.map((item, index) => (
                                  <div
                                    key={`${item.name}-${index}`}
                                    className="flex items-center justify-between text-sm text-[var(--ink)]"
                                  >
                                    <div className="flex items-center gap-2">
                                      <span
                                        className="h-2.5 w-2.5 rounded-full"
                                        style={{
                                          backgroundColor:
                                            donutColors[index % donutColors.length],
                                        }}
                                      />
                                      <span>{item.name}</span>
                                    </div>
                                    <span className="font-semibold">
                                      {currencyFormatter.format(item.total)}
                                    </span>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="rounded-3xl border border-[var(--border)] bg-white/80 px-1.5 py-4 shadow-sm sm:p-6">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">
                              Fluxo de caixa
                            </h3>
                            <span className="text-xs font-semibold text-[var(--muted)]">
                              {monthLabel}
                            </span>
                          </div>
                          <div className="mt-4 rounded-2xl border border-[var(--border)] bg-white p-3 sm:p-4">
                            <svg
                              viewBox="0 0 320 120"
                              className="h-28 w-full sm:h-32"
                              aria-hidden="true"
                            >
                              <path
                                d="M10 90 L60 70 L110 85 L160 50 L210 60 L260 35 L310 45"
                                fill="none"
                                stroke="var(--accent)"
                                strokeWidth="3"
                                strokeLinecap="round"
                              />
                              <path
                                d="M10 90 L60 70 L110 85 L160 50 L210 60 L260 35 L310 45 L310 120 L10 120 Z"
                                fill="rgba(37, 99, 235, 0.12)"
                              />
                            </svg>
                            <div className="mt-3 flex justify-between text-xs text-[var(--muted)]">
                              <span>Semana 1</span>
                              <span>Semana 2</span>
                              <span>Semana 3</span>
                              <span>Semana 4</span>
                            </div>
                          </div>
                        </div>
                      </section>

                      <details
                        className="rounded-3xl border border-[var(--border)] bg-white/80 px-1.5 py-4 shadow-sm sm:p-6"
                        open={accounts.length === 0 || categories.length === 0}
                      >
                        <summary className="cursor-pointer text-sm font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">
                          Cadastros base
                        </summary>
                        <div className="mt-5 grid gap-4 sm:gap-6 lg:grid-cols-2">
                      <div>
                        <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">
                          Contas
                        </h2>
                        <p className="mt-3 text-sm text-[var(--muted)]">
                          Crie as contas que vao aparecer no dashboard.
                        </p>
                        <div className="mt-4 space-y-3">
                          {isLoadingAccounts ? (
                            <p className="text-sm text-[var(--muted)]">
                              Carregando contas...
                            </p>
                          ) : accounts.length === 0 ? (
                            <p className="text-sm text-[var(--muted)]">
                              Nenhuma conta criada ainda.
                            </p>
                          ) : (
                            accounts.map((account) => (
                              <div
                                key={account.id}
                                className="rounded-2xl border border-[var(--border)] bg-white px-3 py-2.5 sm:px-4 sm:py-3"
                              >
                                <p className="text-sm font-semibold text-[var(--ink)]">
                                  {account.name}
                                </p>
                                <p className="mt-1 text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                                  {account.account_type.replace("_", " ")} ·{" "}
                                  {account.visibility === "shared"
                                    ? "Compartilhada"
                                    : "Privada"}
                                </p>
                                <div
                                  className={`mt-3 flex items-center gap-2 text-sm font-semibold ${
                                    (accountBalances[account.id] ?? 0) < 0
                                      ? "text-rose-600"
                                      : "text-emerald-600"
                                  }`}
                                >
                                  {(accountBalances[account.id] ?? 0) < 0 ? (
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
                                  ) : (
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
                                  )}
                                  <span>
                                    {currencyFormatter.format(
                                      accountBalances[account.id] ?? 0,
                                    )}
                                  </span>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                        <form
                          className="mt-4 grid gap-3"
                          onSubmit={handleCreateAccount}
                        >
                          <input
                            value={accountName}
                            onChange={(event) =>
                              setAccountName(event.target.value)
                            }
                            placeholder="Ex.: Conta principal"
                            className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm text-[var(--ink)] shadow-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]"
                          />
                          <div className="grid gap-3 sm:grid-cols-2">
                            <select
                              value={accountType}
                              onChange={(event) =>
                                setAccountType(event.target.value)
                              }
                              className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm text-[var(--ink)] shadow-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]"
                            >
                              <option value="checking">Conta corrente</option>
                              <option value="savings">Poupança</option>
                              <option value="credit_card">Cartão</option>
                              <option value="cash">Dinheiro</option>
                            </select>
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
                          {accountError ? (
                            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                              {accountError}
                            </div>
                          ) : null}
                          <button
                            type="submit"
                            disabled={isCreatingAccount || !activeFamilyId}
                            className={`${primaryButton} w-full disabled:cursor-not-allowed disabled:opacity-70`}
                          >
                            {isCreatingAccount ? "Criando..." : "Criar conta"}
                          </button>
                        </form>
                      </div>
                      <div>
                        <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">
                          Categorias
                        </h2>
                        <p className="mt-3 text-sm text-[var(--muted)]">
                          Separe entradas e saídas para organizar os relatórios.
                        </p>
                        <div className="mt-4 space-y-3">
                          {isLoadingCategories ? (
                            <p className="text-sm text-[var(--muted)]">
                              Carregando categorias...
                            </p>
                          ) : categories.length === 0 ? (
                            <p className="text-sm text-[var(--muted)]">
                              Nenhuma categoria criada ainda.
                            </p>
                          ) : (
                            categories.map((category) => (
                              <div
                                key={category.id}
                                className="rounded-2xl border border-[var(--border)] bg-white px-3 py-2.5 sm:px-4 sm:py-3"
                              >
                                <p className="text-sm font-semibold text-[var(--ink)]">
                                  {category.name}
                                </p>
                                <p className="mt-1 text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                                  {category.category_type}
                                </p>
                              </div>
                            ))
                          )}
                        </div>
                        <form
                          className="mt-4 grid gap-3"
                          onSubmit={handleCreateCategory}
                        >
                          <input
                            value={categoryName}
                            onChange={(event) =>
                              setCategoryName(event.target.value)
                            }
                            placeholder="Ex.: Moradia"
                            className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm text-[var(--ink)] shadow-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]"
                          />
                          <select
                            value={categoryType}
                            onChange={(event) =>
                              setCategoryType(event.target.value)
                            }
                            className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm text-[var(--ink)] shadow-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]"
                          >
                            <option value="expense">Despesa</option>
                            <option value="income">Receita</option>
                            <option value="transfer">Transferência</option>
                          </select>
                          {categoryError ? (
                            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                              {categoryError}
                            </div>
                          ) : null}
                          <button
                            type="submit"
                            disabled={isCreatingCategory || !activeFamilyId}
                            className={`${primaryButton} w-full disabled:cursor-not-allowed disabled:opacity-70`}
                          >
                            {isCreatingCategory ? "Criando..." : "Criar categoria"}
                          </button>
                        </form>
                      </div>
                    </div>
                  </details>
                    </>
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
