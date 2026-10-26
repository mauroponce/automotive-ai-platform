import { AuthorizationError, requirePortalUser } from "@/lib/authorization";
export const runtime = "nodejs";

async function unavailable() {
  try {
    await requirePortalUser();
    return Response.json({ error: { code: "commercial_api_pending", message: "The commercial API is pending. Use the authorized dealership batch workflow." } }, { status: 503 });
  } catch (error) {
    if (error instanceof AuthorizationError) return Response.json({ error: { code: "unauthorized", message: "Authentication required" } }, { status: 401 });
    throw error;
  }
}
export const GET = unavailable;
export const POST = unavailable;
