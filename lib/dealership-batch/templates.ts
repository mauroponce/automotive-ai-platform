import sharp from "sharp";
import { expandBox } from "@/lib/plate-lab/obfuscation";
import type { NormalizedBox } from "@/lib/plate-lab/models";

export async function applyRegisteredPlateTemplate(source: Buffer, template: Buffer, boxes: NormalizedBox[]) {
  const normalized = await sharp(source, { limitInputPixels: 24_000_000 }).rotate().toBuffer();
  const metadata = await sharp(normalized).metadata();
  if (!metadata.width || !metadata.height) throw new Error("Invalid generated image dimensions.");
  const composites = await Promise.all(boxes.map(async (original) => {
    const box = expandBox(original, 4); const left = Math.floor(box.x * metadata.width); const top = Math.floor(box.y * metadata.height);
    const width = Math.max(1, Math.min(Math.ceil(box.width * metadata.width), metadata.width - left)); const height = Math.max(1, Math.min(Math.ceil(box.height * metadata.height), metadata.height - top));
    return { input: await sharp(template).resize(width, height, { fit: "fill" }).png().toBuffer(), left, top };
  }));
  return sharp(normalized).composite(composites).png().toBuffer();
}
