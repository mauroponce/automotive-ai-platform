import { z } from "zod";

export const PLATFORM_SHOWROOM_PRESET_IDS = ["studio-white-v1", "showroom-gray-v1", "showroom-dark-v1"] as const;
const assetId = z.string().cuid();

export const batchBackgroundSchema = z.discriminatedUnion("source", [
  z.object({ source: z.literal("platform_preset"), presetId: z.enum(PLATFORM_SHOWROOM_PRESET_IDS) }),
  z.object({ source: z.literal("organization_asset"), assetId }),
  z.object({ source: z.literal("batch_upload"), assetId }),
]);
export const batchCreateSchema = z.object({
  organizationId: z.string().cuid(),
  vehicleLabel: z.string().trim().min(1).max(120),
  sourceAssetIds: z.array(assetId).min(1).max(15).superRefine((ids, context) => { if (new Set(ids).size !== ids.length) context.addIssue({ code: "custom", message: "Each source image can appear only once." }); }),
  background: batchBackgroundSchema,
  plateTreatment: z.enum(["preserve", "blur", "hide", "registered_template"]),
  plateTemplateId: z.string().cuid().optional(),
  idempotencyKey: z.string().min(16).max(200),
}).superRefine((value, context) => {
  if (value.plateTreatment !== "preserve") {
    context.addIssue({ code: "custom", path: ["plateTreatment"], message: "Only preserve plate treatment is available in the current pilot." });
    return;
  }
  if (value.plateTemplateId) context.addIssue({ code: "custom", path: ["plateTemplateId"], message: "Plate templates are not available in the current pilot." });
});

export type ImageUsage = { inputTokens?: number; outputTokens?: number; inputTokensDetails?: { imageTokens?: number; textTokens?: number } };
export function batchProviderCostUsd(usage: ImageUsage) {
  const imageInput = usage.inputTokensDetails?.imageTokens ?? usage.inputTokens ?? 0;
  const textInput = usage.inputTokensDetails?.textTokens ?? 0;
  const output = usage.outputTokens ?? 0;
  return imageInput * 0.000004 + textInput * 0.0000025 + output * 0.000015;
}
export function pilotEconomicGate(deliveredImages: number, providerCostUsd: number, nonProviderCostUsd: number) {
  const total = providerCostUsd + nonProviderCostUsd;
  return { deliveredImages, totalCostUsd: total, perDeliveredImageUsd: deliveredImages ? total / deliveredImages : null, withinVehicleCap: total <= 1.2, withinProviderCap: providerCostUsd <= .9, withinPerImageCap: deliveredImages > 0 && total / deliveredImages <= .08 };
}
