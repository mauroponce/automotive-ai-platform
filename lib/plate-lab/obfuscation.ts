import sharp from "sharp";
import type { NormalizedBox, ObfuscationOptions } from "./models";

export function expandBox(box: NormalizedBox, marginPercent: number): NormalizedBox {
  const marginX = box.width * marginPercent / 100; const marginY = box.height * marginPercent / 100;
  const x = Math.max(0, box.x - marginX); const y = Math.max(0, box.y - marginY);
  return { x, y, width: Math.min(1 - x, box.width + marginX * 2), height: Math.min(1 - y, box.height + marginY * 2) };
}
export async function obfuscatePlates(source: Buffer, boxes: NormalizedBox[], options: ObfuscationOptions) {
  const normalized = await sharp(source, { limitInputPixels: 24_000_000 }).rotate().toBuffer();
  const metadata = await sharp(normalized).metadata(); if (!metadata.width || !metadata.height) throw new Error("Invalid image dimensions");
  let output = normalized;
  for (const original of boxes) {
    const box = expandBox(original, options.marginPercent); const left = Math.floor(box.x * metadata.width); const top = Math.floor(box.y * metadata.height);
    const width = Math.max(1, Math.ceil(box.width * metadata.width)); const height = Math.max(1, Math.ceil(box.height * metadata.height));
    const region = { left, top, width: Math.min(width, metadata.width - left), height: Math.min(height, metadata.height - top) };
    let overlay: Buffer;
    if (options.method === "blur") overlay = await sharp(output).extract(region).blur(options.intensity === "soft" ? 8 : options.intensity === "medium" ? 16 : 30).toBuffer();
    else if (options.method === "pixelate") { const factor = options.intensity === "soft" ? 0.35 : options.intensity === "medium" ? 0.18 : 0.08; overlay = await sharp(output).extract(region).resize(Math.max(1, Math.round(region.width * factor)), Math.max(1, Math.round(region.height * factor)), { kernel: "nearest" }).resize(region.width, region.height, { kernel: "nearest" }).toBuffer(); }
    else overlay = await sharp({ create: { width: region.width, height: region.height, channels: 4, background: options.coverColor === "white" ? "white" : options.coverColor === "black" ? "black" : "#737373" } }).png().toBuffer();
    output = await sharp(output).composite([{ input: overlay, left: region.left, top: region.top }]).toBuffer();
  }
  return { buffer: output, width: metadata.width, height: metadata.height };
}
