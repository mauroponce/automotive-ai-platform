#!/usr/bin/env bash
# Logical PostgreSQL backup from the Compose `postgres` service.
# The output is verified before being considered successful.
set -Eeuo pipefail
umask 077
source "$(dirname "${BASH_SOURCE[0]}")/compose.sh"
BACKUP_DIR="${BACKUP_DIR:-$ROOT/backups/postgres}"
mkdir -p "$BACKUP_DIR"
NAME="postgres-$(date -u +%Y%m%dT%H%M%SZ).dump"
DEST="$BACKUP_DIR/$NAME"
TMP="$(mktemp "$BACKUP_DIR/.pgbackup.XXXXXX")"
trap 'rm -f "$TMP"' EXIT

echo "Exporting PostgreSQL (service: postgres)..."
compose exec -T postgres sh -c 'exec pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc --no-owner --no-acl' > "$TMP"
[[ -s "$TMP" ]] || { echo 'ERROR: empty backup.' >&2; exit 1; }
# Ensure pg_restore can list the file.
compose exec -T postgres pg_restore --list < "$TMP" > /dev/null
mv "$TMP" "$DEST"
( cd "$BACKUP_DIR"
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$NAME" > "$NAME.sha256"
  else
    shasum -a 256 "$NAME" > "$NAME.sha256"
  fi
)
trap - EXIT
echo "Backup created and verified: $DEST"
echo "WARNING: it still must be copied to an encrypted external destination."
