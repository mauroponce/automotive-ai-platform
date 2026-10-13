# Operations Commands

All scripts run from the repository root and use actual project service names. Local is the default. Set `COMPOSE_FILE=compose.prod.yaml` only on the future Hetzner VPS.

| Need | Command | Changes data? |
| --- | --- | --- |
| Check services and disk | `make status` | No |
| Follow logs | `bash ops/logs.sh worker` | No |
| Start local stack | `make up` | Starts services |
| Backup database | `bash ops/backup-db.sh` | Creates a local dump |
| Verify dump | `bash ops/verify-db-backup.sh PATH.dump` | No |
| Restore database | `CONFIRM_RESTORE=RESTORE_CURRENT_DATABASE bash ops/restore-db.sh PATH.dump` | Destructive |
| Conservative Docker cleanup | `make clean-safe` | Deletes old dangling cache only |

`minio` is local-only. `caddy` is production-only. `postgres`, `web`, and `worker` exist in both environments.

Do not schedule database or media backups until an encrypted off-host destination and a restoration test are available. See [DEVOPS.md](../DEVOPS.md) for full procedures and safety restrictions.
