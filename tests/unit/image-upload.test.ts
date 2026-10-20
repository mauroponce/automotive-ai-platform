import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { normalizeImageUpload } from "@/lib/image-upload";

describe("image upload validation", () => {
  it("normalizes a valid image and records trusted metadata", async () => {
    const input = await sharp({ create: { width: 24, height: 12, channels: 3, background: "#336699" } }).png().toBuffer();
    const result = await normalizeImageUpload(new File([new Uint8Array(input)], "vehicle.png", { type: "image/png" }), { maxBytes: 1_000_000, maxPixels: 1_000 });
    expect(result).toMatchObject({ contentType: "image/png", width: 24, height: 12 });
    expect(result.checksum).toMatch(/^[a-f0-9]{64}$/);
  });

  it("rejects content that does not match its declared image type", async () => {
    const file = new File([new TextEncoder().encode("not an image")], "vehicle.png", { type: "image/png" });
    await expect(normalizeImageUpload(file, { maxBytes: 1_000_000, maxPixels: 1_000 })).rejects.toThrow();
  });
});
