"use client";

import { useCallback, useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { CategoryModal } from "@/components/modals/CategoryModal";
import { useApp, type Category } from "@/contexts/AppContext";
import { getSupabaseClient } from "@/lib/supabase/client";
import { categoryIconLookup } from "@/constants/icons";
import { DEFAULT_CATEGORY_ICON_BG, DEFAULT_CATEGORY_ICON_COLOR } from "@/constants/styles";

const supabase = getSupabaseClient();

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
];

function isBalanceAdjustCategory(name: string) {
  const normalized = name.toLowerCase().trim();
  return normalized === "ajuste de saldo" || normalized === "balance adjustment";
}

export default function CategoriasPage() {
  const {
    session,
    activeFamilyId,
    categories,
    archivedCategories,
    isLoadingCategories,
    isLoadingArchivedCategories,
    loadCategories,
    loadArchivedCategories,
  } = useApp();

  // UI state
  const [categoryViewType, setCategoryViewType] = useState<"expense" | "income">("expense");
  const [showArchivedCategories, setShowArchivedCategories] = useState(false);
  const [categoryActionError, setCategoryActionError] = useState<string | null>(null);
  const [categoryActionLoadingId, setCategoryActionLoadingId] = useState<string | null>(null);

  // Modal state
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [modalDefaultType, setModalDefaultType] = useState<"expense" | "income">("expense");
  const [modalDefaultParentId, setModalDefaultParentId] = useState<string | null>(null);

  // Load archived when toggle is on
  useEffect(() => {
    if (showArchivedCategories && activeFamilyId) {
      loadArchivedCategories(activeFamilyId);
    }
  }, [showArchivedCategories, activeFamilyId, loadArchivedCategories]);

  // Derived state
  const activeCategoryRoots = categories
    .filter((cat) => cat.category_type === categoryViewType)
    .filter((cat) => !cat.parent_id)
    .filter((cat) => !isBalanceAdjustCategory(cat.name));

  const sortedActiveCategoryRoots = [...activeCategoryRoots].sort((a, b) =>
    a.name.localeCompare(b.name, "pt-BR"),
  );

  const activeCategoryChildren = categories
    .filter((cat) => cat.category_type === categoryViewType)
    .filter((cat) => cat.parent_id)
    .filter((cat) => !isBalanceAdjustCategory(cat.name));

  const activeCategoryChildrenByParent = activeCategoryChildren.reduce<Record<string, Category[]>>(
    (acc, cat) => {
      if (!cat.parent_id) return acc;
      if (!acc[cat.parent_id]) acc[cat.parent_id] = [];
      acc[cat.parent_id].push(cat);
      return acc;
    },
    {},
  );

  const archivedCategoryIds = new Set(archivedCategories.map((item) => item.id));
  const archivedCategoryRoots = archivedCategories
    .filter((cat) => cat.category_type === categoryViewType)
    .filter((cat) => !cat.parent_id || !archivedCategoryIds.has(cat.parent_id))
    .filter((cat) => !isBalanceAdjustCategory(cat.name));

  const sortedArchivedCategoryRoots = [...archivedCategoryRoots].sort((a, b) =>
    a.name.localeCompare(b.name, "pt-BR"),
  );

  const archivedCategoryCount = archivedCategories
    .filter((cat) => cat.category_type === categoryViewType)
    .filter((cat) => !isBalanceAdjustCategory(cat.name)).length;

  const archivedCategoryChildrenByParent = archivedCategories.reduce<Record<string, Category[]>>(
    (acc, cat) => {
      if (!cat.parent_id) return acc;
      if (isBalanceAdjustCategory(cat.name)) return acc;
      if (!acc[cat.parent_id]) acc[cat.parent_id] = [];
      acc[cat.parent_id].push(cat);
      return acc;
    },
    {},
  );

  // Handlers
  const openCategoryModal = (defaults?: { type?: "expense" | "income"; parentId?: string | null }) => {
    setEditingCategory(null);
    setModalDefaultType(defaults?.type ?? categoryViewType);
    setModalDefaultParentId(defaults?.parentId ?? null);
    setIsCategoryModalOpen(true);
  };

  const openCategoryEditor = (category: Category) => {
    setEditingCategory(category);
    setModalDefaultType(category.category_type as "expense" | "income");
    setModalDefaultParentId(category.parent_id);
    setIsCategoryModalOpen(true);
  };

  const closeCategoryModal = () => {
    setIsCategoryModalOpen(false);
    setEditingCategory(null);
  };

  const handleArchiveCategory = useCallback(
    async (category: Category) => {
      setCategoryActionError(null);
      if (!session?.access_token || !activeFamilyId) {
        setCategoryActionError("Selecione uma familia ativa.");
        return;
      }

      const label = category.parent_id
        ? "Arquivar esta subcategoria?"
        : "Arquivar esta categoria?";
      if (!window.confirm(label)) return;

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
    },
    [session, activeFamilyId, categories, loadCategories, loadArchivedCategories],
  );

  const handleUnarchiveCategory = useCallback(
    async (category: Category) => {
      setCategoryActionError(null);
      if (!session?.access_token || !activeFamilyId) {
        setCategoryActionError("Selecione uma familia ativa.");
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
    },
    [session, activeFamilyId, archivedCategories, loadCategories, loadArchivedCategories],
  );

  // Render helpers
  const renderCategoryIcon = (
    category: { name: string; icon_key: string | null; icon_bg: string | null; icon_color: string | null },
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

  const renderCategoryActions = (category: Category, options: { canAddChild?: boolean } = {}) => {
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

  return (
    <>
      <Header />
      <main className="flex flex-col gap-4 sm:gap-6">
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
                        onClick={() => setCategoryViewType(option.value as "expense" | "income")}
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
                  onClick={() => setShowArchivedCategories((prev) => !prev)}
                  aria-label={
                    showArchivedCategories
                      ? "Ocultar categorias arquivadas"
                      : "Ver categorias arquivadas"
                  }
                  title={showArchivedCategories ? "Ocultar arquivadas" : "Ver arquivadas"}
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
                  onClick={() => openCategoryModal({ type: categoryViewType })}
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
            <p className="mt-4 text-sm text-[var(--muted)]">Carregando categorias...</p>
          ) : null}

          {!isLoadingCategories && sortedActiveCategoryRoots.length === 0 ? (
            <p className="mt-4 text-sm text-[var(--muted)]">Nenhuma categoria criada ainda.</p>
          ) : null}

          {/* Active Categories */}
          <div className="mt-5 overflow-hidden rounded-3xl border border-[var(--border)] bg-white shadow-sm">
            {sortedActiveCategoryRoots.map((category) => {
              const children = [...(activeCategoryChildrenByParent[category.id] ?? [])].sort(
                (a, b) => a.name.localeCompare(b.name, "pt-BR"),
              );
              return (
                <div key={category.id} className="border-b border-[var(--border)] last:border-b-0">
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
                      {renderCategoryActions(category, { canAddChild: true })}
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
                              {renderCategoryIcon(child, "h-8 w-8", "h-4 w-4")}
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

          {/* Archived Categories */}
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
              {sortedArchivedCategoryRoots.length === 0 && !isLoadingArchivedCategories ? (
                <p className="mt-3 text-sm text-[var(--muted)]">Nenhuma categoria arquivada.</p>
              ) : null}
              <div className="mt-4 overflow-hidden rounded-3xl border border-[var(--border)] bg-white/70 shadow-sm">
                {sortedArchivedCategoryRoots.map((category) => {
                  const children = [...(archivedCategoryChildrenByParent[category.id] ?? [])].sort(
                    (a, b) => a.name.localeCompare(b.name, "pt-BR"),
                  );
                  const isRestoring = categoryActionLoadingId === category.id;
                  return (
                    <div key={category.id} className="border-b border-[var(--border)] last:border-b-0">
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
                                : `Arquivada - ${children.length} subcategoria(s)`}
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
                                {renderCategoryIcon(child, "h-8 w-8", "h-4 w-4")}
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
      </main>

      <CategoryModal
        isOpen={isCategoryModalOpen}
        onClose={closeCategoryModal}
        editingCategory={editingCategory}
        defaultType={modalDefaultType}
        defaultParentId={modalDefaultParentId}
      />
    </>
  );
}
