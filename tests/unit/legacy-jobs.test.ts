import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/authorization", () => ({ requirePortalUser: vi.fn(), AuthorizationError: class extends Error {} }));
import { AuthorizationError, requirePortalUser } from "@/lib/authorization";
import { GET, POST } from "@/app/api/v1/jobs/route";
describe("retired in-memory job API", () => {
  beforeEach(() => vi.clearAllMocks());
  it("does not expose the API without authentication", async () => {
    vi.mocked(requirePortalUser).mockRejectedValue(new AuthorizationError());
    expect((await POST()).status).toBe(401);
  });
  it("never reports a nonpersistent job as queued, including demo mode", async () => {
    vi.mocked(requirePortalUser).mockResolvedValue({ id: "user" } as never);
    for (const handler of [GET, POST]) {
      const response = await handler();
      expect(response.status).toBe(503);
      expect(await response.json()).toMatchObject({ error: { code: "commercial_api_pending" } });
    }
  });
});
