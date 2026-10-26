# OpenAI setup and contract verification

Official documentation checked on 2026-10-25:

- [Sunburst model](https://developers.openai.com/api/docs/models/gpt-image-2.5-sunburst): the configured model exists. This does **not** prove access for this account/project.
- [Image Edit reference](https://developers.openai.com/api/reference/resources/images/methods/edit): JSON input uses `images` containing `image_url`/`file_id` references; multipart SDK input uses `image`. The batch contract uses two ordered references (vehicle, showroom), one PNG result, opaque background, high quality and `1600x1200` (both dimensions divisible by 16).
- [Batch guide](https://developers.openai.com/api/docs/guides/batch): `/v1/images/edits` and Sunburst support Batch with a 24-hour completion window. Responses are JSONL keyed by `custom_id`; inspect both output and error files, including partial terminal batches.
- [Pricing](https://developers.openai.com/api/docs/pricing): the frozen `sunburst-batch-2026-10-25` configuration records Batch USD per million tokens: image input 4, text input 2.5, image output 15. These are token estimates, not reconciled invoices.

Paid processing requires `APP_DEMO_MODE=false`, `OPENAI_PAID_PROCESSING_ENABLED=true`, a server-only API key and a reserved manually granted organization pilot allowance. A session or 14-day trial is insufficient. The default environment disables paid processing. No live inference is authorized by installing or testing this repository.

`lib/dealership-batch/provider.ts` isolates OpenAI transport. Dispatch checks model access with the read-only models endpoint before submitting. Account enablement, organization verification, limits, actual output quality and billing still require configured credentials and an explicitly authorized staging pilot. No such paid pilot is performed by the automated suite.

Submission is durably claimed before provider interaction. If the response is lost or a retry exhausts, keep the allowance reserved. Inspect provider metadata `vehicle_batch_id`, input files and Batch IDs. Recover the existing Batch ID before reconciliation; never clear the claim or grant replacement allowance without checking whether a chargeable batch already exists. Even idempotency headers are not a substitute for this recovery.

Tests inject a provider with `kind: simulated`; generated records and UI are marked simulated. This adapter has no customer-facing environment toggle. Tests never need a real API key.
