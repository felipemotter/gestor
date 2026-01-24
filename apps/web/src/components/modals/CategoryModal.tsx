"use client";

import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { useApp, type Category } from "@/contexts/AppContext";
import { getSupabaseClient } from "@/lib/supabase/client";
import { primaryButton, secondaryButton, DEFAULT_CATEGORY_ICON_BG, DEFAULT_CATEGORY_ICON_COLOR } from "@/constants/styles";
import { categoryIconOptions } from "@/constants/icons";

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

type CategoryModalProps = {
  isOpen: boolean;
  onClose: () => void;
  editingCategory: Category | null;
  defaultType?: "expense" | "income";
  defaultParentId?: string | null;
};

export function CategoryModal({
  isOpen,
  onClose,
  editingCategory,
  defaultType = "expense",
  defaultParentId = null,
}: CategoryModalProps) {
  const {
    session,
    activeFamilyId,
    categories,
    archivedCategories,
    loadCategories,
    loadArchivedCategories,
    triggerRefresh,
  } = useApp();

  // Form state
  const [categoryName, setCategoryName] = useState("");
  const [categoryType, setCategoryType] = useState<"expense" | "income">("expense");
  const [categoryParentId, setCategoryParentId] = useState("");
  const [categoryIconKey, setCategoryIconKey] = useState("tag");
  const [categoryIconBg, setCategoryIconBg] = useState(DEFAULT_CATEGORY_ICON_BG);
  const [categoryIconColor, setCategoryIconColor] = useState(DEFAULT_CATEGORY_ICON_COLOR);

  // Error and loading state
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);

  const isEditingCategory = editingCategory !== null;

  // Build categories lookup
  const categoriesById = [...categories, ...archivedCategories].reduce<Record<string, Category>>(
    (acc, cat) => {
      acc[cat.id] = cat;
      return acc;
    },
    {},
  );

  // Derived state
  const selectedParentCategory = categoryParentId ? categoriesById[categoryParentId] : null;
  const isCategoryTypeLocked = Boolean(selectedParentCategory);
  const editingCategoryHasChildren = Boolean(
    editingCategory && categories.some((cat) => cat.parent_id === editingCategory.id),
  );

  // Parent options - root categories of current type
  const categoryParentOptions = categories
    .filter((cat) => !cat.parent_id)
    .filter((cat) => cat.category_type === categoryType)
    .filter((cat) => !editingCategory || cat.id !== editingCategory.id);

  const getCategoryDisplayLabel = (id: string, name: string) => {
    const cat = categoriesById[id];
    if (!cat?.parent_id) return name;
    const parent = categoriesById[cat.parent_id];
    return parent ? `${parent.name} / ${name}` : name;
  };

  // Reset form when modal opens
  const prevIsOpen = useRef(false);
  useLayoutEffect(() => {
    if (isOpen && !prevIsOpen.current) {
      /* eslint-disable react-hooks/set-state-in-effect -- Intentional: reset form when modal opens */
      setCategoryError(null);

      if (editingCategory) {
        setCategoryName(editingCategory.name);
        setCategoryType(editingCategory.category_type as "expense" | "income");
        setCategoryParentId(editingCategory.parent_id ?? "");
        setCategoryIconKey(editingCategory.icon_key ?? "tag");
        setCategoryIconBg(editingCategory.icon_bg ?? DEFAULT_CATEGORY_ICON_BG);
        setCategoryIconColor(editingCategory.icon_color ?? DEFAULT_CATEGORY_ICON_COLOR);
      } else {
        setCategoryName("");
        // Resolve type from parent if provided
        const parentCat = defaultParentId ? categories.find((c) => c.id === defaultParentId) : null;
        const resolvedType = parentCat?.category_type ?? defaultType;
        setCategoryType(resolvedType as "expense" | "income");
        setCategoryParentId(defaultParentId ?? "");
        setCategoryIconKey("tag");
        setCategoryIconBg(DEFAULT_CATEGORY_ICON_BG);
        setCategoryIconColor(DEFAULT_CATEGORY_ICON_COLOR);
      }
      /* eslint-enable react-hooks/set-state-in-effect */
    }
    prevIsOpen.current = isOpen;
  }, [isOpen, editingCategory, defaultType, defaultParentId, categories]);

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

  const handleCreateCategory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCategoryError(null);

    if (!session?.access_token || !activeFamilyId) {
      setCategoryError("Selecione uma familia ativa.");
      return;
    }

    const trimmedName = categoryName.trim();
    if (!trimmedName) {
      setCategoryError("Informe o nome da categoria.");
      return;
    }

    setIsCreatingCategory(true);

    const { error } = await supabase.from("categories").insert({
      family_id: activeFamilyId,
      name: trimmedName,
      category_type: categoryType,
      parent_id: categoryParentId || null,
      icon_key: categoryIconKey,
      icon_bg: categoryIconBg,
      icon_color: categoryIconColor,
    });

    if (error) {
      setCategoryError(error.message);
      setIsCreatingCategory(false);
      return;
    }

    await loadCategories(activeFamilyId);
    triggerRefresh();
    setIsCreatingCategory(false);
    onClose();
  };

  const handleUpdateCategory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCategoryError(null);

    if (!session?.access_token || !activeFamilyId || !editingCategory) {
      setCategoryError("Selecione uma familia ativa.");
      return;
    }

    const trimmedName = categoryName.trim();
    if (!trimmedName) {
      setCategoryError("Informe o nome da categoria.");
      return;
    }

    setIsCreatingCategory(true);

    const { error } = await supabase
      .from("categories")
      .update({
        name: trimmedName,
        category_type: categoryType,
        parent_id: categoryParentId || null,
        icon_key: categoryIconKey,
        icon_bg: categoryIconBg,
        icon_color: categoryIconColor,
      })
      .eq("id", editingCategory.id);

    if (error) {
      setCategoryError(error.message);
      setIsCreatingCategory(false);
      return;
    }

    await loadCategories(activeFamilyId);
    await loadArchivedCategories(activeFamilyId);
    triggerRefresh();
    setIsCreatingCategory(false);
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
              {isEditingCategory ? "Atualizar informacoes" : "Adicionar categoria"}
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
            onSubmit={isEditingCategory ? handleUpdateCategory : handleCreateCategory}
          >
            {/* Name */}
            <div className="grid gap-2">
              <label className="text-xs font-semibold text-[var(--muted)]">
                Nome da categoria
              </label>
              <input
                value={categoryName}
                onChange={(event) => setCategoryName(event.target.value)}
                placeholder="Ex.: Moradia"
                className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm text-[var(--ink)] shadow-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]"
              />
            </div>

            {/* Type */}
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
                        if (isCategoryTypeLocked) return;
                        setCategoryType(option.value as "expense" | "income");
                        if (
                          categoryParentId &&
                          selectedParentCategory &&
                          selectedParentCategory.category_type !== option.value
                        ) {
                          setCategoryParentId("");
                        }
                      }}
                      disabled={isCategoryTypeLocked}
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                        isActive ? option.active : option.inactive
                      } ${isCategoryTypeLocked ? "cursor-not-allowed opacity-60" : ""}`}
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

            {/* Parent */}
            <div className="grid gap-2">
              <label className="text-xs font-semibold text-[var(--muted)]">
                Categoria principal (opcional)
              </label>
              <select
                value={categoryParentId}
                onChange={(event) => {
                  if (isEditingCategory && editingCategoryHasChildren) return;
                  const nextParentId = event.target.value;
                  setCategoryParentId(nextParentId);
                  if (nextParentId) {
                    const parentCat = categoriesById[nextParentId];
                    if (parentCat && parentCat.category_type !== categoryType) {
                      setCategoryType(parentCat.category_type as "expense" | "income");
                    }
                  }
                }}
                disabled={isEditingCategory && editingCategoryHasChildren}
                className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm text-[var(--ink)] shadow-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]"
              >
                <option value="">Sem categoria principal</option>
                {categoryParentOptions.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {getCategoryDisplayLabel(cat.id, cat.name)}
                  </option>
                ))}
              </select>
              {isEditingCategory && editingCategoryHasChildren ? (
                <p className="text-xs text-[var(--muted)]">
                  Essa categoria tem subcategorias; nao pode virar subcategoria.
                </p>
              ) : null}
            </div>

            {/* Icon */}
            <div className="grid gap-2">
              <label className="text-xs font-semibold text-[var(--muted)]">
                Icone da categoria
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
                        <span className="text-[10px] font-semibold">Aa</span>
                      )}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-[var(--muted)]">
                Escolha um icone para identificar rapidamente a categoria.
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
                    value={categoryIconBg}
                    onChange={(event) => setCategoryIconBg(event.target.value)}
                    className="h-10 w-12 rounded-lg border border-[var(--border)] bg-white shadow-sm"
                  />
                  <span className="text-xs font-semibold text-[var(--muted)]">
                    {categoryIconBg.toUpperCase()}
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
                    value={categoryIconColor}
                    onChange={(event) => setCategoryIconColor(event.target.value)}
                    className="h-10 w-12 rounded-lg border border-[var(--border)] bg-white shadow-sm"
                  />
                  <span className="text-xs font-semibold text-[var(--muted)]">
                    {categoryIconColor.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

            {/* Error */}
            {categoryError ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {categoryError}
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
                disabled={isCreatingCategory || !activeFamilyId}
                className={`${primaryButton} w-full disabled:cursor-not-allowed disabled:opacity-70`}
              >
                {isCreatingCategory
                  ? "Salvando..."
                  : isEditingCategory
                    ? "Salvar alteracoes"
                    : "Criar categoria"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
