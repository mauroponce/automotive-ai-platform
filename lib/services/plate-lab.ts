import sharp from "sharp";
import { z } from "zod";
import { db } from "@/lib/db";
import { queue } from "@/lib/queue";
import { experimentConfigurationSchema, getPlateModel, normalizedBoxSchema, obfuscationSchema, type ExperimentConfiguration, type PlateDetection } from "@/lib/plate-lab/models";
import { plateLabStorage } from "@/lib/plate-lab/storage";
import { obfuscatePlates } from "@/lib/plate-lab/obfuscation";
import { scoreDetections } from "@/lib/plate-lab/metrics";

const maxBytes = () => Number(process.env.PLATE_LAB_MAX_BYTES ?? 20_000_000);
const maxPixels = () => Number(process.env.PLATE_LAB_MAX_PIXELS ?? 24_000_000);
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const extensions: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export async function createPlateLabExperiment(ownerId: string, input: unknown) {
  const configuration = experimentConfigurationSchema.parse(input);
  return db.plateLabExperiment.create({ data: { ownerId, configuration: configuration as object } });
}

export async function addPlateLabImages(experimentId: string, files: File[]) {
  if (!files.length || files.length > 30) throw new Error("Upload between one and thirty images.");
  const rows = [];
  for (const file of files) {
    if (!allowedTypes.has(file.type) || file.size > maxBytes()) throw new Error("Unsupported or oversized image.");
    const source = Buffer.from(await file.arrayBuffer());
    const image = sharp(source, { limitInputPixels: maxPixels(), failOn: "error" }); const metadata = await image.metadata();
    if (!metadata.width || !metadata.height || !metadata.format || !allowedTypes.has(`image/${metadata.format === "jpeg" ? "jpeg" : metadata.format}`)) throw new Error("Invalid image content.");
    if (metadata.width * metadata.height > maxPixels()) throw new Error("Image exceeds pixel limit.");
    const contentType = metadata.format === "jpeg" ? "image/jpeg" : `image/${metadata.format}`;
    const normalized = await image.rotate().toBuffer(); const stored = await plateLabStorage.put(experimentId, extensions[contentType], normalized);
    rows.push({ experimentId, originalName: file.name.replace(/[^a-zA-Z0-9._-]/g, "_"), artifactKey: stored.key, checksum: stored.checksum, contentType, byteSize: normalized.length, width: metadata.autoOrient.width ?? metadata.width, height: metadata.autoOrient.height ?? metadata.height });
  }
  return db.plateLabImage.createManyAndReturn({ data: rows });
}

export async function startPlateLabExperiment(experimentId: string) {
  const experiment = await db.plateLabExperiment.findUnique({ where: { id: experimentId }, include: { images: true } });
  if (!experiment || !experiment.images.length) throw new Error("Experiment has no images.");
  if (experiment.status !== "DRAFT" && experiment.status !== "FAILED") return experiment;
  const updated = await db.plateLabExperiment.update({ where: { id: experimentId }, data: { status: "QUEUED", errorMessage: null } });
  const boss = await queue(); await boss.send("plate-lab-experiment", { experimentId }, { singletonKey: experimentId, retryLimit: 0 });
  return updated;
}

export async function detectWithLocalService(input: { imageId: string; buffer: Buffer; configuration: ExperimentConfiguration; modelId: string }) {
  const started = Date.now(); const form = new FormData(); const body = new Uint8Array(input.buffer); form.set("image", new Blob([body], { type: "image/jpeg" }), "normalized.jpg"); form.set("modelId", input.modelId); form.set("threshold", String(input.configuration.threshold)); form.set("iouThreshold", String(input.configuration.iouThreshold)); form.set("strategy", input.configuration.strategy);
  const response = await fetch(`${process.env.PLATE_DETECTOR_URL ?? "http://plate-detector:8000"}/v1/detect`, { method: "POST", headers: { "x-plate-detector-token": process.env.PLATE_DETECTOR_SHARED_TOKEN ?? "" }, body: form, signal: AbortSignal.timeout(60_000) });
  if (!response.ok) throw new Error(`Detector ${input.modelId} failed: ${await response.text()}`);
  const result = await response.json() as { detections: PlateDetection[]; preprocessingMs: number; inferenceMs: number; postprocessingMs: number; warnings: string[] };
  await db.plateLabDetectionRun.upsert({ where: { imageId_modelId_strategy_threshold_iouThreshold: { imageId: input.imageId, modelId: input.modelId, strategy: input.configuration.strategy, threshold: input.configuration.threshold, iouThreshold: input.configuration.iouThreshold } }, update: { detections: result.detections, preprocessingMs: result.preprocessingMs, inferenceMs: result.inferenceMs, postprocessingMs: result.postprocessingMs, warnings: result.warnings }, create: { imageId: input.imageId, modelId: input.modelId, strategy: input.configuration.strategy, threshold: input.configuration.threshold, iouThreshold: input.configuration.iouThreshold, detections: result.detections, preprocessingMs: result.preprocessingMs, inferenceMs: result.inferenceMs, postprocessingMs: result.postprocessingMs, warnings: result.warnings } });
  return { ...result, elapsedMs: Date.now() - started };
}

export async function runPlateLabExperiment(experimentId: string) {
  const experiment = await db.plateLabExperiment.findUniqueOrThrow({ where: { id: experimentId }, include: { images: true } });
  const config = experimentConfigurationSchema.parse(experiment.configuration); await db.plateLabExperiment.update({ where: { id: experimentId }, data: { status: "PROCESSING", startedAt: new Date() } });
  try {
    for (const image of experiment.images) {
      const source = await plateLabStorage.get(image.artifactKey);
      for (const modelId of config.modelIds) { try { await detectWithLocalService({ imageId: image.id, buffer: source, configuration: config, modelId }); } catch (error) { await db.plateLabDetectionRun.create({ data: { imageId: image.id, modelId, strategy: config.strategy, threshold: config.threshold, iouThreshold: config.iouThreshold, detections: [], preprocessingMs: 0, inferenceMs: 0, postprocessingMs: 0, warnings: [], errorMessage: error instanceof Error ? error.message : "Detector failed" } }).catch(() => undefined); } }
      await db.plateLabImage.update({ where: { id: image.id }, data: { status: "completed" } });
    }
    await db.plateLabExperiment.update({ where: { id: experimentId }, data: { status: "COMPLETED", completedAt: new Date() } });
  } catch (error) { await db.plateLabExperiment.update({ where: { id: experimentId }, data: { status: "FAILED", errorMessage: error instanceof Error ? error.message : "Experiment failed" } }); throw error; }
}

export async function createPlateLabOutputs(experimentId: string, modelId: string, rawOptions: unknown) {
  const options = obfuscationSchema.parse(rawOptions); const experiment = await db.plateLabExperiment.findUniqueOrThrow({ where: { id: experimentId }, include: { images: { include: { detections: true } } } }); const config = experimentConfigurationSchema.parse(experiment.configuration);
  if (!config.modelIds.includes(modelId as never) || !getPlateModel(modelId)) throw new Error("Model is not part of this experiment.");
  const results = [];
  for (const image of experiment.images) {
    const detections = image.detections.find((run) => run.modelId === modelId)?.detections as unknown as PlateDetection[] | undefined;
    const source = await plateLabStorage.get(image.artifactKey); const filtered = (detections ?? []).filter((d) => d.confidence >= config.threshold).map((d) => d.box);
    const output = filtered.length ? (await obfuscatePlates(source, filtered, options)).buffer : source; const stored = await plateLabStorage.put(experimentId, image.contentType === "image/png" ? "png" : image.contentType === "image/webp" ? "webp" : "jpg", output);
    results.push(await db.plateLabOutput.create({ data: { imageId: image.id, modelId, method: options.method, marginPercent: options.marginPercent, artifactKey: stored.key, contentType: image.contentType, byteSize: output.length, detectionCount: filtered.length } }));
  }
  return results;
}

export async function saveAnnotation(experimentId: string, imageId: string, input: unknown) {
  const schema = z.object({ state: z.enum(["PENDING", "ANNOTATED", "NO_VISIBLE_PLATE"]), boxes: z.array(normalizedBoxSchema), tags: z.array(z.string().max(60)).max(20) });
  const value = schema.parse(input); const image = await db.plateLabImage.findFirst({ where: { id: imageId, experimentId } }); if (!image) throw new Error("Image not found.");
  const latest = await db.plateLabAnnotationRevision.aggregate({ where: { imageId }, _max: { revision: true } }); return db.plateLabAnnotationRevision.create({ data: { imageId, revision: (latest._max.revision ?? 0) + 1, state: value.state, boxes: value.boxes, tags: value.tags } });
}

export async function snapshotPlateLabMetrics(experimentId: string, modelId: string, iouThreshold = 0.5) {
  const images = await db.plateLabImage.findMany({ where: { experimentId }, include: { detections: { where: { modelId } }, annotationRevisions: { orderBy: { revision: "desc" }, take: 1 } } });
  let truePositives = 0; let falsePositives = 0; let falseNegatives = 0; let annotatedImages = 0; let allDetected = 0; const revisions: string[] = [];
  for (const image of images) { const annotation = image.annotationRevisions[0]; if (!annotation || annotation.state === "PENDING") continue; annotatedImages++; revisions.push(annotation.id); const prediction = image.detections[0]?.detections as unknown as PlateDetection[] | undefined; const result = scoreDetections((prediction ?? []).map((item) => item.box), annotation.boxes as never, iouThreshold); truePositives += result.truePositives; falsePositives += result.falsePositives; falseNegatives += result.falseNegatives; if (result.falseNegatives === 0) allDetected++; }
  const precision = truePositives + falsePositives ? truePositives / (truePositives + falsePositives) : null; const recall = truePositives + falseNegatives ? truePositives / (truePositives + falseNegatives) : null;
  const metrics = { modelId, iouThreshold, annotatedImages, truePositives, falsePositives, falseNegatives, precision, recall, f1: precision !== null && recall !== null && precision + recall ? 2 * precision * recall / (precision + recall) : null, allPlatesDetectedImageRate: annotatedImages ? allDetected / annotatedImages : null };
  return db.plateLabMetricSnapshot.create({ data: { experimentId, annotationRevisionIds: revisions, metrics } });
}
