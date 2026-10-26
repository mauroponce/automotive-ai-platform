# API contract

The supported advanced pilot uses authenticated `/api/dealership/*` routes. Membership, roles and trial access are checked server-side; tenant transactions enforce RLS. A session or trial does not grant provider spending.

- `POST /api/dealership/assets`: accepts a dealership-owned vehicle/showroom image. Validate actual MIME, dimensions, maximum 20 MB, checksum and orientation before private S3 persistence.
- `POST /api/dealership/batches`: accepts 1–15 unique source assets, vehicle label, showroom preset or organization-owned showroom, optional editing preferences (up to 2,000 characters), `plateTreatment: "preserve"` and a stable idempotency key. Atomically reserve one manual pilot allowance and snapshot prompts/configuration. Cross-organization assets are rejected.
- `POST /api/dealership/batches/:id/start`: transitions an entitled draft and inserts the pg-boss message in one transaction. Repeat calls do not enqueue again. Failed/uncertain paid submissions require operator reconciliation.
- `POST /api/dealership/batches/:id/reconcile`: enqueues reconciliation for an existing provider batch, without submitting a new paid batch.
- `POST /api/dealership/batches/:id/items/:itemId/review`: records one human approve/reject decision for a result awaiting review.
- `GET /api/dealership/batches/:id/items/:itemId/output`: authorized private preview. Add `?download=1` for an attachment; this requires approval. Simulated output is explicitly identified in metadata/UI and `x-result-source`.

The old `/api/v1/jobs` in-memory demo implementation is retired. GET and POST return 503 after authentication instead of inventing nonpersistent queued jobs. Public commercial API-key middleware/finalization remain pending. `POST /api/v1/assets/upload-authorizations` stays disabled. Showroom/usage placeholder responses are not a commercial API.

There is no free photo-processing endpoint. Public blur routes run the shared ONNX/Canvas editor entirely in the browser. Laboratory and `/api/basic/edits` routes were removed and return 404. No deterministic server plate treatment or alternative local editing engine is planned.
