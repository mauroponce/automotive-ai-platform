# Architecture

Next.js App Router supplies the owner UI, dealership UI foundation, and `/api/v1`. PostgreSQL is accessed through Prisma; Auth.js uses its database adapter and password credentials. Server-only generation code implements an `ImageProvider`; `OpenAIImageProvider` sends two images in order to Image Edit. `pg-boss` persists asynchronous work in PostgreSQL and the separate worker consumes it. The S3 storage service uses MinIO locally and Hetzner Object Storage in production through the same AWS SDK interface.
