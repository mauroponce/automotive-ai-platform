import { segmentationModelIds, selectionBoxSchema, type SegmentationModelId } from "./models";

const visionUrl = () => process.env.PLATE_DETECTOR_URL ?? "http://plate-detector:8000";

export type SegmentationResult = {
  mask: Buffer;
  modelId: SegmentationModelId;
  preprocessingMs: number;
  inferenceMs: number;
  postprocessingMs: number;
  evaluationOnly: boolean;
};

function metric(headers: Headers, key: string) {
  const value = Number(headers.get(key));
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(`Invalid vision metric: ${key}`);
  return value;
}

export async function segmentVehicle(source: Buffer, modelId: SegmentationModelId, selection?: unknown): Promise<SegmentationResult> {
  if (!segmentationModelIds.includes(modelId)) throw new Error("Unsupported segmentation model.");
  const form = new FormData();
  form.set("image", new Blob([new Uint8Array(source)], { type: "image/jpeg" }), "normalized.jpg");
  form.set("modelId", modelId);
  if (selection) { const box = selectionBoxSchema.parse(selection); form.set("x", String(box.x)); form.set("y", String(box.y)); form.set("width", String(box.width)); form.set("height", String(box.height)); }
  const response = await fetch(`${visionUrl()}/v1/segment`, {
    method: "POST",
    headers: { "x-plate-detector-token": process.env.PLATE_DETECTOR_SHARED_TOKEN ?? "" },
    body: form,
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok || response.headers.get("content-type") !== "image/png") throw new Error(`Segmenter ${modelId} failed: ${await response.text()}`);
  return {
    mask: Buffer.from(await response.arrayBuffer()), modelId,
    preprocessingMs: metric(response.headers, "x-vision-preprocessing-ms"),
    inferenceMs: metric(response.headers, "x-vision-inference-ms"),
    postprocessingMs: metric(response.headers, "x-vision-postprocessing-ms"),
    evaluationOnly: response.headers.get("x-vision-model-status") !== "approved",
  };
}
