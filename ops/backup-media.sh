#!/usr/bin/env bash
# Copies files from a source bucket/remote to an independent remote.
# Uses copy (NOT sync), so it does NOT delete destination files.
set -Eeuo pipefail
command -v rclone >/dev/null || { echo 'rclone is not installed.' >&2; exit 2; }
[[ -n "${MEDIA_SOURCE_REMOTE:-}" && -n "${MEDIA_BACKUP_REMOTE:-}" ]] || { echo 'Configure MEDIA_SOURCE_REMOTE and MEDIA_BACKUP_REMOTE.' >&2; exit 2; }
[[ "$MEDIA_SOURCE_REMOTE" != "$MEDIA_BACKUP_REMOTE" ]] || { echo 'Source and destination must differ.' >&2; exit 2; }
# IMPORTANT: use a configured crypt remote and/or provider encryption for the destination.
rclone copy "$MEDIA_SOURCE_REMOTE" "$MEDIA_BACKUP_REMOTE" --checkers 4 --transfers 2 --stats 30s
printf '\nCopy complete. Regularly verify integrity and recovery.\n'
