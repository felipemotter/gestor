"use client";

import type { ActiveView } from "@/types";
import { navItems } from "@/constants/navigation";

type SidebarProps = {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  activeView: ActiveView;
  onViewChange: (view: ActiveView) => void;
  onLogoClick: () => void;
  logoSrc: string;
  familyName: string | null;
  userInitial: string;
  userEmail: string;
  isSigningOut: boolean;
  onSignOut: () => void;
  signOutLabel: string;
};

export function Sidebar({
  isCollapsed,
  onToggleCollapse,
  activeView,
  onViewChange,
  onLogoClick,
  logoSrc,
  familyName,
  userInitial,
  userEmail,
  isSigningOut,
  onSignOut,
  signOutLabel,
}: SidebarProps) {
  return (
    <aside
      className={`hidden lg:flex lg:flex-col lg:fixed lg:top-6 lg:left-2 lg:z-20 lg:h-[calc(100vh-3rem)] rounded-3xl border border-[var(--border)] bg-white/90 shadow-sm ${
        isCollapsed ? "p-3 lg:w-[88px]" : "p-5 lg:w-[220px]"
      }`}
    >
      <div
        className={`flex ${
          isCollapsed
            ? "flex-col items-center gap-2"
            : "items-center justify-between"
        }`}
      >
        <button
          type="button"
          onClick={onLogoClick}
          aria-label="Ir para o dashboard"
          className={`flex items-center justify-center rounded-2xl px-1 transition hover:bg-slate-50 ${
            isCollapsed ? "h-12 w-12" : "h-14 w-full"
          }`}
        >
          <img
            src={logoSrc}
            alt="Gestor"
            className={
              isCollapsed
                ? "h-10 w-auto max-w-[40px] object-contain"
                : "h-10 w-full object-contain"
            }
          />
        </button>
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={isCollapsed ? "Expandir menu" : "Recolher menu"}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] bg-white text-[var(--muted)] shadow-sm transition hover:text-[var(--accent-strong)]"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className={`h-4 w-4 transition ${isCollapsed ? "rotate-180" : ""}`}
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
                  onViewChange(item.view);
                }
              }}
              className={`flex items-center rounded-xl text-left font-semibold transition ${
                isCollapsed
                  ? "justify-center px-2 py-2"
                  : "justify-between px-3 py-2 text-sm"
              } ${
                isActive
                  ? "bg-[var(--accent-soft)] text-[var(--accent-strong)]"
                  : isEnabled
                    ? "hover:bg-slate-50"
                    : "opacity-50"
              }`}
            >
              {isCollapsed ? (
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
          isCollapsed ? "p-3" : "p-4"
        }`}
      >
        <div
          className={`flex ${
            isCollapsed ? "flex-col items-center gap-2" : "flex-col gap-3"
          }`}
        >
          {!isCollapsed ? (
            <div className="flex items-center justify-between text-xs text-[var(--muted)]">
              <span>Família</span>
              <span className="ml-2 truncate font-semibold text-[var(--ink)]">
                {familyName ?? "Selecione"}
              </span>
            </div>
          ) : null}
          <div
            className={`flex ${
              isCollapsed ? "flex-col items-center gap-2" : "items-center gap-3"
            }`}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-white text-xs font-semibold text-[var(--ink)]">
              {userInitial}
            </div>
            {!isCollapsed ? (
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
            ) : null}
          </div>
          <button
            type="button"
            aria-label={signOutLabel}
            title={signOutLabel}
            disabled={isSigningOut}
            onClick={onSignOut}
            className={`inline-flex items-center justify-center rounded-full border border-[var(--border)] bg-white text-xs font-semibold text-[var(--ink)] transition hover:border-[var(--accent)] ${
              isCollapsed ? "h-8 w-8" : "h-8 w-full px-3 text-[11px]"
            }`}
          >
            {isCollapsed ? (
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
  );
}
