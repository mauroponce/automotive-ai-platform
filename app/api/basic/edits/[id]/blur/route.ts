import { AuthorizationError, requirePortalUser } from "@/lib/authorization";
import { basicBlurRequestSchema } from "@/lib/basic-edit/models";
import { getBasicEdit, readBasicEditSource, saveBasicEditOutput } from "@/lib/basic-edit/storage";
import { obfuscatePlates } from "@/lib/plate-lab/obfuscation";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePortalUser(); const { id } = await params;
    const record = await getBasicEdit(id, user.id); if (!record) return Response.json({ error: { code: "not_found", message: "Image not found." } }, { status: 404 });
    const { boxes } = basicBlurRequestSchema.parse(await request.json());
    const source = await readBasicEditSource(record);
    const result = await obfuscatePlates(source, boxes, { method: "blur", intensity: "strong", marginPercent: 8, coverColor: "black" });
    await saveBasicEditOutput(record, result.buffer);
    return Response.json({ data: { outputUrl: `/api/basic/edits/${id}/output`, downloadUrl: `/api/basic/edits/${id}/download` } });
  } catch (error) {
    if (error instanceof AuthorizationError) return Response.json({ error: { code: "authentication_required", message: "Sign in to edit images." } }, { status: 401 });
    return Response.json({ error: { code: "blur_failed", message: error instanceof Error ? error.message : "Unable to blur the selected plates." } }, { status: 400 });
  }
}
