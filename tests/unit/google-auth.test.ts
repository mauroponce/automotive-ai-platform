import { beforeEach, describe, expect, it, vi } from "vitest";

const cookieGet = vi.fn();
vi.mock("next/headers", () => ({ cookies: vi.fn(async () => ({ get: cookieGet })) }));
vi.mock("@/lib/db", () => ({ db: { user: { findFirst: vi.fn() } } }));

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

const callbackInput = {
  user: { id: "oauth-user", email: "owner@example.com" },
  account: { provider: "google", providerAccountId: "google-123" },
  profile: { email_verified: true },
};

describe("Google OAuth policy", () => {
  const signIn = authOptions.callbacks!.signIn!;

  beforeEach(() => vi.clearAllMocks());

  it("rejects unverified Google email addresses", async () => {
    expect(await signIn({ ...callbackInput, profile: { email_verified: false } } as never)).toBe(false);
  });

  it("allows a new identity only in the explicit registration flow", async () => {
    cookieGet.mockReturnValue({ value: "registration" });

    expect(await signIn(callbackInput as never)).toBe(true);
    expect(db.user.findFirst).not.toHaveBeenCalled();
  });

  it("rejects an unknown identity from the login flow", async () => {
    cookieGet.mockReturnValue({ value: "login" });
    vi.mocked(db.user.findFirst).mockResolvedValue(null);

    expect(await signIn(callbackInput as never)).toBe(false);
  });

  it("allows login for an existing account or preprovisioned verified email", async () => {
    cookieGet.mockReturnValue({ value: "login" });
    vi.mocked(db.user.findFirst).mockResolvedValue({ id: "user-1" } as never);

    expect(await signIn(callbackInput as never)).toBe(true);
  });
});
