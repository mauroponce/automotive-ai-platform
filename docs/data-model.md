# Data model

`prisma/schema.prisma` contains users, Auth.js accounts/sessions, organizations, memberships, private assets, prompt templates/versions, model registry, jobs, attempts, and dealership pilot batches. Each organization owns immutable `trialStartedAt` and `trialEndsAt` timestamps initialized during Google registration; existing organizations receive a 14-day trial when the migration is applied. Assets store trusted byte size, dimensions, and checksum for newly verified uploads.

Tenant-owned processing data is isolated both by server authorization and PostgreSQL RLS. Prisma tenant operations must run through `withTenantDb`; trusted worker operations use the separate server-only owner connection. Prisma migrations are applied with `npm run db:migrate`, which also prepares the limited application role and the `pg-boss` schema.
