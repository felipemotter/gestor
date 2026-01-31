#!/bin/bash
# Runs inside /docker-entrypoint-initdb.d/ on first DB init only.
# Seeds demo data when SEED_DEMO=true.
set -e

if [ "${SEED_DEMO}" = "true" ]; then
  echo ">>> SEED_DEMO=true — inserting demo data..."
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
    < /docker-entrypoint-initdb.d/seed/demo_data.sql
  echo ">>> Demo data seeded."
else
  echo ">>> SEED_DEMO not set — skipping demo seed."
fi
