# API contract

`POST /api/v1/jobs` accepts vehicle/showroom/prompt UUIDs, selected model, quality, and an idempotency key only in explicit demo mode; the response includes `meta.demo: true`. Live mode returns `503` until persistent generation is implemented. `GET /api/v1/jobs`, `GET /api/v1/showrooms`, and `GET /api/v1/usage` return consistent `{data, meta}` envelopes and require an authenticated portal session.

`POST /api/v1/assets/upload-authorizations` currently returns `503`. Direct uploads remain disabled until API-key authentication and a server-verified finalization step enforce actual MIME type, dimensions, byte size, checksum, and asset persistence. The authenticated dealership upload route performs those validations server-side. API-key middleware remains required before exposing the commercial API publicly.

Dealership batch creation currently accepts only `plateTreatment: "preserve"`. Blur, hide, and registered-template treatments remain reserved until a production-approved deterministic treatment is connected; unsupported values are rejected instead of being represented as completed work.
