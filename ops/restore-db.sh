#!/usr/bin/env bash
# Destructive. Restores the current database: requires a literal confirmation and stopped web/worker services.
set -Eeuo pipefail
[[ $# -eq 1 ]] || { echo 'Usage: CONFIRM_RESTORE=RESTORE_CURRENT_DATABASE bash ops/restore-db.sh PATH.dump' >&2; exit 2; }
[[ "${CONFIRM_RESTORE:-}" == 'RESTORE_CURRENT_DATABASE' ]] || { echo 'BLOCKED: set CONFIRM_RESTORE=RESTORE_CURRENT_DATABASE' >&2; exit 2; }
source "$(dirname "${BASH_SOURCE[0]}")/compose.sh"
FILE="$1"
[[ -f "$FILE" && -s "$FILE" ]] || { echo "Invalid backup: $FILE" >&2; exit 1; }
# Avoid concurrent writes and accidental restores.
RUNNING="$(compose ps --status running --services)"
if printf '%s\n' "$RUNNING" | grep -Eq '^(web|worker)$'; then
  echo 'BLOCKED: stop web and worker with docker compose stop web worker.' >&2
  exit 2
fi
echo 'WARNING: objects and data in the currently configured PostgreSQL database will be replaced.'
echo 'Explicit confirmation received. Validating dump...'
compose exec -T postgres pg_restore --list < "$FILE" > /dev/null
compose exec -T postgres sh -c 'exec pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --single-transaction --exit-on-error --no-owner --no-acl' < "$FILE"
echo 'Restore complete. Review the application before starting web/worker.'
