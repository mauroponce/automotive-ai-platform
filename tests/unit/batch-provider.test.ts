import { afterEach, describe, expect, it, vi } from "vitest";
import { batchProviderCostUsd } from "@/lib/dealership-batch/models";
import { openAIBatchProvider } from "@/lib/dealership-batch/provider";

afterEach(() => vi.unstubAllEnvs());
describe("paid provider boundary", () => {
  it("does not allow trial access or a key to authorize spending", () => {
    vi.stubEnv("APP_DEMO_MODE", "true");
    vi.stubEnv("OPENAI_API_KEY", "test-key-never-used");
    vi.stubEnv("OPENAI_PAID_PROCESSING_ENABLED", "true");
    expect(() => openAIBatchProvider()).toThrow("explicit server authorization");
    vi.stubEnv("APP_DEMO_MODE", "false");
    vi.stubEnv("OPENAI_PAID_PROCESSING_ENABLED", "false");
    expect(() => openAIBatchProvider()).toThrow("explicit server authorization");
  });
  it("uses the frozen Batch rate card and does not call missing usage free", () => {
    expect(batchProviderCostUsd({})).toBeNull();
    expect(batchProviderCostUsd({ inputTokens: 1200, inputTokensDetails: { imageTokens: 1000, textTokens: 200 }, outputTokens: 100 })).toBeCloseTo(.006);
  });
});
