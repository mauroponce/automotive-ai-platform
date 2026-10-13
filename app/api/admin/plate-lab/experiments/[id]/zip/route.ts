import * as archiverModule from "archiver";
import { PassThrough } from "node:stream";
import { AuthorizationError, requireSuperAdmin } from "@/lib/authorization";
import { db } from "@/lib/db";
import { plateLabStorage } from "@/lib/plate-lab/storage";

async function archiveOutputs(outputs: Array<{ artifactKey: string; originalName: string; modelId: string; detectionCount: number }>) {
  const stream = new PassThrough(); const chunks: Buffer[] = []; stream.on("data", (chunk: Buffer) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve, reject) => { stream.on("end", () => resolve(Buffer.concat(chunks))); stream.on("error", reject); });
  const ZipArchive = (archiverModule as unknown as { ZipArchive: new (options: { zlib: { level: number } }) => { on(event: string, listener: (error: Error) => void): void; pipe(destination: PassThrough): void; append(source: Buffer | string, options: { name: string }): void; finalize(): Promise<void> } }).ZipArchive;
  const archive = new ZipArchive({ zlib: { level: 8 } }); archive.on("error", (error: Error) => stream.destroy(error)); archive.pipe(stream);
  const manifest = [];
  for (const [index, output] of outputs.entries()) { const safeName = output.originalName.replace(/[^a-zA-Z0-9._-]/g, "_"); const name = `${String(index + 1).padStart(2, "0")}-${output.modelId}-${safeName}`; archive.append(await plateLabStorage.get(output.artifactKey), { name }); manifest.push({ name, modelId: output.modelId, detectionCount: output.detectionCount, verification: output.detectionCount ? "detected_regions_obfuscated" : "no_detections_unverified" }); }
  archive.append(JSON.stringify({ files: manifest }, null, 2), { name: "manifest.json" }); await archive.finalize(); return done;
}
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) { try { const admin = await requireSuperAdmin(); const { id } = await params; const experiment = await db.plateLabExperiment.findFirst({ where: { id, ownerId: admin.id }, include: { images: { include: { outputs: { orderBy: { createdAt: "desc" }, take: 1 } } } } }); if (!experiment) return new Response(null, { status: 404 }); const outputs = experiment.images.flatMap((image) => image.outputs.map((output) => ({ ...output, originalName: image.originalName }))); if (!outputs.length) return Response.json({ error: { code: "no_outputs", message: "No blurred outputs available" } }, { status: 409 }); const archive = await archiveOutputs(outputs); return new Response(new Uint8Array(archive), { headers: { "content-type": "application/zip", "content-disposition": `attachment; filename="plate-lab-${id}.zip"` } }); } catch (error) { if (error instanceof AuthorizationError) return new Response(null, { status: 403 }); return Response.json({ error: { code: "zip_failed", message: error instanceof Error ? error.message : "Unknown error" } }, { status: 500 }); } }
