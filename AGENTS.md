# Automotive AI Platform

Keep all code, UI, documentation, SQL, and filenames in English. Never expose service-role or OpenAI keys to client code. Tenant authorization is enforced on the server and by PostgreSQL RLS; frontend filtering is never an authorization control. Demo mode must visibly identify all non-provider results.

## Commercial strategy context

Use `docs/comercial.md` as the enduring business context for decisions about product scope, architecture, functionality, pricing, user experience, and development priorities. Preserve its distinction between repository-backed facts, targets, assumptions, and hypotheses; do not represent an unvalidated goal as a delivered capability. The file is intentionally written in Argentine Spanish at the user's explicit request; all other documentation continues to follow the English-language convention above.

## Permanent product boundaries

The product has exactly two modes: free single-photo license plate blur entirely in the browser, and paid advanced image editing through backend OpenAI Image Edit. Consult `docs/comercial.md` for every future product plan and implementation priority. Trial access never authorizes provider spending; server authorization and a reserved organization allowance are required.

Do not reintroduce server plate detection, local segmentation, local showroom composition, procedural shadows, Python vision services, or retired laboratories without a new explicit product decision. Sharp is limited to auxiliary validation, orientation, format conversion and export. Preserve browser ONNX/Canvas assets and mandatory human correction of suggestions. Do not delete historical migrations or laboratory data without an approved migration.
