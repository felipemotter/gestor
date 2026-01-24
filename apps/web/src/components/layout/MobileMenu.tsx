"use client";

import type { ActiveView } from "@/types";
import { navItems } from "@/constants/navigation";

type MobileMenuProps = {
  isOpen: boolean;
  onClose: () => void;
  activeView: ActiveView;
  onViewChange: (view: ActiveView) => void;
  onLogoClick: () => void;
  familyName: string | null;
  userInitial: string;
  userEmail: string;
  isSigningOut: boolean;
  onSignOut: () => void;
};

export function MobileMenu({
  isOpen,
  onClose,
  activeView,
  onViewChange,
  onLogoClick,
  familyName,
  userInitial,
  userEmail,
  isSigningOut,
  onSignOut,
}: MobileMenuProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button
        type="button"
        aria-label="Fechar menu"
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
      />
      <div className="relative z-10 h-full w-[260px] max-w-[85vw] overflow-y-auto rounded-r-3xl border-r border-[var(--border)] bg-white/95 p-5 shadow-[var(--shadow)]">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              onLogoClick();
              onClose();
            }}
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
            onClick={onClose}
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
                    onViewChange(item.view);
                    onClose();
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
              {familyName ?? "Selecione"}
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
                title={userEmail}
              >
                {userEmail}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onSignOut}
            disabled={isSigningOut}
            className="mt-3 inline-flex h-8 w-full items-center justify-center rounded-full border border-[var(--border)] bg-white text-xs font-semibold text-[var(--ink)] transition hover:border-[var(--accent)]"
          >
            {isSigningOut ? "Saindo..." : "Sair"}
          </button>
        </div>
      </div>
    </div>
  );
}
