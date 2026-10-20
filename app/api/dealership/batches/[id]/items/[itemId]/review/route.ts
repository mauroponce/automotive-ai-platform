import { z } from "zod";
import { AuthorizationError, requireOrganizationMembership } from "@/lib/authorization";
import { withRlsBypass } from "@/lib/db";
import { reviewBatchItem } from "@/lib/dealership-batch/service";
const schema = z.object({ approved: z.boolean() });
export async function POST(request: Request, { params }: { params: Promise<{ id: string; itemId: string }> }) { try { const { id, itemId } = await params; const batch = await withRlsBypass((tx) => tx.vehicleProcessingBatch.findUnique({ where: { id } })); if (!batch) return Response.json({ error: { code: "not_found", message: "Vehicle batch not found." } }, { status: 404 }); await requireOrganizationMembership(batch.organizationId); return Response.json({ data: await reviewBatchItem(batch.organizationId, id, itemId, schema.parse(await request.json()).approved) }); } catch (error) { if (error instanceof AuthorizationError) return Response.json({ error: { code: "unauthorized", message: "Organization access is required." } }, { status: 401 }); return Response.json({ error: { code: "review_failed", message: error instanceof Error ? error.message : "Unable to record review." } }, { status: 400 }); } }
