#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

PSQL_CMD="docker compose exec -T db psql -v ON_ERROR_STOP=1 -U postgres"

# --------------------------------------------------------------------------
# reset: limpa todos os dados (mantém schema)
# --------------------------------------------------------------------------
do_reset() {
  echo ">>> Resetting database (truncating all data)..."
  $PSQL_CMD <<'SQL'
SET session_replication_role = 'replica';

-- Truncate all public tables
TRUNCATE TABLE
  public.audit_logs,
  public.attachments,
  public.transaction_tags,
  public.transactions,
  public.import_batches,
  public.tags,
  public.rules,
  public.categories,
  public.accounts,
  public.memberships,
  public.families
CASCADE;

-- Clean auth tables
DELETE FROM auth.identities;
DELETE FROM auth.sessions;
DELETE FROM auth.refresh_tokens;
DELETE FROM auth.mfa_amr_claims;
DELETE FROM auth.mfa_factors;
DELETE FROM auth.mfa_challenges;
DELETE FROM auth.users;

SET session_replication_role = 'origin';
SQL
  echo ">>> Reset complete."
}

# --------------------------------------------------------------------------
# seed: insere dados demo
# --------------------------------------------------------------------------
do_seed() {
  echo ">>> Seeding demo data..."
  $PSQL_CMD < "$PROJECT_DIR/db/seed/demo_data.sql"
  echo ""
  echo "========================================="
  echo "  Demo users created:"
  echo "========================================="
  echo "  demo@demo.com  / demo123  (standalone)"
  echo "  joao@demo.com  / demo123  (owner - Família Silva)"
  echo "  maria@demo.com / demo123  (member - Família Silva)"
  echo "========================================="
  echo ""
}

# --------------------------------------------------------------------------
# main
# --------------------------------------------------------------------------
usage() {
  echo "Usage: $0 {reset|seed|reset-and-seed}"
  echo ""
  echo "Commands:"
  echo "  reset          Truncate all data (keeps schema)"
  echo "  seed           Insert demo data"
  echo "  reset-and-seed Reset + seed"
  exit 1
}

case "${1:-}" in
  reset)
    do_reset
    ;;
  seed)
    do_seed
    ;;
  reset-and-seed)
    do_reset
    do_seed
    ;;
  *)
    usage
    ;;
esac
