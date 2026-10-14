import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { composeVehicle } from "@/lib/local-showroom/composition";

describe("local showroom composition", () => {
  it("keeps an alpha-masked vehicle and confines it to the configured floor", async () => {
    const vehicle = await sharp({ create: { width: 20, height: 20, channels: 3, background: "#d24b4b" } }).png().toBuffer();
    const mask = await sharp({ create: { width: 20, height: 20, channels: 3, background: "#ffffff" } }).greyscale().png().toBuffer();
    const background = await sharp({ create: { width: 100, height: 70, channels: 3, background: "#ffffff" } }).png().toBuffer();
    const output = await composeVehicle(vehicle, mask, background, { shadowEnabled: false, shadowIntensity: .3, supportY: 60, centerX: 50, maxWidth: 20 });
    const { data, info } = await sharp(output).raw().toBuffer({ resolveWithObject: true });
    const pixel = (50 * info.width + 50) * info.channels;
    expect([...data.subarray(pixel, pixel + 3)]).toEqual([210, 75, 75]);
  });

  it("uses the showroom target width even when the uploaded source is small", async () => {
    const vehicle = await sharp({ create: { width: 20, height: 20, channels: 3, background: "#d24b4b" } }).png().toBuffer();
    const mask = await sharp({ create: { width: 20, height: 20, channels: 3, background: "#ffffff" } }).greyscale().png().toBuffer();
    const background = await sharp({ create: { width: 100, height: 70, channels: 3, background: "#ffffff" } }).png().toBuffer();
    const output = await composeVehicle(vehicle, mask, background, { shadowEnabled: false, shadowIntensity: .3, supportY: 60, centerX: 50, maxWidth: 50 });
    const { data, info } = await sharp(output).raw().toBuffer({ resolveWithObject: true });
    const pixel = (20 * info.width + 27) * info.channels;
    expect([...data.subarray(pixel, pixel + 3)]).toEqual([210, 75, 75]);
  });
});
