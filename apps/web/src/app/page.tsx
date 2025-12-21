"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabase/client";

const supabase = getSupabaseClient();
const primaryButton =
  "inline-flex items-center justify-center rounded-2xl bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition hover:bg-[var(--accent-strong)]";
const secondaryButton =
  "inline-flex items-center justify-center rounded-2xl border border-[var(--border)] bg-white/80 px-5 py-3 text-sm font-semibold text-[var(--ink)] shadow-sm transition hover:border-[var(--accent)]";

export default function HomePage() {
  const [session, setSession] = useState<Session | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);

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

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await supabase.auth.signOut();
    setIsSigningOut(false);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--bg)] text-[var(--ink)]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-20 left-[-4rem] h-64 w-64 rounded-full bg-[var(--accent-soft)] opacity-70 blur-3xl motion-safe:animate-[float-slow_16s_ease-in-out_infinite]" />
        <div className="absolute bottom-[-6rem] right-[-4rem] h-80 w-80 rounded-full bg-amber-100/60 opacity-80 blur-3xl motion-safe:animate-[float-slow_20s_ease-in-out_infinite]" />
        <div className="absolute top-24 right-1/4 h-56 w-56 rounded-full bg-emerald-100/60 opacity-70 blur-3xl motion-safe:animate-[float-slow_18s_ease-in-out_infinite]" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-12 px-6 py-10">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-sm font-bold text-[var(--accent-strong)]">
              DD
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">
                Projeto
              </p>
              <p className="font-heading text-2xl text-[var(--ink)]">Dindin</p>
            </div>
          </div>

          <nav className="flex flex-wrap items-center gap-3">
            {session ? (
              <button
                type="button"
                className={secondaryButton}
                disabled={isSigningOut}
                onClick={handleSignOut}
              >
                {isSigningOut ? "Saindo..." : "Sair"}
              </button>
            ) : (
              <>
                <Link className={secondaryButton} href="/login">
                  Entrar
                </Link>
                <Link className={primaryButton} href="/register">
                  Criar conta
                </Link>
              </>
            )}
          </nav>
        </header>

        {isChecking ? (
          <div className="flex flex-1 items-center justify-center text-sm text-[var(--muted)]">
            Carregando informacoes...
          </div>
        ) : session ? (
          <main className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
            <section className="space-y-6 motion-safe:animate-[fade-up_0.6s_ease-out]">
              <span className="w-fit rounded-full border border-[var(--border)] bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">
                Sessao ativa
              </span>
              <h1 className="font-heading text-4xl text-[var(--ink)] sm:text-5xl">
                Ola, {session.user.email ?? "familia"}.
              </h1>
              <p className="max-w-xl text-base text-[var(--muted)]">
                Seu painel esta pronto para receber novos lancamentos, contas e
                categorias. Os atalhos abaixo vao ser ligados conforme cada
                modulo ficar pronto.
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled
                  className={`${primaryButton} disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  Novo lancamento
                </button>
                <button
                  type="button"
                  disabled
                  className={`${secondaryButton} disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  Importar OFX
                </button>
              </div>
              <p className="text-xs text-[var(--muted)]">
                Atalhos desbloqueiam depois das telas iniciais.
              </p>
            </section>

            <section className="space-y-4 motion-safe:animate-[fade-up_0.7s_ease-out]">
              <div className="rounded-3xl border border-[var(--border)] bg-[var(--panel)] p-6 shadow-[var(--shadow)]">
                <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">
                  Checklist inicial
                </h2>
                <ul className="mt-4 space-y-2 text-sm text-[var(--muted)]">
                  <li>Definir a familia e seus membros.</li>
                  <li>Criar contas e categorias principais.</li>
                  <li>Configurar permissoes por pessoa.</li>
                  <li>Testar um lancamento manual.</li>
                </ul>
              </div>

              <div className="rounded-3xl border border-[var(--border)] bg-white/80 p-6 shadow-sm">
                <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">
                  Resumo rapido
                </h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {[
                    { label: "Contas", value: "0 ativas" },
                    { label: "Lancamentos", value: "0 este mes" },
                    { label: "Categorias", value: "0 criadas" },
                    { label: "Membros", value: "1 admin" },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded-2xl border border-[var(--border)] bg-white px-4 py-3"
                    >
                      <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                        {item.label}
                      </p>
                      <p className="mt-2 text-lg font-semibold text-[var(--ink)]">
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </main>
        ) : (
          <main className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
            <section className="space-y-6 motion-safe:animate-[fade-up_0.6s_ease-out]">
              <span className="w-fit rounded-full border border-[var(--border)] bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">
                Controle familiar
              </span>
              <h1 className="font-heading text-4xl text-[var(--ink)] sm:text-5xl">
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
