#!/usr/bin/env bash
# Copies a PostgreSQL dump to an already initialized encrypted remote restic repository.
set -Eeuo pipefail
[[ $# -eq 1 ]] || { echo 'Usage: bash ops/offsite-db.sh PATH.dump' >&2; exit 2; }
[[ -n "${RESTIC_REPOSITORY:-}" && -n "${RESTIC_PASSWORD_FILE:-}" ]] || { echo 'Configure RESTIC_REPOSITORY and RESTIC_PASSWORD_FILE outside Git.' >&2; exit 2; }
command -v restic >/dev/null || { echo 'restic is not installed.' >&2; exit 2; }
FILE="$1"
[[ -f "$FILE" && -s "$FILE" ]] || { echo "Invalid file: $FILE" >&2; exit 2; }
restic backup --tag postgres "$FILE"
echo 'Backup uploaded to the restic repository. Regularly verify snapshots and restores.'
