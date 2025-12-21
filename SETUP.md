# Setup local

Requisitos:
- Docker e Docker Compose
- Python 3

## Passo a passo

1) Gere o `.env` automaticamente (e o `.env.local` do frontend):

```bash
python3 scripts/gen_env.py --write-web-env
```

Se o arquivo ja existir, use:

```bash
python3 scripts/gen_env.py --write-web-env --force
```

2) (Opcional) Ajuste o `.env` para SMTP, portas ou senhas.
   - Para dev sem confirmacao de email: `GOTRUE_MAILER_AUTOCONFIRM=true`
   - Para bloquear cadastro publico: `GOTRUE_DISABLE_SIGNUP=true`

3) Suba os servicos:

```bash
docker compose up -d
```

4) Verifique status:

```bash
docker compose ps
```

5) URLs locais
- Supabase API (Kong): http://localhost:8000
- Auth: http://localhost:8000/auth/v1
- REST: http://localhost:8000/rest/v1
- Storage: http://localhost:8000/storage/v1
- Realtime: http://localhost:8000/realtime/v1
- n8n: http://localhost:5678
- Studio (Dashboard): http://localhost:3002
- Postgres (host): localhost:5433

6) (Opcional) Suba o frontend:

```bash
cd apps/web
npm install
```

Se voce nao gerou o `.env.local` com o script, copie o exemplo:

```bash
cp .env.local.example .env.local
```

E preencha `NEXT_PUBLIC_SUPABASE_ANON_KEY` com o valor `ANON_KEY` do `.env` na raiz.
Depois suba o app:

```bash
npm run dev
```

Acesse http://localhost:3000

Se preferir rodar o frontend via Docker:

```bash
docker compose up -d web
```

7) Logs (opcional)

```bash
docker compose logs -f
```

## Problemas comuns

- Erro `schema "auth" does not exist`: pare os containers e remova o volume para o Postgres inicializar com os scripts do Supabase.
- Se voce mudou `POSTGRES_USER`, refaca o volume (`down -v`) e regenere o `.env`.
- Se voce regenerou o `.env` com novas senhas/segredos (ex.: `POSTGRES_PASSWORD`), refaca o volume (`down -v`) para manter tudo alinhado.

```bash
docker compose down -v
docker compose up -d
```

## Reset (apaga dados)

```bash
docker compose down -v
```

## Notas

- O schema inicial em `db/init/001_init.sql` e aplicado na primeira subida do banco.
- As chaves `ANON_KEY` e `SERVICE_ROLE_KEY` ficam no `.env`.
- O Studio e para uso local; logs/analytics nao estao habilitados.
