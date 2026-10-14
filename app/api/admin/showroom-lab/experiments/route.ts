import { requireSuperAdmin, AuthorizationError } from "@/lib/authorization";
import { createShowroomLabExperiment } from "@/lib/services/showroom-lab";
import { ZodError } from "zod";

export async function POST(request: Request) { try { const admin = await requireSuperAdmin(); return Response.json({ data: await createShowroomLabExperiment(admin.id, await request.json()) }, { status: 201 }); } catch (error) { if (error instanceof AuthorizationError) return Response.json({ error: { code: "forbidden", message: "Super admin access required" } }, { status: 403 }); if (error instanceof ZodError) return Response.json({ error: { code: "validation_error", message: error.message } }, { status: 400 }); return Response.json({ error: { code: "experiment_create_failed", message: error instanceof Error ? error.message : "Unknown error" } }, { status: 500 }); } }
