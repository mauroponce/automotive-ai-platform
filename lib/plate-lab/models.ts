import { z } from "zod";

export const plateModelIds = [
  "yolo-v9-t-384-license-plate-end2end",
  "yolo-v9-t-512-license-plate-end2end",
  "yolo-v9-t-640-license-plate-end2end",
  "yolo-v9-s-608-license-plate-end2end",
  "opencv-classic",
] as const;
export type PlateModelId = (typeof plateModelIds)[number];

export type PlateModelDefinition = {
  id: PlateModelId;
  label: string;
  inputSize?: number;
  kind: "onnx" | "classic";
  productionApproved: false;
  licenseStatus: "evaluation_only" | "classic_local";
  source: string;
};

export const plateModels: PlateModelDefinition[] = [
  { id: "yolo-v9-t-384-license-plate-end2end", label: "YOLOv9 Tiny 384", inputSize: 384, kind: "onnx", productionApproved: false, licenseStatus: "evaluation_only", source: "open-image-models assets" },
  { id: "yolo-v9-t-512-license-plate-end2end", label: "YOLOv9 Tiny 512", inputSize: 512, kind: "onnx", productionApproved: false, licenseStatus: "evaluation_only", source: "open-image-models assets" },
  { id: "yolo-v9-t-640-license-plate-end2end", label: "YOLOv9 Tiny 640", inputSize: 640, kind: "onnx", productionApproved: false, licenseStatus: "evaluation_only", source: "open-image-models assets" },
  { id: "yolo-v9-s-608-license-plate-end2end", label: "YOLOv9 Small 608", inputSize: 608, kind: "onnx", productionApproved: false, licenseStatus: "evaluation_only", source: "open-image-models assets" },
  { id: "opencv-classic", label: "OpenCV classic baseline", kind: "classic", productionApproved: false, licenseStatus: "classic_local", source: "local heuristic pipeline" },
];

export const normalizedBoxSchema = z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1), width: z.number().positive().max(1), height: z.number().positive().max(1) }).superRefine((box, ctx) => {
  if (box.x + box.width > 1 || box.y + box.height > 1) ctx.addIssue({ code: "custom", message: "Box must fit normalized image bounds" });
});
export type NormalizedBox = z.infer<typeof normalizedBoxSchema>;
export const detectionSchema = z.object({ box: normalizedBoxSchema, confidence: z.number().min(0).max(1), modelId: z.enum(plateModelIds), className: z.literal("license_plate") });
export type PlateDetection = z.infer<typeof detectionSchema>;
export const experimentConfigurationSchema = z.object({
  modelIds: z.array(z.enum(plateModelIds)).min(1).max(5),
  threshold: z.number().min(0.01).max(0.99).default(0.25),
  iouThreshold: z.number().min(0.1).max(0.95).default(0.5),
  strategy: z.enum(["full_image", "high_precision", "tiles", "two_pass"]).default("full_image"),
  concurrency: z.union([z.literal(1), z.literal(2), z.literal(4)]).default(1),
});
export type ExperimentConfiguration = z.infer<typeof experimentConfigurationSchema>;
export const obfuscationSchema = z.object({ method: z.enum(["blur", "pixelate", "cover"]), intensity: z.enum(["soft", "medium", "strong"]).default("strong"), marginPercent: z.number().min(0).max(50).default(10), coverColor: z.enum(["white", "black", "gray"]).default("gray") });
export type ObfuscationOptions = z.infer<typeof obfuscationSchema>;

export function getPlateModel(id: string) { return plateModels.find((model) => model.id === id); }
