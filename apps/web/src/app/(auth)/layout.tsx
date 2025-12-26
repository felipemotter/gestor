import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden text-[var(--ink)]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.16),_transparent_55%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(15,23,42,0.05)_1px,transparent_1px),linear-gradient(180deg,rgba(15,23,42,0.05)_1px,transparent_1px)] bg-[size:80px_80px] opacity-30" />
      </div>
      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-10 px-6 py-12 lg:flex-row lg:items-center">
        <aside className="flex flex-1 flex-col gap-6">
          <span className="w-fit rounded-full border border-[var(--border)] bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">
            DINDIN
          </span>
          <div className="space-y-4">
            <h1 className="font-heading text-3xl leading-tight text-[var(--ink)] sm:text-4xl tracking-tight">
              Controle financeiro da família sem complicação.
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-[var(--muted)]">
              Centralize lançamentos, contas e categorias em um único lugar. Use
              regras, automações e relatatorios para manter tudo organizado.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              {
                title: "Lançamentos rápidos",
                body: "Registro manual simples e importação de extratos.",
              },
              {
                title: "Permissoes por pessoa",
                body: "Cada membro ve apenas o que precisa.",
              },
              {
                title: "Relatórios claros",
                body: "Visão por período, conta e categoria.",
              },
              {
                title: "Automações",
                body: "Email, regras e chat para agilizar o fluxo.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-[var(--border)] bg-white p-4 shadow-sm"
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
