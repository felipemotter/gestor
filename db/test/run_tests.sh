#!/usr/bin/env bash
# SQL test runner — requires PostgreSQL with schema already applied.
# Usage: bash db/test/run_tests.sh [host] [port]
#
# Defaults connect to the docker compose db service.

set -euo pipefail

HOST="${1:-localhost}"
PORT="${2:-5433}"
DB="postgres"
USER="postgres"
PASS="${POSTGRES_PASSWORD:-your-super-secret-and-long-postgres-password}"

DIR="$(cd "$(dirname "$0")" && pwd)"

export PGPASSWORD="$PASS"

TOTAL=0
PASSED=0
FAILED=0

for f in "$DIR"/test_*.sql; do
  name="$(basename "$f" .sql)"
  TOTAL=$((TOTAL + 1))
  echo -n "  $name ... "
  if output=$(psql -h "$HOST" -p "$PORT" -U "$USER" -d "$DB" \
      -v ON_ERROR_STOP=1 -f "$f" 2>&1); then
    echo "OK"
    PASSED=$((PASSED + 1))
  else
    echo "FAIL"
    echo "$output" | sed 's/^/    /'
    FAILED=$((FAILED + 1))
  fi
done

echo ""
echo "Results: $PASSED/$TOTAL passed, $FAILED failed"

if [ "$FAILED" -gt 0 ]; then
  exit 1
fi
