import { z } from "zod";
import { currentPrincipal } from "@/lib/authorization";
import { db } from "@/lib/db";
import { trialEndsAt } from "@/lib/trial";

const schema = z.object({ organizationName: z.string().trim().min(2).max(120) });

export async function POST(request: Request) {
  const user = await currentPrincipal();
  if (!user) return Response.json({ error: { code: "authentication_required", message: "Sign up with Google first." } }, { status: 401 });
  if (!user.accounts.some(({ provider }) => provider === "google")) return Response.json({ error: { code: "google_account_required", message: "A verified Google account is required." } }, { status: 403 });
  if (user.memberships.length) return Response.json({ error: { code: "organization_exists", message: "This account already belongs to a dealership." } }, { status: 409 });

  const input = schema.safeParse(await request.json().catch(() => null));
  if (!input.success) return Response.json({ error: { code: "validation_error", message: "Enter a dealership name between 2 and 120 characters." } }, { status: 400 });

  const trialStartedAt = new Date();
  try {
    const organization = await db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${user.id}))`;
      const existingMembership = await tx.membership.findFirst({ where: { userId: user.id }, select: { userId: true } });
      if (existingMembership) throw new Error("This account already belongs to a dealership.");
      return tx.organization.create({
        data: {
          name: input.data.organizationName,
          trialStartedAt,
          trialEndsAt: trialEndsAt(trialStartedAt),
          memberships: { create: { role: "OWNER", userId: user.id } },
        },
      });
    });
    return Response.json({ data: { organizationId: organization.id, trialEndsAt: organization.trialEndsAt } }, { status: 201 });
  } catch {
    return Response.json({ error: { code: "registration_conflict", message: "Unable to create this dealership workspace." } }, { status: 409 });
  }
}
