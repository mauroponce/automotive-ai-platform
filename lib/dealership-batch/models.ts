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
  instructions: z.string().trim().max(2000).default(""),
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
// Verified against official OpenAI pricing on 2026-10-25. Never mutate historical cards.
export const BATCH_RATE_CARDS = {
  "sunburst-batch-2026-10-25": { model: "gpt-image-2.5-sunburst", imageInputPerMillion: 4, textInputPerMillion: 2.5, outputPerMillion: 15 },
} as const;
export const CURRENT_BATCH_RATE_CARD = "sunburst-batch-2026-10-25";
export function batchProviderCostUsd(usage: ImageUsage, version: keyof typeof BATCH_RATE_CARDS = CURRENT_BATCH_RATE_CARD) {
  const rate = BATCH_RATE_CARDS[version];
  if (!rate) throw new Error("Unknown rate card.");
  if ((usage.inputTokens === undefined && (usage.inputTokensDetails?.imageTokens === undefined || usage.inputTokensDetails?.textTokens === undefined)) || usage.outputTokens === undefined) return null;
  const imageInput = usage.inputTokensDetails?.imageTokens ?? usage.inputTokens!;
  const textInput = usage.inputTokensDetails?.textTokens ?? 0;
  if ([imageInput, textInput, usage.outputTokens].some((value) => !Number.isFinite(value) || value < 0)) return null;
  return (imageInput * rate.imageInputPerMillion + textInput * rate.textInputPerMillion + usage.outputTokens * rate.outputPerMillion) / 1_000_000;
}
export function pilotEconomicGate(deliveredImages: number, providerCostUsd: number, nonProviderCostUsd: number) {
  const total = providerCostUsd + nonProviderCostUsd;
  return { deliveredImages, totalCostUsd: total, perDeliveredImageUsd: deliveredImages ? total / deliveredImages : null, withinVehicleCap: total <= 1.2, withinProviderCap: providerCostUsd <= .9, withinPerImageCap: deliveredImages > 0 && total / deliveredImages <= .08 };
}
