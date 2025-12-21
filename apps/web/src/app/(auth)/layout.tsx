import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--bg)] text-[var(--ink)]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 left-[-6rem] h-72 w-72 rounded-full bg-[var(--accent-soft)] opacity-70 blur-3xl motion-safe:animate-[float-slow_18s_ease-in-out_infinite]" />
        <div className="absolute top-24 right-[-5rem] h-80 w-80 rounded-full bg-amber-200/50 opacity-70 blur-3xl motion-safe:animate-[float-slow_22s_ease-in-out_infinite]" />
        <div className="absolute bottom-[-6rem] left-1/3 h-72 w-72 rounded-full bg-emerald-100/60 opacity-70 blur-3xl motion-safe:animate-[float-slow_20s_ease-in-out_infinite]" />
      </div>
      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-10 px-6 py-12 lg:flex-row lg:items-center">
        <aside className="flex flex-1 flex-col gap-6">
          <span className="w-fit rounded-full border border-[var(--border)] bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">
            DINDIN
          </span>
          <div className="space-y-4">
            <h1 className="font-heading text-4xl leading-tight text-[var(--ink)] sm:text-5xl">
              Controle financeiro da familia sem complicacao.
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-[var(--muted)]">
              Centralize lancamentos, contas e categorias em um unico lugar. Use
              regras, automacoes e relatatorios para manter tudo organizado.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              {
                title: "Lancamentos rapidos",
                body: "Registro manual simples e importacao de extratos.",
              },
              {
                title: "Permissoes por pessoa",
                body: "Cada membro ve apenas o que precisa.",
              },
              {
                title: "Relatorios claros",
                body: "Visao por periodo, conta e categoria.",
              },
              {
                title: "Automacoes",
                body: "Email, regras e chat para agilizar o fluxo.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-[var(--border)] bg-white/80 p-4 shadow-sm"
              >
                <h2 className="text-sm font-semibold text-[var(--ink)]">
                  {item.title}
                </h2>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </aside>
        <section className="w-full max-w-md rounded-3xl border border-[var(--border)] bg-[var(--panel)] p-8 shadow-[var(--shadow)]">
          {children}
        </section>
      </div>
    </div>
  );
}
