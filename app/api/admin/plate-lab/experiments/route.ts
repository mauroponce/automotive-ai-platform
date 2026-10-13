import { z } from "zod";
import { AuthorizationError, requireSuperAdmin } from "@/lib/authorization";
import { createPlateLabExperiment } from "@/lib/services/plate-lab";

export const runtime = "nodejs";
export async function POST(request: Request) { try { const admin = await requireSuperAdmin(); const experiment = await createPlateLabExperiment(admin.id, await request.json()); return Response.json({ data: experiment }, { status: 201 }); } catch (error) { if (error instanceof AuthorizationError) return Response.json({ error: { code: "forbidden", message: "Super admin access required" } }, { status: 403 }); if (error instanceof z.ZodError) return Response.json({ error: { code: "validation_error", message: error.message } }, { status: 400 }); return Response.json({ error: { code: "experiment_create_failed", message: error instanceof Error ? error.message : "Unknown error" } }, { status: 500 }); } }
