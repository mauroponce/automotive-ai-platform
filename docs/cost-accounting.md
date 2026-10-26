# Cost accounting

Batch creation reserves one **manually granted pilot vehicle-batch allowance** atomically under PostgreSQL row locking. Each batch contains at most 15 images. Trial access does not grant an allowance, and paid dispatch additionally requires explicit server spend authorization. This is a finite manual authorization mechanism, not a wallet or an assertion of a hard dollar cap.

Each new batch snapshots `sunburst-batch-2026-10-25` in configuration. Rate cards are immutable and estimates use the batch's version. Missing usage or historical unversioned configuration is marked `reconciliation_required`, with item cost null; never claim a missing cost is zero or an estimate is invoiced billing. Simulated results explicitly record `simulated_no_charge` and zero provider spending.

Idempotent result persistence increments the aggregate once. Approval consumes a reserved pilot batch once. Reservations remain spent/unavailable after failures or ambiguous submission; only a reviewed manual grant after provider reconciliation can replace allowance. Rejected results do not authorize unlimited regeneration. Partial results remain reviewable and individual failures are retained.

The existing pilot economic-gate calculation is an analytical target, **not an enforced spend guarantee**. Provider token use and total infrastructure/support costs need a real authorized pilot and invoice reconciliation. Prepaid credits, purchase verification, per-final-image consumption, refunds and an organization ledger remain the next sprint; Mercado Pago is not implemented.
