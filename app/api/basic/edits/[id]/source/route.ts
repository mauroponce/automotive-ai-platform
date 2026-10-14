import { AuthorizationError, requirePortalUser } from "@/lib/authorization";
import { getBasicEdit, readBasicEditSource } from "@/lib/basic-edit/storage";

export const runtime = "nodejs";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePortalUser(); const { id } = await params;
    const record = await getBasicEdit(id, user.id); if (!record) return new Response(null, { status: 404 });
    return new Response(await readBasicEditSource(record), { headers: { "content-type": record.sourceContentType, "cache-control": "private, no-store" } });
  } catch (error) { return new Response(null, { status: error instanceof AuthorizationError ? 401 : 404 }); }
}
