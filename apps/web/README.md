# Dindin Web

Frontend do Projeto Dindin (Next.js + Tailwind).

## Setup rapido

```bash
npm install
```

Se voce ja rodou `python3 scripts/gen_env.py --write-web-env` na raiz, o
`.env.local` ja foi criado. Caso contrario:

```bash
cp .env.local.example .env.local
```

Edite `.env.local` e use o valor `ANON_KEY` do `.env` na raiz.

```bash
npm run dev
```

Acesse http://localhost:3000

## Docker (opcional)

Se preferir rodar via Docker Compose na raiz:

```bash
docker compose up -d web
```

Nesse modo o container usa o `ANON_KEY` do `.env` da raiz.
