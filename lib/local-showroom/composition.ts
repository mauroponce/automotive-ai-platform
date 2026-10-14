import sharp from "sharp";

export type CompositionOptions = { shadowEnabled: boolean; shadowIntensity: number; supportY: number; centerX: number; maxWidth: number };

async function cropToMask(source: Buffer, alphaMask: Buffer) {
  const sourceMetadata = await sharp(source).metadata();
  const mask = sharp(alphaMask).removeAlpha().grayscale();
  const maskMetadata = await mask.metadata();
  if (!sourceMetadata.width || !sourceMetadata.height || sourceMetadata.width !== maskMetadata.width || sourceMetadata.height !== maskMetadata.height) throw new Error("Source and mask dimensions must match.");
  const { data, info } = await mask.raw().toBuffer({ resolveWithObject: true });
  let left = info.width, top = info.height, right = -1, bottom = -1;
  for (let y = 0; y < info.height; y += 1) for (let x = 0; x < info.width; x += 1) if (data[y * info.width + x] > 12) { left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y); }
  if (right < left || bottom < top) throw new Error("Segmentation mask is empty.");
  const padding = Math.max(2, Math.round(Math.max(right - left + 1, bottom - top + 1) * .012));
  const crop = { left: Math.max(0, left - padding), top: Math.max(0, top - padding), width: Math.min(info.width, right + padding + 1) - Math.max(0, left - padding), height: Math.min(info.height, bottom + padding + 1) - Math.max(0, top - padding) };
  return { vehicle: await sharp(source).extract(crop).png().toBuffer(), mask: await sharp(alphaMask).extract(crop).removeAlpha().grayscale().png().toBuffer() };
}

export async function composeVehicle(source: Buffer, alphaMask: Buffer, background: Buffer, options: CompositionOptions) {
  if (options.shadowIntensity < 0 || options.shadowIntensity > 1) throw new Error("Invalid shadow intensity.");
  const base = sharp(background).rotate(); const metadata = await base.metadata();
  if (!metadata.width || !metadata.height) throw new Error("Invalid background dimensions.");
  const cropped = await cropToMask(source, alphaMask);
  const width = Math.min(options.maxWidth, metadata.width);
  const mask = await sharp(cropped.mask).resize({ width }).png().toBuffer();
  const rendered = await sharp(cropped.vehicle).resize({ width }).joinChannel(mask).png().toBuffer();
  const renderedMetadata = await sharp(rendered).metadata(); if (!renderedMetadata.width || !renderedMetadata.height) throw new Error("Invalid vehicle composition.");
  const left = Math.max(0, Math.min(metadata.width - renderedMetadata.width, Math.round(options.centerX - renderedMetadata.width / 2)));
  const top = Math.max(0, Math.min(metadata.height - renderedMetadata.height, Math.round(options.supportY - renderedMetadata.height)));
  const overlays: Array<{ input: Buffer; left: number; top: number }> = [];
  if (options.shadowEnabled) {
    const shadowWidth = Math.max(8, Math.round(renderedMetadata.width * .86));
    const shadowHeight = Math.max(8, Math.round(renderedMetadata.height * .105));
    const shadowAlpha = await sharp(cropped.mask).resize({ width: shadowWidth, height: shadowHeight, fit: "fill" }).grayscale().linear(options.shadowIntensity).blur(Math.max(4, Math.round(shadowHeight * .28))).png().toBuffer();
    const shadow = await sharp({ create: { width: shadowWidth, height: shadowHeight, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite([{ input: shadowAlpha, blend: "dest-in" }]).png().toBuffer();
    overlays.push({ input: shadow, left: Math.max(0, Math.min(metadata.width - shadowWidth, left + Math.round((renderedMetadata.width - shadowWidth) / 2))), top: Math.min(metadata.height - shadowHeight, top + renderedMetadata.height - Math.round(shadowHeight * .56)) });
  }
  overlays.push({ input: rendered, left, top });
  return base.composite(overlays).png().toBuffer();
}
