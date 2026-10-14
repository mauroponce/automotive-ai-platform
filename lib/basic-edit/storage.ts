import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const maxBytes = () => Number(process.env.BASIC_EDIT_MAX_BYTES ?? 20_000_000);
const maxPixels = () => Number(process.env.BASIC_EDIT_MAX_PIXELS ?? 24_000_000);
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const idPattern = /^[a-f0-9-]{36}$/;

export type BasicEditRecord = {
  id: string;
  ownerId: string;
  createdAt: string;
  sourceName: string;
  sourceContentType: "image/jpeg";
  width: number;
  height: number;
  outputCreatedAt?: string;
};

function storageRoot() {
  return path.resolve(/* turbopackIgnore: true */ process.env.BASIC_EDIT_STORAGE_ROOT ?? path.join(process.cwd(), "data", "basic-edit"));
}

function safeId(id: string) {
  if (!idPattern.test(id)) throw new Error("Invalid edit identifier.");
  return id;
}

function editDirectory(id: string) {
  return path.join(/* turbopackIgnore: true */ storageRoot(), safeId(id));
}

function recordPath(id: string) { return path.join(editDirectory(id), "record.json"); }
function sourcePath(id: string) { return path.join(editDirectory(id), "source.jpg"); }
function outputPath(id: string) { return path.join(editDirectory(id), "plate-blurred.jpg"); }

async function writeRecord(record: BasicEditRecord) {
  const target = recordPath(record.id);
  const temporary = `${target}.${randomUUID()}.tmp`;
  await writeFile(temporary, JSON.stringify(record), { mode: 0o600 });
  await rename(temporary, target);
}

function safeSourceName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "vehicle.jpg";
}

export async function createBasicEdit(ownerId: string, file: File) {
  if (!allowedTypes.has(file.type) || file.size > maxBytes()) throw new Error("Upload a JPG, PNG, or WebP image up to 20 MB.");
  const source = Buffer.from(await file.arrayBuffer());
  const image = sharp(source, { limitInputPixels: maxPixels(), failOn: "error" });
  const metadata = await image.metadata();
  if (!metadata.width || !metadata.height || metadata.width * metadata.height > maxPixels()) throw new Error("Image dimensions are not supported.");
  const normalized = await image.rotate().jpeg({ quality: 95, mozjpeg: true }).toBuffer();
  const normalizedMetadata = await sharp(normalized).metadata();
  if (!normalizedMetadata.width || !normalizedMetadata.height) throw new Error("Image could not be normalized.");
  const id = randomUUID();
  await mkdir(editDirectory(id), { recursive: true, mode: 0o700 });
  await writeFile(sourcePath(id), normalized, { mode: 0o600 });
  const record: BasicEditRecord = { id, ownerId, createdAt: new Date().toISOString(), sourceName: safeSourceName(file.name), sourceContentType: "image/jpeg", width: normalizedMetadata.width, height: normalizedMetadata.height };
  await writeRecord(record);
  return { record, source: normalized, checksum: createHash("sha256").update(normalized).digest("hex") };
}

export async function getBasicEdit(id: string, ownerId: string) {
  try {
    const record = JSON.parse(await readFile(recordPath(id), "utf8")) as BasicEditRecord;
    if (record.id !== id || record.ownerId !== ownerId) return null;
    return record;
  } catch { return null; }
}

export async function readBasicEditSource(record: BasicEditRecord) { return readFile(sourcePath(record.id)); }
export async function readBasicEditOutput(record: BasicEditRecord) { return readFile(outputPath(record.id)); }

export async function saveBasicEditOutput(record: BasicEditRecord, output: Buffer) {
  await writeFile(outputPath(record.id), output, { mode: 0o600 });
  const updated = { ...record, outputCreatedAt: new Date().toISOString() };
  await writeRecord(updated);
  return updated;
}
