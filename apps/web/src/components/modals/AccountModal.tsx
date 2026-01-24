"use client";

import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { useApp, type Account } from "@/contexts/AppContext";
import { getSupabaseClient } from "@/lib/supabase/client";
import { primaryButton, secondaryButton, DEFAULT_ACCOUNT_ICON_BG, DEFAULT_ACCOUNT_ICON_COLOR } from "@/constants/styles";
import { baseAccountIconOptions } from "@/constants/icons";
import { bankLogoOptions } from "@/lib/bank-logos";

const supabase = getSupabaseClient();

type AccountModalProps = {
  isOpen: boolean;
  onClose: () => void;
  editingAccount: Account | null;
};

export function AccountModal({
  isOpen,
  onClose,
  editingAccount,
}: AccountModalProps) {
  const { session, activeFamilyId, loadAccounts, triggerRefresh } = useApp();

  // Form state
  const [accountName, setAccountName] = useState("");
  const [accountType, setAccountType] = useState("checking");
  const [accountVisibility, setAccountVisibility] = useState("shared");
  const [accountOpeningBalance, setAccountOpeningBalance] = useState("");
  const [accountIconKey, setAccountIconKey] = useState("initials");
  const [accountIconBg, setAccountIconBg] = useState(DEFAULT_ACCOUNT_ICON_BG);
  const [accountIconColor, setAccountIconColor] = useState(DEFAULT_ACCOUNT_ICON_COLOR);
  const [bankLogoSearch, setBankLogoSearch] = useState("");

  // Error and loading state
  const [accountError, setAccountError] = useState<string | null>(null);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);

  const isEditingAccount = editingAccount !== null;

  // Reset form when modal opens - using ref to detect open transition
  const prevIsOpen = useRef(false);

  useLayoutEffect(() => {
    // Only reset when transitioning from closed to open
    if (isOpen && !prevIsOpen.current) {
      /* eslint-disable react-hooks/set-state-in-effect -- Intentional: reset form when modal opens */
      setAccountError(null);
      setBankLogoSearch("");

      if (editingAccount) {
        setAccountName(editingAccount.name);
        setAccountType(editingAccount.account_type);
        setAccountVisibility(editingAccount.visibility);
        setAccountOpeningBalance(
          editingAccount.opening_balance !== null &&
          Number.isFinite(editingAccount.opening_balance)
            ? String(editingAccount.opening_balance).replace(".", ",")
            : "",
        );
        setAccountIconKey(editingAccount.icon_key ?? "initials");
        setAccountIconBg(editingAccount.icon_bg ?? DEFAULT_ACCOUNT_ICON_BG);
        setAccountIconColor(editingAccount.icon_color ?? DEFAULT_ACCOUNT_ICON_COLOR);
      } else {
        setAccountName("");
        setAccountType("checking");
        setAccountVisibility("shared");
        setAccountOpeningBalance("");
        setAccountIconKey("initials");
        setAccountIconBg(DEFAULT_ACCOUNT_ICON_BG);
        setAccountIconColor(DEFAULT_ACCOUNT_ICON_COLOR);
      }
      /* eslint-enable react-hooks/set-state-in-effect */
    }
    prevIsOpen.current = isOpen;
  }, [isOpen, editingAccount]);

  // Lock body scroll
  useEffect(() => {
    if (typeof document === "undefined" || !isOpen) return;

    const { body } = document;
    const previousOverflow = body.style.overflow;
    body.style.overflow = "hidden";
    return () => {
      body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  // Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Filter bank logos
  const filteredBankLogoOptions = bankLogoSearch.trim()
    ? bankLogoOptions.filter((option) =>
        option.label.toLowerCase().includes(bankLogoSearch.toLowerCase()),
      )
    : bankLogoOptions;

  const handleCreateAccount = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAccountError(null);

    if (!session?.access_token || !activeFamilyId) {
      setAccountError("Selecione uma família ativa.");
      return;
    }

    const trimmedName = accountName.trim();
    if (!trimmedName) {
      setAccountError("Informe o nome da conta.");
      return;
    }

    const normalizedBalance = accountOpeningBalance.replace(",", ".").trim();
    const balanceValue = normalizedBalance ? Number(normalizedBalance) : 0;

    if (normalizedBalance && !Number.isFinite(balanceValue)) {
      setAccountError("Saldo inicial inválido.");
      return;
    }

    setIsCreatingAccount(true);

    const { error } = await supabase.from("accounts").insert({
      family_id: activeFamilyId,
      name: trimmedName,
      account_type: accountType,
      visibility: accountVisibility,
      opening_balance: balanceValue,
      icon_key: accountIconKey,
      icon_bg: accountIconBg,
      icon_color: accountIconColor,
    });

    if (error) {
      setAccountError(error.message);
      setIsCreatingAccount(false);
      return;
    }

    await loadAccounts(activeFamilyId);
    triggerRefresh();
    setIsCreatingAccount(false);
    onClose();
  };

  const handleUpdateAccount = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAccountError(null);

    if (!session?.access_token || !activeFamilyId || !editingAccount) {
      setAccountError("Selecione uma família ativa.");
      return;
    }

    const trimmedName = accountName.trim();
    if (!trimmedName) {
      setAccountError("Informe o nome da conta.");
      return;
    }

    const normalizedBalance = accountOpeningBalance.replace(",", ".").trim();
    const balanceValue = normalizedBalance ? Number(normalizedBalance) : 0;

    if (normalizedBalance && !Number.isFinite(balanceValue)) {
      setAccountError("Saldo inicial inválido.");
      return;
    }

    setIsCreatingAccount(true);

    const { error } = await supabase
      .from("accounts")
      .update({
        name: trimmedName,
        account_type: accountType,
        visibility: accountVisibility,
        opening_balance: balanceValue,
        icon_key: accountIconKey,
        icon_bg: accountIconBg,
        icon_color: accountIconColor,
      })
      .eq("id", editingAccount.id);

    if (error) {
      setAccountError(error.message);
      setIsCreatingAccount(false);
      return;
    }

    await loadAccounts(activeFamilyId);
    triggerRefresh();
    setIsCreatingAccount(false);
    onClose();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-3 py-4 sm:items-center sm:px-4 sm:py-6">
      <button
        type="button"
        aria-label="Fechar modal"
        onClick={onClose}
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
              {isEditingAccount ? "Atualizar informações" : "Adicionar conta"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
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
        <div className="max-h-[calc(100vh-12rem)] overflow-y-auto px-5 py-5">
          <form
            className="grid gap-4"
            onSubmit={isEditingAccount ? handleUpdateAccount : handleCreateAccount}
          >
            {/* Account Name */}
            <div className="grid gap-2">
              <label className="text-xs font-semibold text-[var(--muted)]">
                Nome da conta
              </label>
              <input
                value={accountName}
                onChange={(event) => setAccountName(event.target.value)}
                placeholder="Ex.: Conta principal"
                className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm text-[var(--ink)] shadow-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]"
              />
            </div>

            {/* Icon Selection */}
            <div className="grid gap-2">
              <label className="text-xs font-semibold text-[var(--muted)]">
                Icone da conta
              </label>
              <div className="grid gap-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">
                    Icones
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
                            <span className="text-[10px] font-semibold">Aa</span>
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
                        onChange={(event) => setBankLogoSearch(event.target.value)}
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
                            style={{ backgroundColor: accountIconBg }}
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
                Escolha um icone para facilitar a identificacao da conta.
              </p>
            </div>

            {/* Colors */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <label className="text-xs font-semibold text-[var(--muted)]">
                  Cor do fundo
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={accountIconBg}
                    onChange={(event) => setAccountIconBg(event.target.value)}
                    className="h-10 w-12 rounded-lg border border-[var(--border)] bg-white shadow-sm"
                  />
                  <span className="text-xs font-semibold text-[var(--muted)]">
                    {accountIconBg.toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="grid gap-2">
                <label className="text-xs font-semibold text-[var(--muted)]">
                  Cor do icone
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={accountIconColor}
                    onChange={(event) => setAccountIconColor(event.target.value)}
                    className="h-10 w-12 rounded-lg border border-[var(--border)] bg-white shadow-sm"
                  />
                  <span className="text-xs font-semibold text-[var(--muted)]">
                    {accountIconColor.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

            {/* Opening Balance */}
            <div className="grid gap-2">
              <label className="text-xs font-semibold text-[var(--muted)]">
                Saldo inicial (opcional)
              </label>
              <input
                value={accountOpeningBalance}
                onChange={(event) => setAccountOpeningBalance(event.target.value)}
                placeholder="R$ 0,00"
                inputMode="decimal"
                className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm text-[var(--ink)] shadow-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]"
              />
            </div>

            {/* Type and Visibility */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <label className="text-xs font-semibold text-[var(--muted)]">
                  Tipo
                </label>
                <select
                  value={accountType}
                  onChange={(event) => setAccountType(event.target.value)}
                  className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm text-[var(--ink)] shadow-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]"
                >
                  <option value="checking">Conta corrente</option>
                  <option value="savings">Poupanca</option>
                  <option value="credit_card">Cartao</option>
                  <option value="cash">Dinheiro</option>
                </select>
              </div>
              <div className="grid gap-2">
                <label className="text-xs font-semibold text-[var(--muted)]">
                  Visibilidade
                </label>
                <select
                  value={accountVisibility}
                  onChange={(event) => setAccountVisibility(event.target.value)}
                  className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm text-[var(--ink)] shadow-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]"
                >
                  <option value="shared">Compartilhada</option>
                  <option value="private">Privada</option>
                </select>
              </div>
            </div>

            {/* Error */}
            {accountError ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {accountError}
              </div>
            ) : null}

            {/* Buttons */}
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={onClose}
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
                    ? "Salvar alteracoes"
                    : "Criar conta"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
