"use client";

import { useCallback, useState } from "react";
import { Header } from "@/components/layout/Header";
import { useApp } from "@/contexts/AppContext";
import type { ParsedOFX, ParsedTransaction } from "@/lib/ofx-parser";
import { primaryButton, secondaryButton } from "@/constants/styles";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function formatDate(dateStr: string) {
  const date = new Date(dateStr + "T12:00:00");
  return dateFormatter.format(date);
}

type ImportStep = "upload" | "preview" | "importing" | "done";

export default function ImportacoesPage() {
  const { session, activeFamilyId, accounts, triggerRefresh } = useApp();

  // Step state
  const [step, setStep] = useState<ImportStep>("upload");

  // Upload state
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Parsed data
  const [parsedData, setParsedData] = useState<ParsedOFX | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState("");

  // Import result
  const [importResult, setImportResult] = useState<{
    imported: number;
    duplicates: number;
  } | null>(null);

  // Generate hash for the entire file (for idempotency)
  const generateFileHash = (transactions: ParsedTransaction[]) => {
    const data = transactions.map((t) => t.hash).join("|");
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(8, "0");
  };

  // Handle file upload
  const handleFile = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".ofx")) {
      setError("Formato inválido. Envie um arquivo .ofx");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/imports/parse", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Erro ao processar arquivo");
        setIsLoading(false);
        return;
      }

      setParsedData(result.data);
      setStep("preview");
    } catch (err) {
      setError("Erro ao enviar arquivo");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  // Confirm import
  const handleConfirmImport = async () => {
    if (!parsedData || !selectedAccountId || !activeFamilyId || !session?.access_token) {
      setError("Selecione uma conta para importar");
      return;
    }

    setStep("importing");
    setError(null);

    try {
      const response = await fetch("/api/imports/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          accountId: selectedAccountId,
          familyId: activeFamilyId,
          transactions: parsedData.transactions,
          source: `ofx:${parsedData.bankName || "unknown"}`,
          rawHash: generateFileHash(parsedData.transactions),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Erro ao importar transações");
        setStep("preview");
        return;
      }

      setImportResult({
        imported: result.imported,
        duplicates: result.duplicates,
      });
      setStep("done");
      triggerRefresh();
    } catch (err) {
      setError("Erro ao confirmar importação");
      setStep("preview");
    }
  };

  // Reset to upload new file
  const handleReset = () => {
    setStep("upload");
    setParsedData(null);
    setSelectedAccountId("");
    setError(null);
    setImportResult(null);
  };

  // Calculate totals
  const totals = parsedData?.transactions.reduce(
    (acc, tx) => {
      if (tx.amount < 0) {
        acc.debits += Math.abs(tx.amount);
        acc.debitCount++;
      } else {
        acc.credits += tx.amount;
        acc.creditCount++;
      }
      return acc;
    },
    { debits: 0, credits: 0, debitCount: 0, creditCount: 0 }
  ) ?? { debits: 0, credits: 0, debitCount: 0, creditCount: 0 };

  return (
    <>
      <Header />
      <main className="flex flex-col gap-4 sm:gap-6">
        <section className="rounded-3xl border border-[var(--border)] bg-white/80 p-4 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-semibold uppercase tracking-[0.2em] text-[var(--ink)] sm:text-lg sm:tracking-[0.24em]">
                Importar Extrato
              </h3>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Importe transações de um arquivo OFX
              </p>
            </div>
            {step !== "upload" && step !== "importing" && (
              <button
                type="button"
                onClick={handleReset}
                className={secondaryButton}
              >
                Nova importação
              </button>
            )}
          </div>

          <div className="mt-6">
            {/* Upload Step */}
            {step === "upload" && (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative rounded-2xl border-2 border-dashed p-8 text-center transition ${
                  isDragging
                    ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                    : "border-[var(--border)] bg-white hover:border-[var(--accent)]"
                }`}
              >
                {isLoading ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--accent)] border-t-transparent" />
                    <p className="text-sm text-[var(--muted)]">
                      Processando arquivo...
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent-soft)]">
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 24 24"
                        className="h-8 w-8 text-[var(--accent)]"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                    </div>
                    <p className="text-sm font-semibold text-[var(--ink)]">
                      Arraste um arquivo OFX aqui
                    </p>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      ou clique para selecionar
                    </p>
                    <input
                      type="file"
                      accept=".ofx"
                      onChange={handleFileInput}
                      className="absolute inset-0 cursor-pointer opacity-0"
                    />
                  </>
                )}
              </div>
            )}

            {/* Preview Step */}
            {step === "preview" && parsedData && (
              <div className="space-y-6">
                {/* File info */}
                <div className="rounded-2xl border border-[var(--border)] bg-white p-4">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                        Banco
                      </p>
                      <p className="mt-1 text-sm font-semibold text-[var(--ink)]">
                        {parsedData.bankName || "Não identificado"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                        Período
                      </p>
                      <p className="mt-1 text-sm font-semibold text-[var(--ink)]">
                        {parsedData.startDate && parsedData.endDate
                          ? `${formatDate(parsedData.startDate)} - ${formatDate(parsedData.endDate)}`
                          : "Não identificado"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                        Transações
                      </p>
                      <p className="mt-1 text-sm font-semibold text-[var(--ink)]">
                        {parsedData.transactions.length}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                        Saldo Final
                      </p>
                      <p className={`mt-1 text-sm font-semibold ${
                        parsedData.ledgerBalance !== null && parsedData.ledgerBalance < 0
                          ? "text-rose-600"
                          : "text-emerald-600"
                      }`}>
                        {parsedData.ledgerBalance !== null
                          ? currencyFormatter.format(parsedData.ledgerBalance)
                          : "N/A"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Summary */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-600">
                      Débitos ({totals.debitCount})
                    </p>
                    <p className="mt-1 text-lg font-semibold text-rose-700">
                      - {currencyFormatter.format(totals.debits)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">
                      Créditos ({totals.creditCount})
                    </p>
                    <p className="mt-1 text-lg font-semibold text-emerald-700">
                      + {currencyFormatter.format(totals.credits)}
                    </p>
                  </div>
                </div>

                {/* Account selector */}
                <div className="rounded-2xl border border-[var(--border)] bg-white p-4">
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                    Importar para qual conta?
                  </label>
                  <select
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm text-[var(--ink)] shadow-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]"
                  >
                    <option value="">Selecione uma conta...</option>
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Transaction list */}
                <div className="rounded-2xl border border-[var(--border)] bg-white">
                  <div className="border-b border-[var(--border)] px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                      Transações a importar
                    </p>
                  </div>
                  <div className="max-h-[400px] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-white text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                        <tr className="border-b border-[var(--border)]">
                          <th className="px-4 py-2 text-left font-semibold">
                            Data
                          </th>
                          <th className="px-4 py-2 text-left font-semibold">
                            Descrição
                          </th>
                          <th className="px-4 py-2 text-right font-semibold">
                            Valor
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedData.transactions.map((tx, index) => (
                          <tr
                            key={tx.fitId + index}
                            className="border-b border-[var(--border)] last:border-b-0"
                          >
                            <td className="px-4 py-3 text-[var(--muted)]">
                              {formatDate(tx.postedAt)}
                            </td>
                            <td className="px-4 py-3 text-[var(--ink)]">
                              {tx.memo || "Sem descrição"}
                            </td>
                            <td
                              className={`px-4 py-3 text-right font-semibold ${
                                tx.amount < 0 ? "text-rose-600" : "text-emerald-600"
                              }`}
                            >
                              {tx.amount < 0 ? "- " : "+ "}
                              {currencyFormatter.format(Math.abs(tx.amount))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={handleReset}
                    className={secondaryButton}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmImport}
                    disabled={!selectedAccountId}
                    className={`${primaryButton} disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    Importar {parsedData.transactions.length} transações
                  </button>
                </div>
              </div>
            )}

            {/* Importing Step */}
            {step === "importing" && (
              <div className="flex flex-col items-center gap-4 py-12">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-[var(--accent)] border-t-transparent" />
                <p className="text-sm font-semibold text-[var(--ink)]">
                  Importando transações...
                </p>
                <p className="text-xs text-[var(--muted)]">
                  Isso pode levar alguns segundos
                </p>
              </div>
            )}

            {/* Done Step */}
            {step === "done" && importResult && (
              <div className="flex flex-col items-center gap-4 py-12">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="h-8 w-8 text-emerald-600"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                </div>
                <p className="text-lg font-semibold text-[var(--ink)]">
                  Importação concluída!
                </p>
                <div className="text-center text-sm text-[var(--muted)]">
                  <p>
                    <span className="font-semibold text-emerald-600">
                      {importResult.imported}
                    </span>{" "}
                    transações importadas
                  </p>
                  {importResult.duplicates > 0 && (
                    <p className="mt-1">
                      <span className="font-semibold text-amber-600">
                        {importResult.duplicates}
                      </span>{" "}
                      duplicatas ignoradas
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleReset}
                  className={primaryButton}
                >
                  Importar outro arquivo
                </button>
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
