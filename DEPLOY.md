# Deploy com Traefik (VPS)

Este guia sobe o Gestor com TLS automatico (Let's Encrypt) usando Traefik.

## Pre-requisitos

- DNS apontando para o VPS:
  - gestor.felipemotter.com.br
  - api.gestor.felipemotter.com.br
- Portas 80 e 443 liberadas no VPS.
- Docker + Docker Compose instalados.

## Ajuste do .env (no VPS)

Crie um `.env.prod` na raiz (use `.env.prod.example` como base) e garanta:

API_EXTERNAL_URL=https://api.gestor.felipemotter.com.br
SUPABASE_PUBLIC_URL=https://api.gestor.felipemotter.com.br
GOTRUE_SITE_URL=https://gestor.felipemotter.com.br
GOTRUE_URI_ALLOW_LIST=https://gestor.felipemotter.com.br
NEXT_PUBLIC_SUPABASE_URL=https://api.gestor.felipemotter.com.br

Se voce usa redirect em mais de um dominio, separe por virgula.

## Subir com Traefik

Use o compose principal + o override:

```bash
docker compose \
  --env-file .env.prod \
  -f docker-compose.yml \
  -f docker-compose.prod.yml \
  -f docker-compose.traefik.yml \
  up -d
```

## Testes rapidos

```bash
curl -I https://gestor.felipemotter.com.br
curl -I https://api.gestor.felipemotter.com.br/auth/v1/health
```

## Observacoes

- O arquivo `docker-compose.traefik.yml` fecha portas de todos os servicos e expõe apenas o Traefik.
- Se quiser expor n8n, studio ou outro servico, posso adicionar rotas no Traefik.
