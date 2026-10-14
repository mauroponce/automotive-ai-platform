import { describe, expect, it } from "vitest";
import { showroomCompositionSchema, showroomExperimentSchema } from "@/lib/local-showroom/models";

describe("local showroom configuration", () => {
  it("accepts conservative shadow defaults and rejects out-of-range intensity", () => {
    expect(showroomCompositionSchema.parse({ backgroundId: "studio-white" })).toMatchObject({ shadowEnabled: true, shadowIntensity: .35 });
    expect(() => showroomCompositionSchema.parse({ backgroundId: "studio-white", shadowIntensity: 2 })).toThrow();
  });
  it("requires normalized placement metadata for a durable experiment", () => {
    expect(showroomExperimentSchema.parse({ modelId: "u2netp-salient-object", composition: { backgroundId: "studio-white", supportY: .8, centerX: .5, maxWidth: .7 } }).composition).toMatchObject({ supportY: .8, centerX: .5 });
    expect(() => showroomExperimentSchema.parse({ modelId: "u2netp-salient-object", composition: { backgroundId: "studio-white", supportY: 2, centerX: .5, maxWidth: .7 } })).toThrow();
  });
});
