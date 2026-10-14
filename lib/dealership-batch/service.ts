import { randomUUID } from "node:crypto";
import { AssetKind, Prisma, VehicleBackgroundSource, VehiclePlateTreatment, VehicleProcessingBatchStatus, VehicleProcessingItemStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { storage } from "@/lib/storage";
import { batchCreateSchema, batchProviderCostUsd, type ImageUsage } from "./models";
import { buildPilotBatchPrompt } from "./prompts";

const presetPaths: Record<string, string> = { "studio-white-v1": "/showrooms/studio-white-v1.png", "showroom-gray-v1": "/showrooms/showroom-gray-v1.png", "showroom-dark-v1": "/showrooms/showroom-dark-v1.png" };
const assetKinds = new Set<AssetKind>([AssetKind.VEHICLE, AssetKind.SHOWROOM, AssetKind.LOGO]);

export async function uploadOrganizationAsset(organizationId: string, kind: AssetKind, file: File) {
  if (!assetKinds.has(kind)) throw new Error("Unsupported pilot asset kind.");
  if (!new Set(["image/jpeg", "image/png", "image/webp"]).has(file.type) || file.size > 20_000_000) throw new Error("Upload a JPG, PNG, or WebP image up to 20 MB.");
  const body = Buffer.from(await file.arrayBuffer()); const key = `${organizationId}/${kind.toLowerCase()}/${randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100)}`;
  await storage.put(key, body, file.type);
  return db.asset.create({ data: { organizationId, kind, objectKey: key, contentType: file.type, byteSize: body.length } });
}

export async function createRegisteredPlateTemplate(organizationId: string, name: string, assetId: string) {
  const asset = await db.asset.findFirst({ where: { id: assetId, organizationId, kind: "LOGO" } });
  if (!asset) throw new Error("Registered plate template asset was not found.");
  return db.registeredPlateTemplate.create({ data: { organizationId, assetId, name: name.trim().slice(0, 120) || "Plate cover" } });
}

export async function createVehicleProcessingBatch(input: unknown) {
  const value = batchCreateSchema.parse(input);
  const existing = await db.vehicleProcessingBatch.findUnique({ where: { organizationId_idempotencyKey: { organizationId: value.organizationId, idempotencyKey: value.idempotencyKey } }, include: { items: true } });
  if (existing) return existing;
  const sourceAssets = await db.asset.findMany({ where: { id: { in: value.sourceAssetIds }, organizationId: value.organizationId, kind: "VEHICLE" } });
  if (sourceAssets.length !== value.sourceAssetIds.length) throw new Error("Every source image must be a vehicle asset owned by this dealership.");
  let backgroundAssetId: string | undefined; let backgroundSnapshot: object;
  if (value.background.source === "platform_preset") backgroundSnapshot = { source: value.background.source, presetId: value.background.presetId, publicPath: presetPaths[value.background.presetId] };
  else {
    const background = await db.asset.findFirst({ where: { id: value.background.assetId, organizationId: value.organizationId, kind: "SHOWROOM" } });
    if (!background) throw new Error("The selected showroom background was not found.");
    backgroundAssetId = background.id; backgroundSnapshot = { source: value.background.source, assetId: background.id, objectKey: background.objectKey, contentType: background.contentType };
  }
  if (value.plateTreatment === "registered_template") { const template = await db.registeredPlateTemplate.findFirst({ where: { id: value.plateTemplateId, organizationId: value.organizationId } }); if (!template) throw new Error("The selected registered plate template was not found."); }
  const now = new Date();
  return db.$transaction(async (tx) => {
    const entitlement = await tx.pilotOrganizationEntitlement.findUnique({ where: { organizationId: value.organizationId } });
    if (!entitlement || entitlement.grantedVehicleBatches - entitlement.reservedVehicleBatches <= 0) throw new Error("This dealership has no manually provisioned pilot batch entitlement.");
    await tx.pilotOrganizationEntitlement.update({ where: { organizationId: value.organizationId }, data: { reservedVehicleBatches: { increment: 1 } } });
    return tx.vehicleProcessingBatch.create({ data: {
      organizationId: value.organizationId, vehicleLabel: value.vehicleLabel, idempotencyKey: value.idempotencyKey,
      backgroundSource: value.background.source === "platform_preset" ? VehicleBackgroundSource.PLATFORM_PRESET : value.background.source === "organization_asset" ? VehicleBackgroundSource.ORGANIZATION_ASSET : VehicleBackgroundSource.BATCH_UPLOAD,
      backgroundAssetId, backgroundSnapshot, plateTreatment: value.plateTreatment === "blur" ? VehiclePlateTreatment.BLUR : value.plateTreatment === "hide" ? VehiclePlateTreatment.HIDE : VehiclePlateTreatment.REGISTERED_TEMPLATE, plateTemplateId: value.plateTemplateId, configuration: { model: "gpt-image-2.5-sunburst", delivery: "batch_24h", output: "1600x1200", reviewRequired: true, onePromptPerImage: true }, entitlementReservedAt: now,
      items: { create: sourceAssets.map((asset) => ({ sourceAssetId: asset.id, providerCustomId: randomUUID(), promptSnapshot: buildPilotBatchPrompt() })) },
    }, include: { items: true } });
  });
}

export async function queueVehicleProcessingBatch(batchId: string) {
  const batch = await db.vehicleProcessingBatch.findUnique({ where: { id: batchId } });
  if (!batch) throw new Error("Vehicle batch not found.");
  if (batch.status !== VehicleProcessingBatchStatus.DRAFT && batch.status !== VehicleProcessingBatchStatus.FAILED) return batch;
  return db.vehicleProcessingBatch.update({ where: { id: batchId }, data: { status: VehicleProcessingBatchStatus.QUEUED, errorMessage: null } });
}

export async function batchInputUrls(batchId: string) {
  const batch = await db.vehicleProcessingBatch.findUniqueOrThrow({ where: { id: batchId }, include: { items: { include: { sourceAsset: true } }, backgroundAsset: true } });
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
  await db.vehicleProcessingBatch.update({ where: { id: batchId }, data: { status: VehicleProcessingBatchStatus.PROCESSING, providerBatchId, providerInputFileId, startedAt: new Date() } });
  await db.vehicleProcessingItem.updateMany({ where: { batchId, status: VehicleProcessingItemStatus.QUEUED }, data: { status: VehicleProcessingItemStatus.SUBMITTED } });
}

export async function storeBatchItemResult(input: { batchId: string; customId: string; output: Buffer; contentType: string; usage: ImageUsage; requestId?: string }) {
  const item = await db.vehicleProcessingItem.findFirst({ where: { batchId: input.batchId, providerCustomId: input.customId }, include: { batch: true } });
  if (!item || item.status === VehicleProcessingItemStatus.NEEDS_REVIEW || item.status === VehicleProcessingItemStatus.APPROVED) return;
  const output = input.output;
  const evaluation: Record<string, unknown> = { result: "unverified", vehicleFidelity: "manual_review_required", processing: "openai_sunburst_one_prompt", plateTreatment: item.batch.plateTreatment, plateVerification: "manual_review_required" };
  const key = `${item.batch.organizationId}/generated/${item.id}.png`; await storage.put(key, output, "image/png");
  const outputAsset = await db.asset.create({ data: { organizationId: item.batch.organizationId, kind: "GENERATED", objectKey: key, contentType: "image/png", byteSize: output.length } });
  const providerCostUsd = batchProviderCostUsd(input.usage);
  await db.$transaction([
    db.vehicleProcessingItem.update({ where: { id: item.id }, data: { status: VehicleProcessingItemStatus.NEEDS_REVIEW, outputAssetId: outputAsset.id, usage: input.usage as Prisma.InputJsonValue, evaluation: evaluation as Prisma.InputJsonValue, providerCostUsd, providerRequestId: input.requestId } }),
    db.vehicleProcessingBatch.update({ where: { id: input.batchId }, data: { actualProviderCostUsd: { increment: providerCostUsd } } }),
  ]);
}

export async function markBatchItemFailed(batchId: string, customId: string, message: string) { await db.vehicleProcessingItem.updateMany({ where: { batchId, providerCustomId: customId, status: { notIn: [VehicleProcessingItemStatus.APPROVED, VehicleProcessingItemStatus.REJECTED] } }, data: { status: VehicleProcessingItemStatus.FAILED, errorMessage: message.slice(0, 1000) } }); }

export async function reviewBatchItem(batchId: string, itemId: string, approved: boolean) {
  const item = await db.vehicleProcessingItem.findFirst({ where: { id: itemId, batchId }, include: { batch: true } });
  if (!item || item.status !== VehicleProcessingItemStatus.NEEDS_REVIEW) throw new Error("Only results awaiting review can be decided.");
  const updated = await db.vehicleProcessingItem.update({ where: { id: item.id }, data: { status: approved ? VehicleProcessingItemStatus.APPROVED : VehicleProcessingItemStatus.REJECTED, approvedAt: approved ? new Date() : null } });
  if (approved && !item.batch.entitlementConsumedAt) {
    await db.$transaction(async (tx) => {
      const current = await tx.vehicleProcessingBatch.findUniqueOrThrow({ where: { id: batchId } });
      if (current.entitlementConsumedAt) return;
      await tx.vehicleProcessingBatch.update({ where: { id: batchId }, data: { entitlementConsumedAt: new Date() } });
      await tx.pilotOrganizationEntitlement.update({ where: { organizationId: current.organizationId }, data: { consumedVehicleBatches: { increment: 1 } } });
    });
  }
  return updated;
}

export async function completeVehicleBatch(batchId: string) { return db.vehicleProcessingBatch.update({ where: { id: batchId }, data: { status: VehicleProcessingBatchStatus.COMPLETED, completedAt: new Date() } }); }
export async function failVehicleBatch(batchId: string, error: unknown) {
  return db.$transaction(async (tx) => {
    const batch = await tx.vehicleProcessingBatch.findUniqueOrThrow({ where: { id: batchId } });
    if (batch.entitlementReservedAt && !batch.entitlementConsumedAt) await tx.pilotOrganizationEntitlement.update({ where: { organizationId: batch.organizationId }, data: { reservedVehicleBatches: { decrement: 1 } } });
    return tx.vehicleProcessingBatch.update({ where: { id: batchId }, data: { status: VehicleProcessingBatchStatus.FAILED, entitlementReservedAt: null, errorMessage: error instanceof Error ? error.message.slice(0, 1000) : "Vehicle batch failed" } });
  });
}
