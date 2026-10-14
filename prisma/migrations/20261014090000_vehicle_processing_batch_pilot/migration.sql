CREATE TYPE "VehicleProcessingBatchStatus" AS ENUM ('DRAFT', 'QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELED');
CREATE TYPE "VehicleProcessingItemStatus" AS ENUM ('QUEUED', 'SUBMITTED', 'PROCESSING', 'NEEDS_REVIEW', 'APPROVED', 'REJECTED', 'FAILED');
CREATE TYPE "VehicleBackgroundSource" AS ENUM ('PLATFORM_PRESET', 'ORGANIZATION_ASSET', 'BATCH_UPLOAD');
CREATE TYPE "VehiclePlateTreatment" AS ENUM ('BLUR', 'HIDE', 'REGISTERED_TEMPLATE');

CREATE TABLE "PilotOrganizationEntitlement" (
  "organizationId" TEXT NOT NULL,
  "grantedVehicleBatches" INTEGER NOT NULL DEFAULT 0,
  "reservedVehicleBatches" INTEGER NOT NULL DEFAULT 0,
  "consumedVehicleBatches" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PilotOrganizationEntitlement_pkey" PRIMARY KEY ("organizationId"),
  CONSTRAINT "PilotOrganizationEntitlement_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE
);
CREATE TABLE "RegisteredPlateTemplate" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "assetId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RegisteredPlateTemplate_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RegisteredPlateTemplate_assetId_key" UNIQUE ("assetId"),
  CONSTRAINT "RegisteredPlateTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE,
  CONSTRAINT "RegisteredPlateTemplate_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE
);
CREATE TABLE "VehicleProcessingBatch" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "vehicleLabel" TEXT NOT NULL,
  "status" "VehicleProcessingBatchStatus" NOT NULL DEFAULT 'DRAFT',
  "idempotencyKey" TEXT NOT NULL,
  "backgroundSource" "VehicleBackgroundSource" NOT NULL,
  "backgroundAssetId" TEXT,
  "backgroundSnapshot" JSONB NOT NULL,
  "plateTreatment" "VehiclePlateTreatment" NOT NULL,
  "plateTemplateId" TEXT,
  "configuration" JSONB NOT NULL,
  "providerBatchId" TEXT,
  "providerInputFileId" TEXT,
  "actualProviderCostUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "nonProviderCostUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "entitlementReservedAt" TIMESTAMP(3),
  "entitlementConsumedAt" TIMESTAMP(3),
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VehicleProcessingBatch_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "VehicleProcessingBatch_providerBatchId_key" UNIQUE ("providerBatchId"),
  CONSTRAINT "VehicleProcessingBatch_organizationId_idempotencyKey_key" UNIQUE ("organizationId", "idempotencyKey"),
  CONSTRAINT "VehicleProcessingBatch_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE,
  CONSTRAINT "VehicleProcessingBatch_backgroundAssetId_fkey" FOREIGN KEY ("backgroundAssetId") REFERENCES "Asset"("id") ON DELETE SET NULL
);
CREATE TABLE "VehicleProcessingItem" (
  "id" TEXT NOT NULL,
  "batchId" TEXT NOT NULL,
  "sourceAssetId" TEXT NOT NULL,
  "outputAssetId" TEXT,
  "status" "VehicleProcessingItemStatus" NOT NULL DEFAULT 'QUEUED',
  "providerCustomId" TEXT NOT NULL,
  "providerRequestId" TEXT,
  "promptSnapshot" TEXT NOT NULL,
  "usage" JSONB,
  "providerCostUsd" DOUBLE PRECISION,
  "evaluation" JSONB,
  "errorMessage" TEXT,
  "approvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VehicleProcessingItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "VehicleProcessingItem_outputAssetId_key" UNIQUE ("outputAssetId"),
  CONSTRAINT "VehicleProcessingItem_providerCustomId_key" UNIQUE ("providerCustomId"),
  CONSTRAINT "VehicleProcessingItem_batchId_sourceAssetId_key" UNIQUE ("batchId", "sourceAssetId"),
  CONSTRAINT "VehicleProcessingItem_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "VehicleProcessingBatch"("id") ON DELETE CASCADE,
  CONSTRAINT "VehicleProcessingItem_sourceAssetId_fkey" FOREIGN KEY ("sourceAssetId") REFERENCES "Asset"("id") ON DELETE RESTRICT,
  CONSTRAINT "VehicleProcessingItem_outputAssetId_fkey" FOREIGN KEY ("outputAssetId") REFERENCES "Asset"("id") ON DELETE SET NULL
);
