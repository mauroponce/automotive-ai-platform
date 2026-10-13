# API contract

`POST /api/v1/jobs` accepts vehicle/showroom/prompt UUIDs, selected model, quality, and an idempotency key; it returns `202` and a queued job. `GET /api/v1/jobs`, `GET /api/v1/showrooms`, and `GET /api/v1/usage` return consistent `{data, meta}` envelopes. `POST /api/v1/assets/upload-authorizations` validates proposed upload metadata and intentionally returns `501` until Supabase Storage credentials are configured. API-key authentication persistence is in the migration; production middleware remains required before exposing these endpoints.
