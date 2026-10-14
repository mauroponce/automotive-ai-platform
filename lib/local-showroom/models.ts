import { z } from "zod";

export const segmentationModelIds = ["u2netp-salient-object", "birefnet-general-lite"] as const;
export type SegmentationModelId = (typeof segmentationModelIds)[number];

export const showroomCompositionSchema = z.object({
  backgroundId: z.string().min(1),
  shadowEnabled: z.boolean().default(true),
  shadowIntensity: z.number().min(0).max(1).default(0.35),
});

export type ShowroomComposition = z.infer<typeof showroomCompositionSchema>;

export const showroomExperimentSchema = z.object({
  modelId: z.enum(segmentationModelIds),
  composition: showroomCompositionSchema.extend({ supportY: z.number().min(0).max(1), centerX: z.number().min(0).max(1), maxWidth: z.number().min(.1).max(1) }),
});
export type ShowroomExperiment = z.infer<typeof showroomExperimentSchema>;

export const selectionBoxSchema = z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1), width: z.number().positive().max(1), height: z.number().positive().max(1) }).superRefine((box, ctx) => { if (box.x + box.width > 1 || box.y + box.height > 1) ctx.addIssue({ code: "custom", message: "Selection must fit image bounds" }); });
