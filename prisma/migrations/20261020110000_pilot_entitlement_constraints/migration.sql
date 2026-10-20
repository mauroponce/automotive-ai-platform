ALTER TABLE "PilotOrganizationEntitlement"
ADD CONSTRAINT "PilotOrganizationEntitlement_non_negative" CHECK (
  "grantedVehicleBatches" >= 0
  AND "reservedVehicleBatches" >= 0
  AND "consumedVehicleBatches" >= 0
),
ADD CONSTRAINT "PilotOrganizationEntitlement_within_grant" CHECK (
  "reservedVehicleBatches" <= "grantedVehicleBatches"
  AND "consumedVehicleBatches" <= "reservedVehicleBatches"
);
