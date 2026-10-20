# Hetzner deployment

Provision one Ubuntu VPS and a private Hetzner Object Storage bucket. Install Docker Engine and the Compose plugin, clone this repository, copy `.env.production.example` to `.env.production`, and configure a real domain, secrets, distinct PostgreSQL owner/application passwords, OpenAI key, and S3 credentials. Start with `docker compose -f compose.prod.yaml up -d`.

Caddy obtains and renews HTTPS certificates for `DOMAIN`. PostgreSQL remains on the private Compose network and must not publish a port. Back up its named volume and configure Hetzner bucket lifecycle/backup independently. Images can be pulled from GHCR after the GitHub workflow publishes them.

The one-shot migrator must complete before web and worker start. It uses `MIGRATION_DATABASE_URL`, creates or updates the non-superuser `automotive_app` login, applies migrations, prepares `pg-boss`, and grants runtime access. Web and worker use only `DATABASE_URL`. Both the production and `migrator` image tags must be published for image-only deployments.

Do not deploy until `NEXTAUTH_SECRET`, `API_KEY_PEPPER`, both PostgreSQL credentials, and the private S3 bucket have been configured.
