import { AuthorizationError, requireOrganizationMembership } from "@/lib/authorization";
import { db } from "@/lib/db";
import { storage } from "@/lib/storage";
export const runtime = "nodejs";
export async function GET(_: Request, { params }: { params: Promise<{ id: string; itemId: string }> }) { try { const { id, itemId } = await params; const item = await db.vehicleProcessingItem.findFirst({ where: { id: itemId, batchId: id }, include: { batch: true, outputAsset: true } }); if (!item?.outputAsset) return new Response(null, { status: 404 }); await requireOrganizationMembership(item.batch.organizationId); return new Response(await storage.get(item.outputAsset.objectKey), { headers: { "content-type": item.outputAsset.contentType, "cache-control": "private, no-store" } }); } catch (error) { return new Response(null, { status: error instanceof AuthorizationError ? 401 : 404 }); } }
