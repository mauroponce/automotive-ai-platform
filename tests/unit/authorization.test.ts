import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/db", () => ({ db: { user: { findUnique: vi.fn() } } }));
import { getServerSession } from "next-auth";
import { db } from "@/lib/db";
import { requireOrganizationMembership, requireSuperAdmin } from "@/lib/authorization";

const active = new Date(Date.now() + 86400000);
const expired = new Date(Date.now() - 1);
const principal = (platformRole = "USER", endsAt = active) => ({ id: "owner", email: "owner@example.test", platformRole, memberships: [{ organizationId: "organization-a", organization: { trialEndsAt: endsAt } }] });
describe("server role and organization authorization", () => {
  beforeEach(() => { vi.clearAllMocks(); vi.mocked(getServerSession).mockResolvedValue({ user: { email: "owner@example.test" } }); });
  it("blocks anonymous requests", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    await expect(requireOrganizationMembership("organization-a")).rejects.toMatchObject({ reason: "authentication_required" });
  });
  it("reloads membership from the database and rejects another organization", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue(principal() as never);
    await expect(requireOrganizationMembership("organization-a")).resolves.toMatchObject({ id: "owner" });
    await expect(requireOrganizationMembership("organization-b")).rejects.toMatchObject({ reason: "access_denied" });
    await expect(requireSuperAdmin()).rejects.toMatchObject({ reason: "access_denied" });
  });
  it("blocks expired trials even with a valid session", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue(principal("USER", expired) as never);
    await expect(requireOrganizationMembership("organization-a")).rejects.toMatchObject({ reason: "trial_expired" });
  });
  it("preserves explicit super admin access", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue(principal("SUPER_ADMIN", expired) as never);
    await expect(requireSuperAdmin()).resolves.toMatchObject({ platformRole: "SUPER_ADMIN" });
    await expect(requireOrganizationMembership("organization-b")).resolves.toMatchObject({ platformRole: "SUPER_ADMIN" });
  });
});
