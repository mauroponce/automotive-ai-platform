#!/usr/bin/env bash
# Shared layer: local development uses compose.yaml; the VPS uses COMPOSE_FILE=compose.prod.yaml.
# Arbitrary files are rejected to avoid operating on the wrong configuration.
set -Eeuo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
COMPOSE_FILE="${COMPOSE_FILE:-compose.yaml}"
case "$COMPOSE_FILE" in
  compose.yaml|compose.prod.yaml) ;;
  *) echo "Unsupported COMPOSE_FILE: $COMPOSE_FILE. Use compose.yaml or compose.prod.yaml." >&2; exit 2 ;;
esac
compose() { docker compose -f "$COMPOSE_FILE" "$@"; }
environment_name() { [[ "$COMPOSE_FILE" == "compose.prod.yaml" ]] && echo "production VPS" || echo "local development"; }
