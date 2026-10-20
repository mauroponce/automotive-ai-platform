#!/usr/bin/env bash
set -Eeuo pipefail

MIGRATION_URL="${MIGRATION_DATABASE_URL:-${DATABASE_URL:-}}"
: "${MIGRATION_URL:?MIGRATION_DATABASE_URL or DATABASE_URL is required}"
: "${POSTGRES_APP_PASSWORD:?POSTGRES_APP_PASSWORD is required}"
: "${POSTGRES_DB:?POSTGRES_DB is required}"

PSQL_URL="${MIGRATION_URL%%\?*}"
psql "$PSQL_URL" \
  --set=app_password="$POSTGRES_APP_PASSWORD" \
  --set=app_database="$POSTGRES_DB" \
  --file="$(dirname "${BASH_SOURCE[0]}")/ensure-app-role.sql"

DATABASE_URL="$MIGRATION_URL" npx prisma migrate deploy
DATABASE_URL="$MIGRATION_URL" node "$(dirname "${BASH_SOURCE[0]}")/prepare-queue.mjs"
psql "$PSQL_URL" --file="$(dirname "${BASH_SOURCE[0]}")/grant-queue-role.sql"
