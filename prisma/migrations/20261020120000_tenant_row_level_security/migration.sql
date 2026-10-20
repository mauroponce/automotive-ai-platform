ALTER TABLE "Asset" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Asset" FORCE ROW LEVEL SECURITY;
CREATE POLICY "Asset_tenant_isolation" ON "Asset"
USING ("organizationId" = NULLIF(current_setting('app.current_organization_id', true), ''))
WITH CHECK ("organizationId" = NULLIF(current_setting('app.current_organization_id', true), ''));

ALTER TABLE "PilotOrganizationEntitlement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PilotOrganizationEntitlement" FORCE ROW LEVEL SECURITY;
CREATE POLICY "PilotOrganizationEntitlement_tenant_isolation" ON "PilotOrganizationEntitlement"
USING ("organizationId" = NULLIF(current_setting('app.current_organization_id', true), ''))
WITH CHECK ("organizationId" = NULLIF(current_setting('app.current_organization_id', true), ''));

ALTER TABLE "RegisteredPlateTemplate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RegisteredPlateTemplate" FORCE ROW LEVEL SECURITY;
CREATE POLICY "RegisteredPlateTemplate_tenant_isolation" ON "RegisteredPlateTemplate"
USING ("organizationId" = NULLIF(current_setting('app.current_organization_id', true), ''))
WITH CHECK ("organizationId" = NULLIF(current_setting('app.current_organization_id', true), ''));

ALTER TABLE "VehicleProcessingBatch" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VehicleProcessingBatch" FORCE ROW LEVEL SECURITY;
CREATE POLICY "VehicleProcessingBatch_tenant_isolation" ON "VehicleProcessingBatch"
USING ("organizationId" = NULLIF(current_setting('app.current_organization_id', true), ''))
WITH CHECK ("organizationId" = NULLIF(current_setting('app.current_organization_id', true), ''));

ALTER TABLE "VehicleProcessingItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VehicleProcessingItem" FORCE ROW LEVEL SECURITY;
CREATE POLICY "VehicleProcessingItem_tenant_isolation" ON "VehicleProcessingItem"
USING (
  EXISTS (
    SELECT 1 FROM "VehicleProcessingBatch" batch
    WHERE batch."id" = "VehicleProcessingItem"."batchId"
      AND batch."organizationId" = NULLIF(current_setting('app.current_organization_id', true), '')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM "VehicleProcessingBatch" batch
    WHERE batch."id" = "VehicleProcessingItem"."batchId"
      AND batch."organizationId" = NULLIF(current_setting('app.current_organization_id', true), '')
  )
);

ALTER TABLE "GenerationJob" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GenerationJob" FORCE ROW LEVEL SECURITY;
CREATE POLICY "GenerationJob_tenant_isolation" ON "GenerationJob"
USING ("organizationId" = NULLIF(current_setting('app.current_organization_id', true), ''))
WITH CHECK ("organizationId" = NULLIF(current_setting('app.current_organization_id', true), ''));

ALTER TABLE "GenerationAttempt" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GenerationAttempt" FORCE ROW LEVEL SECURITY;
CREATE POLICY "GenerationAttempt_tenant_isolation" ON "GenerationAttempt"
USING (
  EXISTS (
    SELECT 1 FROM "GenerationJob" job
    WHERE job."id" = "GenerationAttempt"."jobId"
      AND job."organizationId" = NULLIF(current_setting('app.current_organization_id', true), '')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM "GenerationJob" job
    WHERE job."id" = "GenerationAttempt"."jobId"
      AND job."organizationId" = NULLIF(current_setting('app.current_organization_id', true), '')
  )
);
