import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/authorization", () => ({ currentPrincipal: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { organization: { create: vi.fn() } } }));

import { POST } from "@/app/api/auth/register/route";
import { currentPrincipal } from "@/lib/authorization";
import { db } from "@/lib/db";

const principal = {
  id: "user-1",
  email: "owner@example.com",
  name: "Owner",
  platformRole: "USER" as const,
  accounts: [{ provider: "google" }],
  memberships: [],
};

describe("Google registration", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requires an authenticated Google account", async () => {
    vi.mocked(currentPrincipal).mockResolvedValue(null);

    const response = await POST(new Request("http://localhost/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ organizationName: "North Motors" }),
    }));

    expect(response.status).toBe(401);
    expect(db.organization.create).not.toHaveBeenCalled();
  });

  it("creates an owner workspace with an exact fourteen-day trial", async () => {
    vi.mocked(currentPrincipal).mockResolvedValue(principal);
    vi.mocked(db.organization.create).mockResolvedValue({
      id: "organization-1",
      name: "North Motors",
      trialStartedAt: new Date(),
      trialEndsAt: new Date(),
    } as never);

    const response = await POST(new Request("http://localhost/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ organizationName: " North Motors " }),
    }));
    const create = vi.mocked(db.organization.create).mock.calls[0][0];
    const startedAt = create.data.trialStartedAt as Date;
    const endsAt = create.data.trialEndsAt as Date;

    expect(response.status).toBe(201);
    expect(create.data).toMatchObject({
      name: "North Motors",
      memberships: { create: { role: "OWNER", userId: "user-1" } },
    });
    expect(endsAt.getTime() - startedAt.getTime()).toBe(14 * 24 * 60 * 60 * 1_000);
  });
});
