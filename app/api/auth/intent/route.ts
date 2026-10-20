import { cookies } from "next/headers";
import { z } from "zod";

const schema = z.object({ intent: z.enum(["login", "registration"]) });

export async function POST(request: Request) {
  const input = schema.safeParse(await request.json().catch(() => null));
  if (!input.success) return Response.json({ error: { code: "validation_error", message: "Invalid authentication intent." } }, { status: 400 });

  (await cookies()).set("autoframe-auth-intent", input.data.intent, {
    httpOnly: true,
    maxAge: 10 * 60,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return new Response(null, { status: 204 });
}
