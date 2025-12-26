"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { getAuthedSupabaseClient, getSupabaseClient } from "@/lib/supabase/client";

const supabase = getSupabaseClient();
const primaryButton =
  "inline-flex items-center justify-center rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-500/30 transition hover:bg-[var(--accent-strong)]";
const secondaryButton =
  "inline-flex items-center justify-center rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--ink)] shadow-sm transition hover:border-[var(--accent)] hover:text-[var(--accent-strong)]";
const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const shortDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
});

const getMonthRange = (monthValue: string) => {
  const [year, month] = monthValue.split("-").map(Number);
  if (!year || !month) {
    return { startDate: "", endDate: "" };
  }

  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);

  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
};

export default function HomePage() {
  const [session, setSession] = useState<Session | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [activeMonth, setActiveMonth] = useState(() =>
    new Date().toISOString().slice(0, 7),
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
  const [transactionDate, setTransactionDate] = useState(() => {
    const today = new Date();
    return today.toISOString().slice(0, 10);
  });
  const [transactionError, setTransactionError] = useState<string | null>(null);
  const [isCreatingTransaction, setIsCreatingTransaction] = useState(false);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [filterAccountId, setFilterAccountId] = useState("");
  const [filterCategoryId, setFilterCategoryId] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");

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

    const fallback = getMonthRange(new Date().toISOString().slice(0, 7));
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
    const fallback = getMonthRange(new Date().toISOString().slice(0, 7));
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
        startDate: filterStartDate || undefined,
        endDate: filterEndDate || undefined,
      },
    );
    loadMonthlySummary(
      accounts.map((account) => account.id),
      session.access_token,
      {
        startDate: filterStartDate || undefined,
        endDate: filterEndDate || undefined,
      },
    );
    loadAccountBalances(
      accounts.map((account) => account.id),
      session.access_token,
      {
        startDate: filterStartDate || undefined,
        endDate: filterEndDate || undefined,
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
  ]);

  useEffect(() => {
    setTransactionsLimit(8);
  }, [filterAccountId, filterCategoryId, filterStartDate, filterEndDate, activeFamilyId]);

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
      setTransactionsLimit(8);
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
  }, [
    accounts,
    categories,
    activeFamilyId,
    transactionAccountId,
    transactionDestinationAccountId,
    transactionCategoryId,
    filterAccountId,
    filterCategoryId,
    filterStartDate,
    filterEndDate,
    activeMonth,
  ]);

  useEffect(() => {
    if (!isTransactionModalOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsTransactionModalOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isTransactionModalOpen]);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await supabase.auth.signOut();
    setIsSigningOut(false);
  };

  const openTransactionModal = () => {
    setTransactionError(null);
    setTransactionDestinationAccountId("");
    setTransactionCategoryId("");
    setTransactionType("expense");
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
      setCreateError("Sessao invalida. Saia e entre novamente.");
      return;
    }

    const trimmedName = familyName.trim();
    if (trimmedName.length < 2) {
      setCreateError("Informe um nome para a familia.");
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
      setCreateError(familyError?.message ?? "Falha ao criar familia.");
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

  const handleCreateAccount = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAccountError(null);

    if (!session?.access_token || !activeFamilyId) {
      setAccountError("Selecione uma familia ativa.");
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
      setCategoryError("Selecione uma familia ativa.");
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
      setTransactionError("Selecione uma familia ativa.");
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
          "Selecione uma categoria valida para o tipo escolhido.",
        );
        return;
      }
    }

    const normalizedAmount = transactionAmount.replace(",", ".").trim();
    const amountValue = Number(normalizedAmount);

    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      setTransactionError("Informe um valor valido.");
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
          ? `${baseDescription} (Transferencia para ${
              destinationAccount?.name ?? "conta"
            })`
          : `Transferencia para ${destinationAccount?.name ?? "conta"}`;
      const incomingDescription =
        baseDescription.length > 0
          ? `${baseDescription} (Transferencia de ${originAccount?.name ?? "conta"})`
          : `Transferencia de ${originAccount?.name ?? "conta"}`;

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
    await loadTransactions(
      accounts.map((account) => account.id),
      session.access_token,
      transactionsLimit,
      {
        accountId: filterAccountId || undefined,
        categoryId: filterCategoryId || undefined,
        startDate: filterStartDate || undefined,
        endDate: filterEndDate || undefined,
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
  const normalizedSearch = searchQuery.trim().toLowerCase();
  const visibleTransactions = normalizedSearch
    ? transactions.filter((transaction) => {
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
    : transactions;
  const hasActiveFilters = Boolean(
    filterAccountId || filterCategoryId || normalizedSearch,
  );
  const showPagination = !normalizedSearch;
  const monthDate = new Date(`${activeMonth}-01T00:00:00`);
  const monthLabel = Number.isNaN(monthDate.getTime())
    ? activeMonth
    : new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" })
        .format(monthDate)
        .replace(/^./, (char) => char.toUpperCase());
  const userInitial =
    session?.user.email?.trim().charAt(0).toUpperCase() ?? "U";
  const formatDate = (value: string) => {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }
    return shortDateFormatter.format(parsed);
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
    { value: "transfer", label: "Transferencia" },
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
  const destinationAccounts = accounts.filter(
    (account) => account.id !== transactionAccountId,
  );
  const destinationPlaceholder =
    destinationAccounts.length > 0
      ? "Selecione a conta destino"
      : "Crie outra conta";
  const destinationSelectDisabled =
    destinationAccounts.length === 0 || !transactionAccountId;

  return (
    <div className="relative min-h-screen overflow-hidden text-[var(--ink)]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.14),_transparent_55%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(15,23,42,0.05)_1px,transparent_1px),linear-gradient(180deg,rgba(15,23,42,0.05)_1px,transparent_1px)] bg-[size:80px_80px] opacity-35" />
      </div>

      <div className="relative mx-auto min-h-screen w-full max-w-7xl px-6 py-6">
        {isChecking ? (
          <div className="flex flex-1 items-center justify-center text-sm text-[var(--muted)]">
            Carregando informacoes...
          </div>
        ) : session ? (
          <div className="grid min-h-[calc(100vh-3rem)] gap-6 lg:grid-cols-[220px_1fr]">
            <aside className="hidden lg:flex lg:flex-col rounded-3xl border border-[var(--border)] bg-white/90 p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--accent)] text-sm font-semibold text-white">
                  DD
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.4em] text-[var(--muted)]">
                    Projeto
                  </p>
                  <p className="text-base font-semibold text-[var(--ink)]">
                    Dindin
                  </p>
                </div>
              </div>
              <nav className="mt-6 flex flex-1 flex-col gap-1 text-sm text-[var(--muted)]">
                {[
                  "Dashboard",
                  "Lancamentos",
                  "Contas",
                  "Orcamento",
                  "Relatorios",
                  "Metas",
                  "Regras e Automacao",
                  "Categorias",
                  "Importacoes",
                ].map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={`flex items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-semibold transition ${
                      item === "Dashboard"
                        ? "bg-[var(--accent-soft)] text-[var(--accent-strong)]"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <span>{item}</span>
                  </button>
                ))}
              </nav>
              <div className="mt-6 rounded-2xl border border-[var(--border)] bg-white p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">
                  Sessao
                </p>
                <p className="mt-2 truncate text-[10px] font-semibold text-[var(--ink)]">
                  {session.user.email ?? "usuario"}
                </p>
                <div className="mt-3 flex items-center justify-between text-xs text-[var(--muted)]">
                  <span>Familia</span>
                  <span className="font-semibold text-[var(--ink)]">
                    {activeMembership?.family?.name ?? "Selecione"}
                  </span>
                </div>
              </div>
            </aside>

            <div className="flex min-w-0 flex-col gap-6">
              <header className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-[var(--border)] bg-white/80 px-5 py-4 shadow-sm backdrop-blur">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent)] text-sm font-semibold text-white lg:hidden">
                    DD
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.4em] text-[var(--muted)]">
                      Dashboard
                    </p>
                    <p className="text-lg font-semibold text-[var(--ink)]">
                      Visao geral
                    </p>
                    <p className="text-xs text-[var(--muted)]">
                      Familia: {activeMembership?.family?.name ?? "Selecione"}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-xs font-semibold text-[var(--ink)] shadow-sm">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">
                      Familia
                    </p>
                    <p className="text-xs font-semibold text-[var(--ink)]">
                      {activeMembership?.family?.name ?? "Sem familia"}
                    </p>
                  </div>
                  <input
                    type="month"
                    value={activeMonth}
                    onChange={(event) => setActiveMonth(event.target.value)}
                    className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-xs font-semibold text-[var(--ink)] shadow-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]"
                  />
                  <input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Buscar..."
                    className="min-w-[200px] rounded-xl border border-[var(--border)] bg-white px-4 py-2 text-xs font-semibold text-[var(--ink)] shadow-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]"
                  />
                  <button
                    type="button"
                    onClick={openTransactionModal}
                    className={`inline-flex items-center justify-center rounded-full bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-blue-500/30 transition hover:bg-[var(--accent-strong)] ${
                      !canCreateTransaction ? "opacity-60" : ""
                    }`}
                  >
                    Novo lancamento
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-full border border-[var(--border)] bg-white px-4 py-2 text-xs font-semibold text-[var(--ink)] shadow-sm transition hover:border-[var(--accent)]"
                    disabled
                  >
                    Transferencia
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-full border border-[var(--border)] bg-white px-4 py-2 text-xs font-semibold text-[var(--ink)] shadow-sm transition hover:border-[var(--accent)]"
                    disabled
                  >
                    Importar
                  </button>
                  <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-white text-xs font-semibold text-[var(--ink)] shadow-sm">
                    {userInitial}
                  </div>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-full border border-[var(--border)] bg-white px-4 py-2 text-xs font-semibold text-[var(--ink)] shadow-sm transition hover:border-[var(--accent)]"
                    disabled={isSigningOut}
                    onClick={handleSignOut}
                  >
                    {isSigningOut ? "Saindo..." : "Sair"}
                  </button>
                </div>
              </header>

              {isTransactionModalOpen ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
                  <button
                    type="button"
                    aria-label="Fechar modal"
                    onClick={() => setIsTransactionModalOpen(false)}
                    className="absolute inset-0 animate-[overlay-in_0.2s_ease-out] bg-slate-900/40 backdrop-blur-sm"
                  />
                  <div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="novo-lancamento-title"
                    className="relative z-10 w-full max-w-2xl animate-[modal-in_0.22s_ease-out] overflow-hidden rounded-3xl border border-[var(--border)] bg-white p-6 shadow-[var(--shadow)]"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">
                          Novo lancamento
                        </p>
                        <h2
                          id="novo-lancamento-title"
                          className="mt-2 text-xl font-semibold text-[var(--ink)]"
                        >
                          Registrar movimentacao
                        </h2>
                        <p className="mt-1 text-sm text-[var(--muted)]">
                          Preencha os campos abaixo.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsTransactionModalOpen(false)}
                        className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-xs font-semibold text-[var(--ink)] shadow-sm transition hover:border-[var(--accent)]"
                      >
                        Fechar
                      </button>
                    </div>

                    {!canCreateTransaction ? (
                      <div className="mt-5 rounded-2xl border border-dashed border-[var(--border)] bg-slate-50 px-4 py-4 text-sm text-[var(--muted)]">
                        Crie ao menos uma conta para liberar os lancamentos.
                      </div>
                    ) : (
                      <form
                        className="mt-6 grid gap-6"
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
                            <div className="relative">
                              <svg
                                aria-hidden="true"
                                viewBox="0 0 24 24"
                                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.5"
                              >
                                <rect x="3" y="5" width="18" height="16" rx="2" />
                                <path d="M16 3v4M8 3v4M3 11h18" />
                              </svg>
                              <input
                                type="date"
                                value={transactionDate}
                                onChange={(event) =>
                                  setTransactionDate(event.target.value)
                                }
                                className="w-full rounded-xl border border-[var(--border)] bg-white px-10 py-3 text-sm text-[var(--ink)] shadow-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2">
                          <label className="text-xs font-semibold text-[var(--muted)]">
                            Descricao
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
                              placeholder="Descricao (opcional)"
                              className="w-full rounded-xl border border-[var(--border)] bg-white px-10 py-3 text-sm text-[var(--ink)] shadow-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]"
                            />
                          </div>
                        </div>
                        {transactionError ? (
                          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                            {transactionError}
                          </div>
                        ) : null}
                        <div className="grid gap-3 sm:grid-cols-2">
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
                </div>
              ) : null}

              {isLoadingMemberships ? (
                <div className="rounded-3xl border border-[var(--border)] bg-white/80 p-6 shadow-sm">
                  <p className="text-sm text-[var(--muted)]">
                    Carregando familias...
                  </p>
                </div>
              ) : memberships.length === 0 ? (
                <section className="rounded-3xl border border-[var(--border)] bg-white/80 p-6 shadow-sm">
                  <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">
                    Criar familia
                  </h2>
                  <p className="mt-3 text-sm text-[var(--muted)]">
                    Defina o grupo principal para organizar contas, lancamentos
                    e permissoes.
                  </p>
                  <form
                    className="mt-4 flex flex-col gap-3"
                    onSubmit={handleCreateFamily}
                  >
                    <input
                      value={familyName}
                      onChange={(event) => setFamilyName(event.target.value)}
                      placeholder="Ex.: Familia Silva"
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
                      {isCreatingFamily ? "Criando..." : "Criar familia"}
                    </button>
                  </form>
                </section>
              ) : (
                <main className="flex flex-col gap-6">
                  <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-4 text-white shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-100">
                        Saldo total
                      </p>
                      <p className="mt-2 text-2xl font-semibold">
                        {currencyFormatter.format(monthNet)}
                      </p>
                      <p className="mt-1 text-xs text-emerald-100">
                        Periodo: {monthLabel}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 p-4 text-white shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-orange-100">
                        Receitas
                      </p>
                      <p className="mt-2 text-2xl font-semibold">
                        {currencyFormatter.format(monthlySummary.income)}
                      </p>
                      <p className="mt-1 text-xs text-orange-100">
                        Periodo: {monthLabel}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-gradient-to-br from-rose-500 to-rose-600 p-4 text-white shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-rose-100">
                        Despesas
                      </p>
                      <p className="mt-2 text-2xl font-semibold">
                        {currencyFormatter.format(monthlySummary.expense)}
                      </p>
                      <p className="mt-1 text-xs text-rose-100">
                        Periodo: {monthLabel}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-gradient-to-br from-sky-500 to-sky-600 p-4 text-white shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-100">
                        Economia
                      </p>
                      <p className="mt-2 text-2xl font-semibold">
                        {currencyFormatter.format(economy)}
                      </p>
                      <p className="mt-1 text-xs text-sky-100">
                        Lancamentos: {monthlySummary.count}
                      </p>
                    </div>
                  </section>

                  <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
                    <div className="rounded-3xl border border-[var(--border)] bg-white/80 p-6 shadow-sm">
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                          <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">
                            Ultimos lancamentos
                          </h3>
                          <p className="mt-2 text-sm text-[var(--muted)]">
                            Periodo selecionado: {monthLabel}
                          </p>
                        </div>
                        {hasActiveFilters ? (
                          <button
                            type="button"
                            onClick={() => {
                              setFilterAccountId("");
                              setFilterCategoryId("");
                              setSearchQuery("");
                            }}
                            className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-xs font-semibold text-[var(--ink)] transition hover:border-[var(--accent)]"
                          >
                            Limpar filtros
                          </button>
                        ) : null}
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <select
                          value={filterAccountId}
                          onChange={(event) =>
                            setFilterAccountId(event.target.value)
                          }
                          className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--ink)] shadow-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]"
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
                          className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--ink)] shadow-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]"
                        >
                          <option value="">Todas as categorias</option>
                          {categories.map((category) => (
                            <option key={category.id} value={category.id}>
                              {category.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="mt-4 overflow-x-auto">
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
                                  Carregando lancamentos...
                                </td>
                              </tr>
                            ) : visibleTransactions.length === 0 ? (
                              <tr>
                                <td
                                  colSpan={5}
                                  className="py-4 text-sm text-[var(--muted)]"
                                >
                                  Nenhum lancamento encontrado.
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
                                  (isTransferRow ? "Transferencia" : "Sem categoria");
                                const typeLabel = isTransferRow
                                  ? "Transferencia"
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
                          {normalizedSearch ? (
                            <span>Resultados: {visibleTransactions.length}</span>
                          ) : (
                            <span>
                              Exibindo {transactions.length} de {transactionsTotal}
                            </span>
                          )}
                          {showPagination ? (
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
                          )}
                        </div>
                      ) : null}
                    </div>

                    <aside className="space-y-6">
                      <div className="rounded-3xl border border-[var(--border)] bg-white/80 p-6 shadow-sm">
                        <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">
                          Alertas
                        </h3>
                        <div className="mt-4 space-y-3 text-sm text-[var(--ink)]">
                          <div className="flex items-start gap-3 rounded-2xl border border-[var(--border)] bg-white px-4 py-3">
                            <span className="mt-1 h-2 w-2 rounded-full bg-rose-500" />
                            <div>
                              <p className="font-semibold">
                                Orcamento de alimentacao estourado
                              </p>
                              <p className="text-xs text-[var(--muted)]">
                                Revise as despesas do mes.
                              </p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3 rounded-2xl border border-[var(--border)] bg-white px-4 py-3">
                            <span className="mt-1 h-2 w-2 rounded-full bg-amber-500" />
                            <div>
                              <p className="font-semibold">
                                Fatura do cartao em 5 dias
                              </p>
                              <p className="text-xs text-[var(--muted)]">
                                Agende o pagamento.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-3xl border border-[var(--border)] bg-white/80 p-6 shadow-sm">
                        <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">
                          Atalhos rapidos
                        </h3>
                        <div className="mt-4 flex flex-col gap-3">
                          <button
                            type="button"
                            onClick={openTransactionModal}
                            className="inline-flex items-center justify-center rounded-xl bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-blue-500/30 transition hover:bg-[var(--accent-strong)]"
                          >
                            Lancamento rapido
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

                      <div className="rounded-3xl border border-[var(--border)] bg-white/80 p-6 shadow-sm">
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
                                  className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm"
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

                      <div className="rounded-3xl border border-[var(--border)] bg-white/80 p-6 shadow-sm">
                        <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">
                          Familia ativa
                        </h3>
                        <p className="mt-3 text-lg font-semibold text-[var(--ink)]">
                          {activeMembership?.family?.name ?? "Familia"}
                        </p>
                        <p className="mt-1 text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                          Papel: {activeMembership?.role ?? "-"}
                        </p>
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          <div className="rounded-2xl border border-[var(--border)] bg-white px-4 py-3">
                            <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                              Familias
                            </p>
                            <p className="mt-1 text-base font-semibold text-[var(--ink)]">
                              {memberships.length}
                            </p>
                          </div>
                          <div className="rounded-2xl border border-[var(--border)] bg-white px-4 py-3">
                            <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                              Contas
                            </p>
                            <p className="mt-1 text-base font-semibold text-[var(--ink)]">
                              {isLoadingAccounts ? "..." : accounts.length}
                            </p>
                          </div>
                          <div className="rounded-2xl border border-[var(--border)] bg-white px-4 py-3">
                            <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                              Categorias
                            </p>
                            <p className="mt-1 text-base font-semibold text-[var(--ink)]">
                              {isLoadingCategories ? "..." : categories.length}
                            </p>
                          </div>
                          <div className="rounded-2xl border border-[var(--border)] bg-white px-4 py-3">
                            <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                              Lancamentos
                            </p>
                            <p className="mt-1 text-base font-semibold text-[var(--ink)]">
                              {transactionsTotal ?? transactions.length}
                            </p>
                          </div>
                        </div>
                      </div>
                    </aside>
                  </section>

                  <section className="grid gap-6 xl:grid-cols-2">
                    <div className="rounded-3xl border border-[var(--border)] bg-white/80 p-6 shadow-sm">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">
                          Despesas por categoria
                        </h3>
                        <span className="text-xs font-semibold text-[var(--muted)]">
                          {monthLabel}
                        </span>
                      </div>
                      <div className="mt-5 flex flex-wrap items-center gap-6">
                        <div
                          className="relative h-32 w-32 rounded-full"
                          style={{ background: donutBackground }}
                        >
                          <div className="absolute inset-4 rounded-full bg-white" />
                        </div>
                        <div className="flex-1 space-y-3">
                          {topExpenseItems.length === 0 ? (
                            <p className="text-sm text-[var(--muted)]">
                              Sem despesas no periodo.
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

                    <div className="rounded-3xl border border-[var(--border)] bg-white/80 p-6 shadow-sm">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">
                          Fluxo de caixa
                        </h3>
                        <span className="text-xs font-semibold text-[var(--muted)]">
                          {monthLabel}
                        </span>
                      </div>
                      <div className="mt-4 rounded-2xl border border-[var(--border)] bg-white p-4">
                        <svg
                          viewBox="0 0 320 120"
                          className="h-32 w-full"
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
                    className="rounded-3xl border border-[var(--border)] bg-white/80 p-6 shadow-sm"
                    open={accounts.length === 0 || categories.length === 0}
                  >
                    <summary className="cursor-pointer text-sm font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">
                      Cadastros base
                    </summary>
                    <div className="mt-5 grid gap-6 lg:grid-cols-2">
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
                                className="rounded-2xl border border-[var(--border)] bg-white px-4 py-3"
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
                              <option value="savings">Poupanca</option>
                              <option value="credit_card">Cartao</option>
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
                          Separe entradas e saidas para organizar os relatorios.
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
                                className="rounded-2xl border border-[var(--border)] bg-white px-4 py-3"
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
                            <option value="transfer">Transferencia</option>
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
                Um painel unico para organizar a rotina financeira da familia.
              </h1>
              <p className="max-w-xl text-base text-[var(--muted)]">
                Centralize contas, lancamentos e anexos. Automatize entradas via
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
                  title: "Lancamentos e categorias",
                  body: "Cadastre entradas e saidas em segundos, com regras claras.",
                },
                {
                  title: "Permissoes por membro",
                  body: "Cada pessoa ve apenas as contas que importam.",
                },
                {
                  title: "Automacoes e bots",
                  body: "Email, n8n e chat para lancar sem abrir o app.",
                },
                {
                  title: "Relatorios vivos",
                  body: "Visao por periodo, conta e categoria em tempo real.",
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
