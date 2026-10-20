#!/usr/bin/env bash
set -Eeuo pipefail
: "${POSTGRES_APP_PASSWORD:?POSTGRES_APP_PASSWORD is required}"
psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  --set=app_password="$POSTGRES_APP_PASSWORD" \
  --set=app_database="$POSTGRES_DB" \
  --file=/docker-entrypoint-initdb.d/ensure-app-role.sql
