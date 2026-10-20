import { randomUUID } from "node:crypto";
import { AssetKind, Prisma, VehicleBackgroundSource, VehiclePlateTreatment, VehicleProcessingBatchStatus, VehicleProcessingItemStatus } from "@prisma/client";
import { withRlsBypass, withTenantDb } from "@/lib/db";
import { storage } from "@/lib/storage";
import { normalizeImageUpload } from "@/lib/image-upload";
import { batchCreateSchema, batchProviderCostUsd, type ImageUsage } from "./models";
import { buildPilotBatchPrompt } from "./prompts";

const presetPaths: Record<string, string> = { "studio-white-v1": "/showrooms/studio-white-v1.png", "showroom-gray-v1": "/showrooms/showroom-gray-v1.png", "showroom-dark-v1": "/showrooms/showroom-dark-v1.png" };
const assetKinds = new Set<AssetKind>([AssetKind.VEHICLE, AssetKind.SHOWROOM, AssetKind.LOGO]);

export async function uploadOrganizationAsset(organizationId: string, kind: AssetKind, file: File) {
  if (!assetKinds.has(kind)) throw new Error("Unsupported pilot asset kind.");
  const image = await normalizeImageUpload(file, { maxBytes: 20_000_000, maxPixels: 24_000_000 });
  const key = `${organizationId}/${kind.toLowerCase()}/${randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100)}`;
  await storage.put(key, image.body, image.contentType);
  try {
    return await withTenantDb(organizationId, (tx) => tx.asset.create({ data: { organizationId, kind, objectKey: key, contentType: image.contentType, byteSize: image.body.length, checksum: image.checksum, width: image.width, height: image.height } }));
  } catch (error) {
    await storage.remove(key).catch(() => undefined);
    throw error;
  }
}

export async function createRegisteredPlateTemplate(organizationId: string, name: string, assetId: string) {
  return withTenantDb(organizationId, async (tx) => {
    const asset = await tx.asset.findFirst({ where: { id: assetId, organizationId, kind: "LOGO" } });
    if (!asset) throw new Error("Registered plate template asset was not found.");
    return tx.registeredPlateTemplate.create({ data: { organizationId, assetId, name: name.trim().slice(0, 120) || "Plate cover" } });
  });
}

export async function createVehicleProcessingBatch(input: unknown) {
  const value = batchCreateSchema.parse(input);
  return withTenantDb(value.organizationId, async (tx) => {
    const existing = await tx.vehicleProcessingBatch.findUnique({ where: { organizationId_idempotencyKey: { organizationId: value.organizationId, idempotencyKey: value.idempotencyKey } }, include: { items: true } });
    if (existing) return existing;
    const sourceAssets = await tx.asset.findMany({ where: { id: { in: value.sourceAssetIds }, organizationId: value.organizationId, kind: "VEHICLE" } });
    if (sourceAssets.length !== value.sourceAssetIds.length) throw new Error("Every source image must be a vehicle asset owned by this dealership.");
    let backgroundAssetId: string | undefined; let backgroundSnapshot: object;
    if (value.background.source === "platform_preset") backgroundSnapshot = { source: value.background.source, presetId: value.background.presetId, publicPath: presetPaths[value.background.presetId] };
    else {
      const background = await tx.asset.findFirst({ where: { id: value.background.assetId, organizationId: value.organizationId, kind: "SHOWROOM" } });
      if (!background) throw new Error("The selected showroom background was not found.");
      backgroundAssetId = background.id; backgroundSnapshot = { source: value.background.source, assetId: background.id, objectKey: background.objectKey, contentType: background.contentType };
    }
    if (value.plateTreatment === "registered_template") { const template = await tx.registeredPlateTemplate.findFirst({ where: { id: value.plateTemplateId, organizationId: value.organizationId } }); if (!template) throw new Error("The selected registered plate template was not found."); }
    const reservation = await tx.$queryRaw<Array<{ organizationId: string }>>`
      UPDATE "PilotOrganizationEntitlement"
      SET "reservedVehicleBatches" = "reservedVehicleBatches" + 1, "updatedAt" = NOW()
      WHERE "organizationId" = ${value.organizationId}
        AND "reservedVehicleBatches" < "grantedVehicleBatches"
      RETURNING "organizationId"
    `;
    if (!reservation.length) throw new Error("This dealership has no manually provisioned pilot batch entitlement.");
    return tx.vehicleProcessingBatch.create({ data: {
      organizationId: value.organizationId, vehicleLabel: value.vehicleLabel, idempotencyKey: value.idempotencyKey,
      backgroundSource: value.background.source === "platform_preset" ? VehicleBackgroundSource.PLATFORM_PRESET : value.background.source === "organization_asset" ? VehicleBackgroundSource.ORGANIZATION_ASSET : VehicleBackgroundSource.BATCH_UPLOAD,
      backgroundAssetId, backgroundSnapshot, plateTreatment: value.plateTreatment === "preserve" ? VehiclePlateTreatment.PRESERVE : value.plateTreatment === "blur" ? VehiclePlateTreatment.BLUR : value.plateTreatment === "hide" ? VehiclePlateTreatment.HIDE : VehiclePlateTreatment.REGISTERED_TEMPLATE, plateTemplateId: value.plateTemplateId, configuration: { model: "gpt-image-2.5-sunburst", delivery: "batch_24h", output: "1600x1200", reviewRequired: true, onePromptPerImage: true }, entitlementReservedAt: new Date(),
      items: { create: sourceAssets.map((asset) => ({ sourceAssetId: asset.id, providerCustomId: randomUUID(), promptSnapshot: buildPilotBatchPrompt() })) },
    }, include: { items: true } });
  });
}

export async function queueVehicleProcessingBatch(organizationId: string, batchId: string) {
  return withTenantDb(organizationId, async (tx) => {
    const claimed = await tx.vehicleProcessingBatch.updateMany({ where: { id: batchId, organizationId, status: { in: [VehicleProcessingBatchStatus.DRAFT, VehicleProcessingBatchStatus.FAILED] } }, data: { status: VehicleProcessingBatchStatus.QUEUED, errorMessage: null } });
    const batch = await tx.vehicleProcessingBatch.findFirst({ where: { id: batchId, organizationId } });
    if (!batch) throw new Error("Vehicle batch not found.");
    return { batch, shouldEnqueue: claimed.count === 1 };
  });
}

export async function recordVehicleBatchError(batchId: string, error: unknown) {
  return withRlsBypass((tx) => tx.vehicleProcessingBatch.update({ where: { id: batchId }, data: { errorMessage: error instanceof Error ? error.message.slice(0, 1000) : "Vehicle batch processing failed" } }));
}

export async function batchInputUrls(batchId: string) {
  const batch = await withRlsBypass((tx) => tx.vehicleProcessingBatch.findUniqueOrThrow({ where: { id: batchId }, include: { items: { include: { sourceAsset: true } }, backgroundAsset: true } }));
  let backgroundUrl: string;
  if (batch.backgroundSource === VehicleBackgroundSource.PLATFORM_PRESET) {
    const path = (batch.backgroundSnapshot as { publicPath?: string }).publicPath;
    const origin = process.env.APP_PUBLIC_ORIGIN;
    if (!origin || !path) throw new Error("APP_PUBLIC_ORIGIN is required to process platform showrooms through OpenAI Batch.");
    backgroundUrl = new URL(path, origin).toString();
  } else {
    if (!batch.backgroundAsset) throw new Error("Batch background asset was missing.");
    backgroundUrl = await storage.signedReadUrl(batch.backgroundAsset.objectKey, 172800);
  }
  return { batch, backgroundUrl, items: await Promise.all(batch.items.map(async (item) => ({ ...item, sourceUrl: await storage.signedReadUrl(item.sourceAsset.objectKey, 172800) }))) };
}

export async function recordBatchSubmission(batchId: string, providerBatchId: string, providerInputFileId: string) {
  await withRlsBypass(async (tx) => {
    await tx.vehicleProcessingBatch.update({ where: { id: batchId }, data: { status: VehicleProcessingBatchStatus.PROCESSING, providerBatchId, providerInputFileId, startedAt: new Date() } });
    await tx.vehicleProcessingItem.updateMany({ where: { batchId, status: VehicleProcessingItemStatus.QUEUED }, data: { status: VehicleProcessingItemStatus.SUBMITTED } });
  });
}

export async function storeBatchItemResult(input: { batchId: string; customId: string; output: Buffer; contentType: string; usage: ImageUsage; requestId?: string }) {
  const item = await withRlsBypass((tx) => tx.vehicleProcessingItem.findFirst({ where: { batchId: input.batchId, providerCustomId: input.customId }, include: { batch: true } }));
  if (
    !item ||
    item.status === VehicleProcessingItemStatus.NEEDS_REVIEW ||
    item.status === VehicleProcessingItemStatus.APPROVED ||
    item.status === VehicleProcessingItemStatus.REJECTED
  ) return;
  const normalized = await normalizeImageUpload(new File([new Uint8Array(input.output)], `${item.id}.png`, { type: input.contentType }), { maxBytes: 30_000_000, maxPixels: 40_000_000 });
  const output = normalized.body;
  const evaluation: Record<string, unknown> = { result: "unverified", vehicleFidelity: "manual_review_required", processing: "openai_sunburst_one_prompt", plateTreatment: item.batch.plateTreatment, plateVerification: "manual_review_required" };
  const key = `${item.batch.organizationId}/generated/${item.id}.png`; await storage.put(key, output, normalized.contentType);
  const providerCostUsd = batchProviderCostUsd(input.usage);
  await withRlsBypass(async (tx) => {
    const outputAsset = await tx.asset.upsert({ where: { objectKey: key }, update: { contentType: normalized.contentType, byteSize: output.length, checksum: normalized.checksum, width: normalized.width, height: normalized.height }, create: { organizationId: item.batch.organizationId, kind: "GENERATED", objectKey: key, contentType: normalized.contentType, byteSize: output.length, checksum: normalized.checksum, width: normalized.width, height: normalized.height } });
    const claimed = await tx.vehicleProcessingItem.updateMany({ where: { id: item.id, outputAssetId: null, status: { in: [VehicleProcessingItemStatus.QUEUED, VehicleProcessingItemStatus.SUBMITTED, VehicleProcessingItemStatus.PROCESSING, VehicleProcessingItemStatus.FAILED] } }, data: { status: VehicleProcessingItemStatus.NEEDS_REVIEW, outputAssetId: outputAsset.id, usage: input.usage as Prisma.InputJsonValue, evaluation: evaluation as Prisma.InputJsonValue, providerCostUsd, providerRequestId: input.requestId, errorMessage: null } });
    if (claimed.count) await tx.vehicleProcessingBatch.update({ where: { id: input.batchId }, data: { actualProviderCostUsd: { increment: providerCostUsd } } });
  });
}

export async function markBatchItemFailed(batchId: string, customId: string, message: string) { await withRlsBypass((tx) => tx.vehicleProcessingItem.updateMany({ where: { batchId, providerCustomId: customId, status: { notIn: [VehicleProcessingItemStatus.APPROVED, VehicleProcessingItemStatus.REJECTED] } }, data: { status: VehicleProcessingItemStatus.FAILED, errorMessage: message.slice(0, 1000) } })); }

export async function reviewBatchItem(organizationId: string, batchId: string, itemId: string, approved: boolean) {
  return withTenantDb(organizationId, async (tx) => {
    const item = await tx.vehicleProcessingItem.findFirst({ where: { id: itemId, batchId, batch: { organizationId } }, include: { batch: true } });
    if (!item) throw new Error("Result was not found.");
    const decision = await tx.vehicleProcessingItem.updateMany({ where: { id: item.id, status: VehicleProcessingItemStatus.NEEDS_REVIEW }, data: { status: approved ? VehicleProcessingItemStatus.APPROVED : VehicleProcessingItemStatus.REJECTED, approvedAt: approved ? new Date() : null } });
    if (!decision.count) throw new Error("Only results awaiting review can be decided.");
    if (approved) {
      const consumed = await tx.vehicleProcessingBatch.updateMany({ where: { id: batchId, entitlementConsumedAt: null }, data: { entitlementConsumedAt: new Date() } });
      if (consumed.count) await tx.pilotOrganizationEntitlement.update({ where: { organizationId: item.batch.organizationId }, data: { consumedVehicleBatches: { increment: 1 } } });
    }
    return tx.vehicleProcessingItem.findUniqueOrThrow({ where: { id: item.id } });
  });
}

export async function completeVehicleBatch(batchId: string) { return withRlsBypass((tx) => tx.vehicleProcessingBatch.update({ where: { id: batchId }, data: { status: VehicleProcessingBatchStatus.COMPLETED, completedAt: new Date() } })); }
export async function failVehicleBatch(batchId: string, error: unknown) {
  return withRlsBypass(async (tx) => {
    const batch = await tx.vehicleProcessingBatch.findUniqueOrThrow({ where: { id: batchId } });
    const failed = await tx.vehicleProcessingBatch.updateMany({ where: { id: batchId, entitlementReservedAt: { not: null }, entitlementConsumedAt: null, status: { notIn: [VehicleProcessingBatchStatus.COMPLETED, VehicleProcessingBatchStatus.CANCELED] } }, data: { status: VehicleProcessingBatchStatus.FAILED, entitlementReservedAt: null, errorMessage: error instanceof Error ? error.message.slice(0, 1000) : "Vehicle batch failed" } });
    if (failed.count) await tx.pilotOrganizationEntitlement.updateMany({ where: { organizationId: batch.organizationId, reservedVehicleBatches: { gt: 0 } }, data: { reservedVehicleBatches: { decrement: 1 } } });
    return tx.vehicleProcessingBatch.findUniqueOrThrow({ where: { id: batchId } });
  });
}
