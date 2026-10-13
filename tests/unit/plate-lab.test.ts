import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { expandBox, obfuscatePlates } from "@/lib/plate-lab/obfuscation";
import { intersectionOverUnion, scoreDetections } from "@/lib/plate-lab/metrics";

describe("plate laboratory primitives", () => {
  it("clamps a safety margin inside normalized bounds", () => {
    expect(expandBox({ x: 0.9, y: 0.9, width: 0.1, height: 0.1 }, 15)).toEqual({ x: 0.885, y: 0.885, width: 0.11499999999999999, height: 0.11499999999999999 });
  });
  it("scores one-to-one detection matches", () => {
    const result = scoreDetections([{ x: 0.1, y: 0.1, width: 0.2, height: 0.1 }, { x: 0.7, y: 0.7, width: 0.1, height: 0.1 }], [{ x: 0.1, y: 0.1, width: 0.2, height: 0.1 }]);
    expect(result).toMatchObject({ truePositives: 1, falsePositives: 1, falseNegatives: 0, precision: 0.5, recall: 1 });
    expect(intersectionOverUnion({ x: 0, y: 0, width: 0.5, height: 0.5 }, { x: 0, y: 0, width: 0.5, height: 0.5 })).toBe(1);
  });
  it("changes only the selected plate region before encoding", async () => {
    const source = await sharp({ create: { width: 100, height: 60, channels: 3, background: "#d24b4b" } }).composite([{ input: await sharp({ create: { width: 30, height: 10, channels: 3, background: "#ffffff" } }).png().toBuffer(), left: 35, top: 25 }]).png().toBuffer();
    const output = await obfuscatePlates(source, [{ x: 0.35, y: 25 / 60, width: 0.3, height: 10 / 60 }], { method: "cover", intensity: "strong", marginPercent: 0, coverColor: "black" });
    const { data: pixels, info } = await sharp(output.buffer).raw().toBuffer({ resolveWithObject: true });
    const untouched = (5 * 100 + 5) * info.channels; const covered = (30 * 100 + 50) * info.channels;
    expect([...pixels.subarray(untouched, untouched + 3)]).toEqual([210, 75, 75]);
    expect([...pixels.subarray(covered, covered + 3)]).toEqual([0, 0, 0]);
  });
});
