# Architecture

Next.js App Router supplies the owner UI, dealership UI foundation, and `/api/v1`. PostgreSQL is accessed through Prisma; Auth.js uses its database adapter and Google OAuth with verified-email account linking. Registration creates an organization owner membership and an exact 14-day organization trial. Portal and organization API authorization enforce trial validity server-side.

Database migrations use the PostgreSQL owner URL. Runtime web and worker processes use the limited `automotive_app` role. Tenant transactions set `app.current_organization_id`, and forced PostgreSQL RLS policies protect assets, processing batches/items, entitlements, plate templates, generation jobs, and attempts. Trusted worker and lookup operations use the server-only migration connection explicitly; that URL must never be exposed to browser code.

Server-only generation code implements an `ImageProvider`; `OpenAIImageProvider` sends two images in order to Image Edit. `pg-boss` persists asynchronous work in PostgreSQL and the separate worker consumes generation, dealership batch, plate-lab, and showroom-lab queues. The migration job initializes and grants the queue schema before web and worker startup. The S3 storage service uses MinIO locally and Hetzner Object Storage in production through the same AWS SDK interface.
