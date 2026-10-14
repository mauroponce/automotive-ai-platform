import { AuthorizationError, requirePortalUser } from "@/lib/authorization";
import { getBasicEdit, readBasicEditOutput } from "@/lib/basic-edit/storage";

export const runtime = "nodejs";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePortalUser(); const { id } = await params;
    const record = await getBasicEdit(id, user.id); if (!record?.outputCreatedAt) return new Response(null, { status: 404 });
    return new Response(await readBasicEditOutput(record), { headers: { "content-type": "image/jpeg", "cache-control": "private, no-store" } });
  } catch (error) { return new Response(null, { status: error instanceof AuthorizationError ? 401 : 404 }); }
}
