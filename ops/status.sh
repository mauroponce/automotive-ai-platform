#!/usr/bin/env bash
set -Eeuo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/compose.sh"
echo "== Environment: $(environment_name) ($COMPOSE_FILE) =="
echo '== Containers =='
compose ps
echo
echo '== Docker disk usage =='
docker system df
echo
echo '== Host disk =='
df -h
echo
echo '== Memory =='
free -h 2>/dev/null || true
