# Data model

`prisma/schema.prisma` contains users, Auth.js accounts/sessions, organizations, memberships, private assets, prompt templates/versions, model registry, jobs, attempts, and dealership pilot batches. Each organization owns immutable `trialStartedAt` and `trialEndsAt` timestamps initialized during Google registration; existing organizations receive a 14-day trial when the migration is applied. Assets store trusted byte size, dimensions, and checksum for newly verified uploads.

Tenant-owned processing data is isolated both by server authorization and PostgreSQL RLS. Prisma tenant operations must run through `withTenantDb`; trusted worker operations use the separate server-only owner connection. Prisma migrations are applied with `npm run db:migrate`, which also prepares the limited application role and the `pg-boss` schema.

## Retired laboratory data: proposed follow-up only

The consolidation removes active consumers of `ShowroomLabExperiment`, `ShowroomLabImage`, `ShowroomLabBackground`, `ShowroomLabRun`, `PlateLabExperiment`, `PlateLabImage`, `PlateLabDetectionRun`, `PlateLabOutput`, `PlateLabAnnotationRevision` and `PlateLabMetricSnapshot`. Prisma definitions and all historical migrations are retained. No tables or rows are dropped in this sprint. `AdminAuditEvent`, users, organizations, assets, prompts, costs and advanced batch records remain active or retained platform records.

A later approved migration should inventory row counts, FK dependencies and artifacts, determine retention obligations, back up the affected tables and storage, test restoration, stop/drain historical queue messages, and archive retained records. Only then propose explicit table/enum/index removals in dependency order, with an archive-based rollback procedure. Obtain approval before executing destructive SQL. Do not use a reset or rewrite historical migrations.
