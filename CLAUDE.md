# CLAUDE.md — Gestor

App de controle financeiro familiar com multi-usuarios, permissoes, ingestao de extratos e automacoes.

> **Auto-atualização**: Sempre que uma alteração mudar a estrutura do projeto, adicionar/remover dependências, criar/renomear tabelas, alterar regras de negócio, adicionar rotas, ou modificar convenções — atualize este arquivo para refletir a mudança. Manter o CLAUDE.md sincronizado com o estado real do projeto é obrigatório.

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Next.js 16 (App Router) + React 19 + Tailwind CSS 4 + TypeScript 5 + ofx-js |
| Auth / API | Supabase self-hosted: GoTrue v2.184, PostgREST v14.1, Realtime v2.68, Storage v1.33 |
| Gateway | Kong 2.8.1 (proxy), Traefik (produção com TLS) |
| Banco | PostgreSQL 15.8 com RLS, triggers e funções PL/pgSQL |
| OFX | FastAPI 0.115 + Uvicorn (microserviço Python em `services/ofx/`) |
| Automação | n8n 2.1.1 (ingestão de emails) |
| Infra | Docker Compose (dev + prod) |

## Estrutura do projeto

```
/opt/gestor/
├── apps/web/                    # Frontend Next.js
│   └── src/
│       ├── app/
│       │   ├── manifest.ts      # PWA manifest (MetadataRoute.Manifest)
│       │   ├── (auth)/          # Login, registro
│       │   │   └── layout.tsx
│       │   └── (app)/           # Rotas protegidas
│       │       ├── page.tsx           # Dashboard (gráficos, resumo)
│       │       ├── lancamentos/       # CRUD de lançamentos
│       │       ├── contas/            # CRUD de contas
│       │       ├── categorias/        # CRUD de categorias (hierárquicas)
│       │       ├── extrato/           # Extrato com saldo corrido
│       │       ├── transferencias/    # Transferências entre contas
│       │       └── importacoes/       # Importação de extratos OFX (upload, preview, confirm)
│       ├── app/api/
│       │   └── imports/
│       │       ├── parse/route.ts     # POST: recebe arquivo OFX, retorna transações parseadas
│       │       └── confirm/route.ts   # POST: grava transações no banco via service_role
│       ├── components/
│       │   ├── charts/          # DonutChart, CashflowChart
│       │   ├── modals/          # TransactionModal, AccountModal, CategoryModal
│       │   └── layout/          # Header, Sidebar, MobileMenu
│       ├── contexts/AppContext.tsx   # Estado global (session, family, accounts, categories)
│       ├── constants/           # Ícones, navegação, estilos reutilizáveis
│       ├── lib/
│       │   ├── supabase/client.ts   # Singleton do Supabase client
│       │   ├── date-utils.ts        # Helpers de data (timezone America/Sao_Paulo)
│       │   ├── formatters.ts        # Formatação de moeda e datas
│       │   ├── bank-logos.ts        # Logos de bancos brasileiros
│       │   └── ofx-parser.ts        # Parser OFX client-side (usa ofx-js)
│       └── types/
│           ├── index.ts             # Tipos compartilhados
│           └── ofx-js.d.ts          # Type declarations para ofx-js
│   └── public/
│       ├── sw.js                    # Service Worker (cache mínimo, network-first)
│       └── icons/                   # Ícones PWA (192, 512, apple-touch-icon)
├── services/ofx/               # Microserviço FastAPI para parsing OFX
│   └── app/main.py
├── db/
│   ├── init/001_init.sql       # Schema completo (757 linhas)
│   ├── seed/demo_data.sql      # Dados demo (usuários, contas, categorias, transações)
│   └── patches/                # Migrações incrementais
├── supabase/                   # Configs do Supabase (kong.yml, SQL de roles/jwt/realtime)
├── scripts/
│   ├── gen_env.py              # Gera .env com JWTs e chaves
│   └── demo.sh                 # Reset/seed de dados demo
├── docker-compose.yml          # Dev
├── docker-compose.prod.yml     # Produção
└── docker-compose.traefik.yml  # TLS/HTTPS
```

## Banco de dados

### Tabelas principais

- `families` — grupo familiar (unidade de multi-tenancy)
- `memberships` — relação user↔family com role (`owner`, `admin`, `member`, `viewer`)
- `accounts` — contas bancárias (tipo, moeda, visibilidade `shared`/`private`, ícone)
- `categories` — categorias hierárquicas (máx 2 níveis), tipo `income`/`expense`/`transfer`
- `transactions` — lançamentos com `posted_at`, `occurred_time`, `amount`, `source`, `source_hash`
- `import_batches` — rastreamento de importações OFX (status: `pending`/`processed`/`failed`)
- `tags`, `transaction_tags` — tags customizadas
- `attachments` — anexos com storage path
- `rules` — regras de automação (match/action em JSONB)
- `audit_logs` — log de alterações

### Funções SQL importantes

- `account_balance(uuid)` — saldo atual (opening_balance + soma de transações)
- `account_balance_at(uuid, date)` — saldo em data específica
- `is_family_member(uuid)`, `is_family_writer(uuid)`, `is_family_admin(uuid)` — checagens de permissão usadas nas RLS policies
- `enforce_category_max_depth()` — trigger que impede subcategoria de subcategoria
- `enforce_balance_adjust_category_usage()` — trigger que protege a categoria "Ajuste de saldo"
- `enforce_account_archive_balance()` — trigger que exige saldo zero para arquivar conta
- `prevent_account_delete_with_transactions()` — trigger que impede deletar conta com lançamentos

### RLS

Todas as tabelas têm RLS ativada. Permissões baseadas em role via `is_family_*()`. Contas privadas só visíveis ao `owner_user_id`. Transações herdam visibilidade da conta.

## Convenções de código

### TypeScript / React

- Path alias: `@/*` → `./src/*`
- Componentes: function components, hooks, `"use client"` onde necessário
- Estado global via `AppContext` (React Context) — contém session, membership, family_id, accounts, categories, período selecionado
- Supabase client: singleton via `getSupabaseClient()` — nunca instanciar `createClient` diretamente
- Datas: sempre usar helpers de `date-utils.ts` que consideram timezone `America/Sao_Paulo`
- Formatação: usar `formatters.ts` para moeda (BRL) e datas
- Estilos: CSS variables para cores (`--accent`, `--ink`, `--border`), classes reutilizáveis em `constants/styles.ts`
- Fontes: Manrope (body), Sora (headings)

### SQL

- Funções com `security definer` e `set search_path = public`
- Triggers em português para mensagens de erro voltadas ao usuário
- Nomes de tabelas e colunas em inglês, mensagens de erro em português
- UUIDs como primary keys (`gen_random_uuid()`)
- `numeric(14,2)` para valores monetários

### Commits

Ver `.claude/skills/commit/SKILL.md` para o padrão completo. Usar sempre a skill `/commit`.

## Comandos de desenvolvimento

```bash
# Subir todos os serviços
docker compose up -d

# Apenas o frontend (com hot reload via volume mount)
docker compose up web

# Lint
cd apps/web && npm run lint

# Build
cd apps/web && npm run build

# Gerar .env com chaves
python3 scripts/gen_env.py

# Demo data
# No primeiro "docker compose up" (volume vazio), o seed roda automaticamente
# (controlado por SEED_DEMO=true no service db do docker-compose.yml).
# Para resetar/re-seed manual em qualquer momento:
./scripts/demo.sh reset            # Limpa dados (mantém schema)
./scripts/demo.sh seed             # Insere dados demo
./scripts/demo.sh reset-and-seed   # Limpa + insere

# Usuários demo (senha: demo123):
#   demo@demo.com   — usuário standalone
#   joao@demo.com   — owner da "Família Silva"
#   maria@demo.com  — member da "Família Silva"
```

### URLs locais

- Web: http://localhost:3000
- Supabase API (Kong): http://localhost:8000
- Studio: http://localhost:3002
- n8n: http://localhost:5678
- PostgreSQL: localhost:5433

## API Routes (Next.js)

- `POST /api/imports/parse` — recebe arquivo OFX via FormData, retorna transações parseadas (sem autenticação, roda server-side)
- `POST /api/imports/confirm` — recebe transações + accountId + familyId, cria `import_batch` e insere transações. Usa `SUPABASE_SERVICE_ROLE_KEY` server-side com Bearer token do usuário para autenticação. Deduplicação por `external_id` (FITID) e hash do batch.

## Navegação

Itens implementados: Dashboard, Lançamentos, Contas, Categorias, Transferências, Extrato, Importações.
Itens no menu (ainda não implementados): Orçamento, Relatórios, Metas, Regras e Automação.

## PWA (Progressive Web App)

O app é instalável como PWA em Android/iOS. Implementação sem libs externas:

- `app/manifest.ts` — Web App Manifest nativo do Next.js (`MetadataRoute.Manifest`)
- `public/sw.js` — Service Worker mínimo (network-first, cache do app shell como fallback)
- `layout.tsx` — Meta tags (`appleWebApp`, `viewport`, `themeColor`) e registro do SW via `<Script>`
- `public/icons/` — Ícones 192x192, 512x512 e apple-touch-icon (180x180), gerados a partir de `logo_gestor_quadrado.png`

Não usar `next-pwa` ou cache offline agressivo — dados dependem do Supabase em tempo real.

## Regras de negócio importantes

1. Um usuário pertence a **uma única família** (unique index em `memberships.user_id`)
2. Categorias têm no máximo **2 níveis** (pai → filho, sem neto)
3. Conta só pode ser **arquivada com saldo zero**
4. Conta com lançamentos **não pode ser deletada** (deve arquivar)
5. Categoria "Ajuste de saldo" só pode ser usada com `source = 'adjustment'`
6. Importações OFX usam `source_hash` para **deduplicação idempotente**
7. Saldo é calculado: `opening_balance + Σ(income) - Σ(expense) + Σ(transfer) + Σ(adjustment)`
8. Contas privadas (`visibility = 'private'`) só são visíveis ao dono
9. Importação OFX: parsing via `ofx-js` no frontend, confirmação via API Route com `service_role`. Deduplicação dupla: por `raw_hash` no `import_batches` (idempotência de arquivo) e por `external_id`/FITID nas `transactions` (idempotência de transação)
10. API Route `/api/imports/confirm` requer `SUPABASE_SERVICE_ROLE_KEY` como env var no servidor

## Roadmap

- [x] Fase 0: Schema, RLS, Docker Compose
- [x] Fase 1: Auth, famílias, contas, categorias, lançamentos manuais
- [x] Fase 2: Parsing e importação OFX (parser client-side com ofx-js, upload/preview/confirm, deduplicação por FITID)
- [ ] Fase 3: Ingestão de email via n8n
- [ ] Fase 4: Relatórios e exportações
- [ ] Fase 5: Telegram + IA para categorização
