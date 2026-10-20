import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { isTrialActive } from "@/lib/trial";

export type AuthorizationReason = "authentication_required" | "organization_required" | "trial_expired" | "access_denied";

export class AuthorizationError extends Error {
  constructor(public reason: AuthorizationReason = "access_denied", message = "Access denied") {
    super(message);
  }
}

export async function currentPrincipal() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  return db.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      email: true,
      name: true,
      platformRole: true,
      accounts: { select: { provider: true } },
      memberships: {
        select: {
          organizationId: true,
          organization: { select: { trialStartedAt: true, trialEndsAt: true } },
        },
      },
    },
  });
}

export async function requireAuthenticatedUser() {
  const user = await currentPrincipal();
  if (!user) throw new AuthorizationError("authentication_required", "Authentication required");
  return user;
}

export async function requireSuperAdmin() {
  const user = await requireAuthenticatedUser();
  if (user.platformRole !== "SUPER_ADMIN") throw new AuthorizationError();
  return user;
}

export async function requirePortalUser() {
  const user = await requireAuthenticatedUser();
  if (user.platformRole === "SUPER_ADMIN") return user;
  if (!user.memberships.length) throw new AuthorizationError("organization_required", "A dealership workspace is required");
  if (!user.memberships.some(({ organization }) => isTrialActive(organization.trialEndsAt))) throw new AuthorizationError("trial_expired", "The organization trial has ended");
  return user;
}

export async function requireOrganizationMembership(organizationId: string) {
  const user = await requirePortalUser();
  const membership = user.memberships.find((candidate) => candidate.organizationId === organizationId);
  if (user.platformRole !== "SUPER_ADMIN") {
    if (!membership) throw new AuthorizationError();
    if (!isTrialActive(membership.organization.trialEndsAt)) throw new AuthorizationError("trial_expired", "The organization trial has ended");
  }
  return user;
}

export async function requireSuperAdminPage() {
  try { return await requireSuperAdmin(); } catch { redirect("/login?error=access_denied"); }
}

export async function requirePortalPage() {
  try {
    return await requirePortalUser();
  } catch (error) {
    if (error instanceof AuthorizationError) {
      if (error.reason === "organization_required") redirect("/register");
      if (error.reason === "trial_expired") redirect("/trial-expired");
    }
    redirect("/login?error=authentication_required");
  }
}
