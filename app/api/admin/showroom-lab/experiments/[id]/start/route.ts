import { requireSuperAdmin, AuthorizationError } from "@/lib/authorization";
import { db } from "@/lib/db";
import { startShowroomLabExperiment } from "@/lib/services/showroom-lab";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) { try { const admin = await requireSuperAdmin(); const { id } = await params; const owns = await db.showroomLabExperiment.findFirst({ where: { id, ownerId: admin.id }, select: { id: true } }); if (!owns) return Response.json({ error: { code: "not_found", message: "Experiment not found" } }, { status: 404 }); return Response.json({ data: await startShowroomLabExperiment(id) }, { status: 202 }); } catch (error) { if (error instanceof AuthorizationError) return Response.json({ error: { code: "forbidden", message: "Super admin access required" } }, { status: 403 }); return Response.json({ error: { code: "start_failed", message: error instanceof Error ? error.message : "Unknown error" } }, { status: 400 }); } }
