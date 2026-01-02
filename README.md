# Gestor

App de controle financeiro familiar com multi-usuarios, permissoes, ingestao de extratos e automacoes.

## Decisoes iniciais

- Frontend: Next.js (TypeScript recomendado)
- Backend: Supabase self-hosted (Auth + Postgres + Storage + RLS)
- Automacoes: n8n
- Servicos dedicados: API OFX em Python (FastAPI)
- Storage de anexos: Supabase Storage

## Arquitetura (alto nivel)

- Web app para lancamentos manuais, relatatorios e gestao de permissoes
- Supabase como camada central de dados e autenticacao
- n8n para workflows (email -> ofx -> importacao)
- Servico OFX para normalizar extratos e evitar duplicidades

## Roadmap

Fase 0 (fundacoes)
- Modelagem do schema e RLS
- Docker compose base
- README e convencoes

Fase 1 (core web)
- Autenticacao
- Familias, membros e permissoes
- Contas, categorias, lancamentos manuais

Fase 2 (OFX)
- Servico OFX com validacao, normalizacao e idempotencia
- Registro de importacoes

Fase 3 (email + n8n)
- Gmail e Hotmail (OAuth)
- Ingestao automatica de anexos

Fase 4 (relatorios)
- Dashboards por periodo, categoria, conta
- Exportacoes

Fase 5 (Telegram + IA)
- Lancamentos por chat
- Assistente para categorizacao

## Estrutura de pastas

- apps/web (frontend Next.js)
- db/init/001_init.sql (schema e RLS)
- services/ofx (API OFX)
- docker-compose.yml (supabase + n8n + ofx)

## Como subir localmente

Veja o passo a passo em `SETUP.md`.

## Deploy (VPS + Traefik)

Veja o passo a passo em `DEPLOY.md`.

## URLs locais

- Web app: http://localhost:3000
- Supabase API (Kong): http://localhost:8000
- Auth: http://localhost:8000/auth/v1
- REST: http://localhost:8000/rest/v1
- Storage: http://localhost:8000/storage/v1
- Realtime: http://localhost:8000/realtime/v1
- n8n: http://localhost:5678
- Studio (Dashboard): http://localhost:3002

## Segredos e chaves

- `JWT_SECRET` precisa ter no minimo 32 caracteres.
- `DB_ENC_KEY` e `SECRET_KEY_BASE` sao obrigatorios para o Realtime.
- `ANON_KEY` e `SERVICE_ROLE_KEY` devem ser JWTs validos do Supabase.
- Trocar senhas e usuarios padrao antes de usar em producao.

## Notas importantes

- Evitar logar dados sensiveis (valores, extratos, tokens).
- RLS e permissoes sao parte central do design.
- OFX deve gerar hashes para idempotencia e evitar duplicidade.
