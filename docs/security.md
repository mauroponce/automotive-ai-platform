# Security

Keep OpenAI, PostgreSQL owner, Auth.js, and S3 credentials server-only. Web and worker runtime queries use the limited `automotive_app` role; only the migrator and explicit trusted service queries use `MIGRATION_DATABASE_URL`. Tenant authorization is checked in the server and reinforced by forced PostgreSQL RLS policies with a transaction-local organization context.

Private S3 storage, verified MIME/size/dimension checks, checksum capture, API-key hashing, server-side budgets, organization-scoped Prisma queries, and Auth.js sessions are required before real asset intake. The authenticated dealership upload normalizes and verifies image content. Presigned public API uploads remain disabled until a verified finalization workflow exists. PostgreSQL is private to Compose in production. Never claim prompting guarantees vehicle fidelity.
