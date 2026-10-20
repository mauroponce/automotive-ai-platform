import { describe, expect, it } from "vitest";
import { isTrialActive, trialEndsAt, TRIAL_DURATION_DAYS } from "@/lib/trial";

describe("organization trial", () => {
  it("lasts exactly fourteen 24-hour periods", () => {
    const startedAt = new Date("2026-10-01T23:30:00.000Z");

    expect(TRIAL_DURATION_DAYS).toBe(14);
    expect(trialEndsAt(startedAt)).toEqual(new Date("2026-10-15T23:30:00.000Z"));
  });

  it("is active until, but not including, the exact end instant", () => {
    const endsAt = new Date("2026-10-15T23:30:00.000Z");

    expect(isTrialActive(endsAt, new Date("2026-10-15T23:29:59.999Z"))).toBe(true);
    expect(isTrialActive(endsAt, endsAt)).toBe(false);
  });
});
