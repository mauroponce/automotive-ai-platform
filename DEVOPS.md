# DevOps Manual — Vehicle Image SaaS

## Environments and services

Local development uses `compose.yaml` with `web`, `worker`, `postgres`, and `minio`. The future Hetzner VPS uses `compose.prod.yaml` with `web`, `worker`, `postgres`, and `caddy`. Production uses Hetzner Object Storage, not MinIO.

Run local commands from the repository root:

```bash
make help
make up
make status
bash ops/logs.sh web
bash ops/logs.sh worker
```

For the VPS, select production deliberately before running any operational script:

```bash
export COMPOSE_FILE=compose.prod.yaml
make status
bash ops/logs.sh caddy
```

Scripts accept only `compose.yaml` and `compose.prod.yaml`; this prevents an accidental command against an arbitrary Compose project.

## Database backups

`bash ops/backup-db.sh` writes a PostgreSQL custom-format dump to `backups/postgres/`, validates it with `pg_restore --list`, and writes a SHA-256 checksum. The directory and dumps are ignored by Git.

```bash
bash ops/backup-db.sh
bash ops/verify-db-backup.sh backups/postgres/FILE.dump
```

Restore is destructive. It requires the literal confirmation below and refuses to run while `web` or `worker` is running:

```bash
docker compose -f "${COMPOSE_FILE:-compose.yaml}" stop web worker
CONFIRM_RESTORE=RESTORE_CURRENT_DATABASE bash ops/restore-db.sh backups/postgres/FILE.dump
```

Test restores only against a separate database. A readable dump is not evidence of a successful restore.

## External backups and media

A database dump stores asset metadata, not vehicle-image bytes. Do not configure automatic backups yet. First configure an independent encrypted restic destination, complete a test restore, and configure a separate rclone destination for media:

```bash
bash ops/offsite-db.sh backups/postgres/FILE.dump
MEDIA_SOURCE_REMOTE='source:bucket' MEDIA_BACKUP_REMOTE='encrypted-destination:bucket' bash ops/backup-media.sh
```

`rclone copy` never deletes source or destination objects. Do not automate retention or pruning until recovery has been proven.

## Safe operations

```bash
docker system df
df -h
bash ops/docker-clean-safe.sh
```

The cleanup script removes only dangling images and old build cache. It does not remove volumes, but it affects the whole Docker host; review it before use on a shared VPS. Never use `docker compose down -v`, `docker volume prune`, or `docker system prune -a --volumes` for routine maintenance.

## Deploying and rolling back

Use a versioned `IMAGE_TAG`, never `latest` alone. After reviewing migrations, backups, and the image tag:

```bash
docker compose -f compose.prod.yaml pull web worker
docker compose -f compose.prod.yaml up -d --no-build web worker
docker compose -f compose.prod.yaml ps
```

Rolling back an image does not roll back a database migration. Plan compatible migrations and preserve the previously working image tag.
