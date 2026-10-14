"use client";

import * as ort from "onnxruntime-web";

export type BrowserPlateBox = { x: number; y: number; width: number; height: number; confidence: number };

const modelUrl = "/models/yolo-v9-t-512-license-plates-end2end.onnx";
let session: Promise<ort.InferenceSession> | undefined;

function getSession() {
  if (!session) {
    ort.env.wasm.wasmPaths = "/ort/";
    session = ort.InferenceSession.create(modelUrl, { executionProviders: ["webgpu", "wasm"] }).catch((error) => { session = undefined; throw error; });
  }
  return session;
}

export async function detectLicensePlatesInBrowser(source: HTMLImageElement): Promise<BrowserPlateBox[]> {
  const size = 512, ratio = Math.min(size / source.naturalWidth, size / source.naturalHeight);
  const width = Math.round(source.naturalWidth * ratio), height = Math.round(source.naturalHeight * ratio), padX = (size - width) / 2, padY = (size - height) / 2;
  const canvas = document.createElement("canvas"); canvas.width = canvas.height = size;
  const context = canvas.getContext("2d", { willReadFrequently: true }); if (!context) throw new Error("Canvas is not available.");
  context.fillStyle = "rgb(114,114,114)"; context.fillRect(0, 0, size, size); context.drawImage(source, 0, 0, source.naturalWidth, source.naturalHeight, padX, padY, width, height);
  const pixels = context.getImageData(0, 0, size, size).data, input = new Float32Array(3 * size * size);
  for (let index = 0; index < size * size; index += 1) { input[index] = pixels[index * 4] / 255; input[size * size + index] = pixels[index * 4 + 1] / 255; input[size * size * 2 + index] = pixels[index * 4 + 2] / 255; }
  const result = await (await getSession()).run({ images: new ort.Tensor("float32", input, [1, 3, size, size]) });
  const output = result.output0.data as Float32Array, boxes: BrowserPlateBox[] = [];
  // The end-to-end export returns [batch, x1, y1, x2, y2, class, confidence].
  for (let index = 0; index + 6 < output.length; index += 7) {
    const confidence = output[index + 6]; if (!Number.isFinite(confidence) || confidence < .25) continue;
    const x1 = clamp((output[index + 1] - padX) / width, 0, 1), y1 = clamp((output[index + 2] - padY) / height, 0, 1);
    const x2 = clamp((output[index + 3] - padX) / width, 0, 1), y2 = clamp((output[index + 4] - padY) / height, 0, 1);
    if (x2 - x1 > .01 && y2 - y1 > .01) boxes.push({ x: x1, y: y1, width: x2 - x1, height: y2 - y1, confidence });
  }
  return boxes;
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
