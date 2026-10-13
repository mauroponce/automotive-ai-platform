#!/usr/bin/env bash
set -Eeuo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/compose.sh"
SERVICE="${1:-worker}"
case "$SERVICE" in
  web|worker|postgres) ;;
  minio) [[ "$COMPOSE_FILE" == "compose.yaml" ]] || { echo "minio exists only in local development." >&2; exit 2; } ;;
  caddy) [[ "$COMPOSE_FILE" == "compose.prod.yaml" ]] || { echo "caddy exists only on the production VPS." >&2; exit 2; } ;;
  *) echo "Unsupported service: $SERVICE." >&2; exit 2 ;;
esac
compose logs -f --tail=120 "$SERVICE"
