import { AuthorizationError, requirePortalUser } from "@/lib/authorization";
import { detectBasicEditPlates } from "@/lib/basic-edit/detection";
import { createBasicEdit } from "@/lib/basic-edit/storage";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await requirePortalUser();
    const form = await request.formData();
    const image = form.get("image");
    if (!(image instanceof File)) throw new Error("Choose one vehicle image.");
    const created = await createBasicEdit(user.id, image);
    let detections: Awaited<ReturnType<typeof detectBasicEditPlates>> = { detections: [], warnings: [] };
    let detectionAvailable = true;
    try { detections = await detectBasicEditPlates(created.source); } catch { detectionAvailable = false; }
    return Response.json({ data: {
      id: created.record.id,
      sourceUrl: `/api/basic/edits/${created.record.id}/source`,
      detections: detections.detections,
      detectionAvailable,
      warnings: detections.warnings,
      modelStatus: "evaluation_only",
    } }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthorizationError) return Response.json({ error: { code: "authentication_required", message: "Sign in to edit images." } }, { status: 401 });
    return Response.json({ error: { code: "upload_failed", message: error instanceof Error ? error.message : "Unable to upload image." } }, { status: 400 });
  }
}
