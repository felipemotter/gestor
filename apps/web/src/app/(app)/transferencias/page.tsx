"use client";

import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/layout/Header";
import { useApp, type Account } from "@/contexts/AppContext";
import { getSupabaseClient } from "@/lib/supabase/client";

const supabase = getSupabaseClient();

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const formatDate = (dateString: string) => {
  const date = new Date(dateString + "T12:00:00");
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

type TransactionRow = {
  id: string;
  posted_at: string;
  amount: string;
  description: string | null;
  source: string | null;
  external_id: string | null;
  account: Account | null;
};

type TransferItem = {
  id: string;
  posted_at: string;
  amount: number;
  from: Account | null;
  to: Account | null;
  description: string;
};

export default function TransferenciasPage() {
  const { session, activeFamilyId, activeMonth, accounts, dataRefreshCounter } = useApp();

  // Filter state
  const [fromAccountId, setFromAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Data state
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Month label
  const monthLabel = useMemo(() => {
    const [year, month] = activeMonth.split("-").map(Number);
    const date = new Date(year, month - 1, 1);
    return date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  }, [activeMonth]);

  // Load transactions for the month
  useEffect(() => {
    if (!session?.access_token || !activeFamilyId) {
      setTransactions([]);
      return;
    }

    const loadTransactions = async () => {
      setIsLoading(true);

      const [year, month] = activeMonth.split("-").map(Number);
      const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
      const endDate = new Date(year, month, 0).toISOString().slice(0, 10);

      const { data, error } = await supabase
        .from("transactions")
        .select("id, posted_at, amount, description, source, external_id, account:accounts!inner(id, name, icon_key, icon_bg, icon_color)")
        .eq("account.family_id", activeFamilyId)
        .eq("source", "transfer")
        .gte("posted_at", startDate)
        .lte("posted_at", endDate)
        .order("posted_at", { ascending: false });

      if (error) {
        console.error("Error loading transfers:", error);
        setTransactions([]);
        setIsLoading(false);
        return;
      }

      const rows = (data ?? []).map((row) => ({
        id: row.id,
        posted_at: row.posted_at,
        amount: row.amount,
        description: row.description,
        source: row.source,
        external_id: row.external_id,
        account: row.account as unknown as Account,
      }));

      setTransactions(rows);
      setIsLoading(false);
    };

    loadTransactions();
  }, [session?.access_token, activeFamilyId, activeMonth, dataRefreshCounter]);

  // Reset filters when accounts change
  useEffect(() => {
    if (!accounts.some((a) => a.id === fromAccountId)) {
      setFromAccountId("");
    }
    if (!accounts.some((a) => a.id === toAccountId)) {
      setToAccountId("");
    }
  }, [accounts, fromAccountId, toAccountId]);

  // Build transfer items from transaction pairs
  const transferItems = useMemo(() => {
    // Group by external_id
    const groups = transactions.reduce<Record<string, TransactionRow[]>>(
      (acc, tx) => {
        const key = tx.external_id ?? tx.id;
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push(tx);
        return acc;
      },
      {},
    );

    // Build transfer items from groups
    const items: TransferItem[] = Object.values(groups).map((group) => {
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
    });

    return items.sort((a, b) => b.posted_at.localeCompare(a.posted_at));
  }, [transactions]);

  // Filter transfers
  const filteredTransfers = useMemo(() => {
    const searchNormalized = searchTerm.trim().toLowerCase();
    const minValue = Number(minAmount);
    const maxValue = Number(maxAmount);
    const minValid = minAmount.trim() !== "" && Number.isFinite(minValue);
    const maxValid = maxAmount.trim() !== "" && Number.isFinite(maxValue);

    return transferItems.filter((item) => {
      if (fromAccountId && item.from?.id !== fromAccountId) {
        return false;
      }
      if (toAccountId && item.to?.id !== toAccountId) {
        return false;
      }
      if (minValid && item.amount < minValue) {
        return false;
      }
      if (maxValid && item.amount > maxValue) {
        return false;
      }
      if (!searchNormalized) {
        return true;
      }
      const haystack = [
        item.description,
        item.from?.name,
        item.to?.name,
        String(item.amount),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(searchNormalized);
    });
  }, [transferItems, fromAccountId, toAccountId, minAmount, maxAmount, searchTerm]);

  // Has filters
  const hasFilters = Boolean(
    fromAccountId ||
      toAccountId ||
      searchTerm.trim() ||
      (minAmount.trim() && Number.isFinite(Number(minAmount))) ||
      (maxAmount.trim() && Number.isFinite(Number(maxAmount))),
  );

  const clearFilters = () => {
    setFromAccountId("");
    setToAccountId("");
    setMinAmount("");
    setMaxAmount("");
    setSearchTerm("");
  };

  // Total transferred
  const totalTransferred = useMemo(() => {
    return filteredTransfers.reduce((sum, item) => sum + item.amount, 0);
  }, [filteredTransfers]);

  return (
    <>
      <Header />
      <main className="flex flex-col gap-4 sm:gap-6">
        <section className="rounded-3xl border border-[var(--border)] bg-white/80 p-4 shadow-sm sm:p-6">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">
                Transferências
              </h3>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Período selecionado: {monthLabel}
              </p>
            </div>
            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-xs font-semibold text-[var(--ink)] transition hover:border-[var(--accent)]"
              >
                Limpar filtros
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <select
              value={fromAccountId}
              onChange={(e) => setFromAccountId(e.target.value)}
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
              value={toAccountId}
              onChange={(e) => setToAccountId(e.target.value)}
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
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value)}
              placeholder="Valor mínimo"
              inputMode="decimal"
              className="min-w-[140px] rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--ink)] shadow-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]"
            />
            <input
              value={maxAmount}
              onChange={(e) => setMaxAmount(e.target.value)}
              placeholder="Valor máximo"
              inputMode="decimal"
              className="min-w-[140px] rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--ink)] shadow-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]"
            />
            <div className="min-w-[220px] flex-1">
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por conta ou descrição..."
                className="h-10 w-full rounded-xl border border-[var(--border)] bg-white px-4 text-xs font-semibold text-[var(--ink)] shadow-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]"
              />
            </div>
          </div>

          {/* Loading */}
          {isLoading ? (
            <div className="mt-6 flex items-center justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--accent)] border-t-transparent" />
            </div>
          ) : (
            <>
              {/* Table */}
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                    <tr className="border-b border-[var(--border)]">
                      <th className="py-2 text-left font-semibold">Data</th>
                      <th className="py-2 text-left font-semibold">Origem</th>
                      <th className="py-2 text-left font-semibold">Destino</th>
                      <th className="py-2 text-left font-semibold">Descrição</th>
                      <th className="py-2 text-right font-semibold">Valor</th>
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

              {/* Footer */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                <span>Transferências: {filteredTransfers.length}</span>
                <span>Total: {currencyFormatter.format(totalTransferred)}</span>
              </div>
            </>
          )}
        </section>
      </main>
    </>
  );
}
