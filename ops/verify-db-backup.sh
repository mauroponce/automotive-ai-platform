#!/usr/bin/env bash
set -Eeuo pipefail
[[ $# -eq 1 ]] || { echo "Usage: bash ops/verify-db-backup.sh PATH.dump" >&2; exit 2; }
source "$(dirname "${BASH_SOURCE[0]}")/compose.sh"
FILE="$1"
[[ -f "$FILE" && -s "$FILE" ]] || { echo "Backup does not exist or is empty: $FILE" >&2; exit 1; }
DIR="$(cd "$(dirname "$FILE")" && pwd)"
BASENAME="$(basename "$FILE")"
if [[ -f "$DIR/$BASENAME.sha256" ]]; then
  (cd "$DIR"
    if command -v sha256sum >/dev/null 2>&1; then
      sha256sum -c "$BASENAME.sha256"
    else
      shasum -a 256 -c "$BASENAME.sha256"
    fi
  )
fi
compose exec -T postgres pg_restore --list < "$FILE" > /dev/null
echo "Backup structure is readable. IMPORTANT: this does not replace a restoration test."
