# Local development

Copy `.env.example` to `.env.local`, then run `docker compose up --build`. Docker applies migrations through a one-shot migrator, binds port 3000, and checks `/api/health`. Source is bind-mounted for hot reload. The Compose overrides keep the owner migration URL separate from the limited `automotive_app` runtime URL.

Restart the `migrate` service after schema changes. It creates or updates the limited role, deploys Prisma migrations with the owner URL, prepares the `pg-boss` schema and queues, and grants only the runtime permissions required by web and worker processes. The production target contains the standalone Next.js server and bundled worker; the separate migrator target retains only the migration and queue bootstrap tooling.
