import { describe, expect, it } from "vitest";
import { batchCreateSchema, batchProviderCostUsd, pilotEconomicGate } from "@/lib/dealership-batch/models";
import { buildPilotBatchPrompt } from "@/lib/dealership-batch/prompts";

const id = "cmh3qkvbp0000wti1b6gqv5ny";
describe("dealership batch models", () => {
  it("enforces the fifteen-photo vehicle cap and registered-template contract", () => {
    const input = { organizationId: id, vehicleLabel: "Vehicle", sourceAssetIds: Array.from({ length: 15 }, (_, index) => `${id.slice(0, -1)}${index.toString(36)}`), background: { source: "platform_preset", presetId: "studio-white-v1" }, plateTreatment: "registered_template", idempotencyKey: "a-secure-idempotency-key" };
    expect(() => batchCreateSchema.parse(input)).toThrow(/registered plate template/i);
    expect(() => batchCreateSchema.parse({ ...input, plateTreatment: "blur", sourceAssetIds: Array.from({ length: 16 }, () => id) })).toThrow();
  });
  it("uses the documented Batch token rates and flags the pilot economic gate", () => {
    expect(batchProviderCostUsd({ inputTokensDetails: { imageTokens: 10_000, textTokens: 1_000 }, outputTokens: 2_000 })).toBeCloseTo(.0725);
    expect(pilotEconomicGate(15, .9, .3)).toMatchObject({ withinVehicleCap: true, withinProviderCap: true, withinPerImageCap: true });
    expect(pilotEconomicGate(15, .91, .3).withinProviderCap).toBe(false);
  });
  it("keeps the automotive prompt constrained to background and conservative glass work", () => {
    const prompt = buildPilotBatchPrompt();
    expect(prompt).toContain("Preserve all vehicle pixels");
    expect(prompt).toContain("glass reflections");
    expect(prompt).toContain("masked background");
  });
});
