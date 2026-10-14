import sharp from "sharp";
import { db } from "@/lib/db";
import { queue } from "@/lib/queue";
import { composeVehicle } from "@/lib/local-showroom/composition";
import { showroomExperimentSchema, type ShowroomExperiment } from "@/lib/local-showroom/models";
import { segmentVehicle } from "@/lib/local-showroom/vision";
import { plateLabStorage } from "@/lib/plate-lab/storage";

const maxBytes = () => Number(process.env.PLATE_LAB_MAX_BYTES ?? 20_000_000);
const maxPixels = () => Number(process.env.PLATE_LAB_MAX_PIXELS ?? 24_000_000);
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const extensions: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

async function normalize(file: File) {
  if (!allowedTypes.has(file.type) || file.size > maxBytes()) throw new Error("Unsupported or oversized image.");
  const source = Buffer.from(await file.arrayBuffer()); const image = sharp(source, { limitInputPixels: maxPixels(), failOn: "error" }); const metadata = await image.metadata();
  if (!metadata.width || !metadata.height || !metadata.format || metadata.width * metadata.height > maxPixels()) throw new Error("Invalid image content.");
  const contentType = metadata.format === "jpeg" ? "image/jpeg" : `image/${metadata.format}`;
  if (!allowedTypes.has(contentType)) throw new Error("Unsupported image content.");
  const normalized = await image.rotate().toBuffer();
  return { normalized, contentType, width: metadata.autoOrient.width ?? metadata.width, height: metadata.autoOrient.height ?? metadata.height };
}

export async function createShowroomLabExperiment(ownerId: string, input: unknown) {
  const configuration = showroomExperimentSchema.parse(input);
  return db.showroomLabExperiment.create({ data: { ownerId, configuration: configuration as object } });
}

export async function addShowroomLabImages(experimentId: string, files: File[]) {
  if (!files.length || files.length > 30) throw new Error("Upload between one and thirty images.");
  const rows = [];
  for (const file of files) { const data = await normalize(file); const stored = await plateLabStorage.put(experimentId, extensions[data.contentType], data.normalized); rows.push({ experimentId, originalName: file.name.replace(/[^a-zA-Z0-9._-]/g, "_"), artifactKey: stored.key, contentType: data.contentType, byteSize: data.normalized.length, width: data.width, height: data.height }); }
  return db.showroomLabImage.createManyAndReturn({ data: rows });
}

export async function addShowroomLabBackground(experimentId: string, file: File) {
  const data = await normalize(file); const stored = await plateLabStorage.put(experimentId, extensions[data.contentType], data.normalized);
  return db.showroomLabBackground.create({ data: { experimentId, originalName: file.name.replace(/[^a-zA-Z0-9._-]/g, "_"), artifactKey: stored.key, contentType: data.contentType, byteSize: data.normalized.length, width: data.width, height: data.height } });
}

export async function startShowroomLabExperiment(experimentId: string) {
  const experiment = await db.showroomLabExperiment.findUnique({ where: { id: experimentId }, include: { images: true, backgrounds: true } });
  if (!experiment || !experiment.images.length || !experiment.backgrounds.length) throw new Error("Experiment needs images and at least one background.");
  if (experiment.status !== "DRAFT" && experiment.status !== "FAILED") return experiment;
  const updated = await db.showroomLabExperiment.update({ where: { id: experimentId }, data: { status: "QUEUED", errorMessage: null } });
  const boss = await queue(); await boss.send("showroom-lab-experiment", { experimentId }, { singletonKey: experimentId, retryLimit: 0 });
  return updated;
}

export async function runShowroomLabExperiment(experimentId: string) {
  const experiment = await db.showroomLabExperiment.findUniqueOrThrow({ where: { id: experimentId }, include: { images: true, backgrounds: true } });
  const configuration: ShowroomExperiment = showroomExperimentSchema.parse(experiment.configuration);
  await db.showroomLabExperiment.update({ where: { id: experimentId }, data: { status: "PROCESSING", startedAt: new Date() } });
  try {
    const background = experiment.backgrounds[0]; const backgroundBuffer = await plateLabStorage.get(background.artifactKey);
    for (const image of experiment.images) {
      const source = await plateLabStorage.get(image.artifactKey); const segmentation = await segmentVehicle(source, configuration.modelId);
      const mask = await plateLabStorage.put(experimentId, "png", segmentation.mask);
      const output = await composeVehicle(source, segmentation.mask, backgroundBuffer, { shadowEnabled: configuration.composition.shadowEnabled, shadowIntensity: configuration.composition.shadowIntensity, supportY: Math.round(background.height * configuration.composition.supportY), centerX: Math.round(background.width * configuration.composition.centerX), maxWidth: Math.round(background.width * configuration.composition.maxWidth) });
      const composed = await plateLabStorage.put(experimentId, "png", output);
      await db.showroomLabRun.upsert({ where: { imageId_backgroundId_modelId: { imageId: image.id, backgroundId: background.id, modelId: configuration.modelId } }, update: { maskArtifactKey: mask.key, outputArtifactKey: composed.key, preprocessingMs: segmentation.preprocessingMs, inferenceMs: segmentation.inferenceMs, postprocessingMs: segmentation.postprocessingMs, warnings: segmentation.evaluationOnly ? ["evaluation_only_model"] : [] }, create: { imageId: image.id, backgroundId: background.id, modelId: configuration.modelId, maskArtifactKey: mask.key, outputArtifactKey: composed.key, preprocessingMs: segmentation.preprocessingMs, inferenceMs: segmentation.inferenceMs, postprocessingMs: segmentation.postprocessingMs, warnings: segmentation.evaluationOnly ? ["evaluation_only_model"] : [] } });
    }
    return db.showroomLabExperiment.update({ where: { id: experimentId }, data: { status: "COMPLETED", completedAt: new Date() } });
  } catch (error) { await db.showroomLabExperiment.update({ where: { id: experimentId }, data: { status: "FAILED", errorMessage: error instanceof Error ? error.message : "Experiment failed" } }); throw error; }
}
