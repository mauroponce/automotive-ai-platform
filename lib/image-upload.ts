import { createHash } from "node:crypto";
import sharp from "sharp";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export type NormalizedImageUpload = {
  body: Buffer;
  checksum: string;
  contentType: "image/jpeg" | "image/png" | "image/webp";
  width: number;
  height: number;
};

export async function normalizeImageUpload(file: File, limits: { maxBytes: number; maxPixels: number }): Promise<NormalizedImageUpload> {
  if (!allowedTypes.has(file.type) || file.size <= 0 || file.size > limits.maxBytes) throw new Error("Upload a JPG, PNG, or WebP image within the configured size limit.");
  const source = Buffer.from(await file.arrayBuffer());
  const image = sharp(source, { limitInputPixels: limits.maxPixels, failOn: "error" });
  const metadata = await image.metadata();
  const contentType = metadata.format === "jpeg" ? "image/jpeg" : metadata.format === "png" ? "image/png" : metadata.format === "webp" ? "image/webp" : null;
  const width = metadata.autoOrient.width ?? metadata.width;
  const height = metadata.autoOrient.height ?? metadata.height;
  if (!contentType || contentType !== file.type || !width || !height || width * height > limits.maxPixels) throw new Error("The uploaded file is not a valid supported image.");

  const rotated = image.rotate();
  const body = contentType === "image/jpeg"
    ? await rotated.jpeg({ quality: 95, mozjpeg: true }).toBuffer()
    : contentType === "image/png"
      ? await rotated.png().toBuffer()
      : await rotated.webp({ quality: 95 }).toBuffer();
  const outputMetadata = await sharp(body).metadata();
  if (!outputMetadata.width || !outputMetadata.height) throw new Error("The uploaded image could not be normalized.");
  return { body, checksum: createHash("sha256").update(body).digest("hex"), contentType, width: outputMetadata.width, height: outputMetadata.height };
}
