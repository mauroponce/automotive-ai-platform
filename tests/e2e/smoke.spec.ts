import { test, expect } from "@playwright/test";
import sharp from "sharp";

test("anonymous plate blur uses real local ONNX, editable Canvas regions and local download", async ({ page }) => {
  const requests: Array<{ url: string; method: string }> = [];
  const assets: string[] = [];
  page.on("request", (request) => requests.push({ url: request.url(), method: request.method() }));
  page.on("response", (response) => { if (response.ok()) assets.push(response.url()); });
  await page.goto("/en/tools/blur-license-plate");
  // Authorized synthetic fixture, never a provider response or a detector mock.
  const svg = '<svg width="800" height="600"><rect width="800" height="600" fill="#888"/><rect x="300" y="350" width="200" height="80" fill="white"/><text x="310" y="405" font-size="55" fill="black">AB123</text></svg>';
  const source = await sharp(Buffer.from(svg)).png().toBuffer();
  await page.locator('input[type="file"]').setInputFiles({ name: "synthetic-plate.png", mimeType: "image/png", buffer: source });
  await expect(page.getByRole("button", { name: "Mark", exact: true })).toBeVisible({ timeout: 90000 });
  await expect(page.locator(".mf-processing")).toHaveCount(0, { timeout: 90000 });
  expect(assets.some((url) => url.includes("/models/") && url.endsWith(".onnx"))).toBe(true);
  expect(assets.some((url) => url.includes("/ort/") && url.endsWith(".wasm"))).toBe(true);
  await expect(page.getByText("Automatic detection could not start", { exact: false })).toHaveCount(0);
  await page.getByRole("button", { name: "Clear all marks" }).click({ force: true });
  const viewport = page.locator(".mf-viewport");
  const bounds = await viewport.boundingBox();
  expect(bounds).not.toBeNull();
  const box = bounds!;
  await page.mouse.move(box.x + box.width * .32, box.y + box.height * .48);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * .68, box.y + box.height * .72, { steps: 10 });
  await page.mouse.up();
  await expect(page.locator(".mf-region")).toHaveCount(1);
  await page.locator(".mf-region").click();
  const handle = await page.getByRole("button", { name: "Resize selection from se" }).boundingBox();
  await page.mouse.move(handle!.x + handle!.width / 2, handle!.y + handle!.height / 2);
  await page.mouse.down(); await page.mouse.move(handle!.x + 20, handle!.y + 15, { steps: 4 }); await page.mouse.up();
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await page.getByRole("button", { name: "Pan", exact: true }).click();
  await page.mouse.move(box.x + 40, box.y + 40); await page.mouse.down(); await page.mouse.move(box.x + 60, box.y + 60); await page.mouse.up();
  await expect(page.locator(".mf-region")).toHaveCount(1);
  await page.getByRole("button", { name: "Review and download" }).click();
  await expect(page.getByRole("heading", { name: "Your photo is ready to review" })).toBeVisible();
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download original size" }).click();
  const download = await downloadEvent;
  const file = await download.path();
  const result = await sharp(file!).raw().toBuffer({ resolveWithObject: true });
  expect(result.info.width).toBe(800);
  const original = await sharp(source).raw().toBuffer();
  expect(result.data.equals(original)).toBe(false);
  const crop = { left: 300, top: 350, width: 200, height: 80 };
  const before = await sharp(source).extract(crop).stats();
  const after = await sharp(file!).extract(crop).stats();
  expect(after.channels[0].stdev).toBeLessThan(before.channels[0].stdev * .85);
  await page.screenshot({ path: "test-results/browser-plate-result.png", fullPage: true });
  expect(requests.filter(({ method }) => method !== "GET")).toEqual([]);
  expect(requests.filter(({ url }) => /^https?:/.test(url) && !url.startsWith("http://127.0.0.1:3100/"))).toEqual([]);
});

test("retired tools are absent and dealership APIs require authentication", async ({ request }) => {
  for (const path of ["/lab", "/lab/basic-edit", "/lab/plate-detection", "/api/basic/edits", "/api/admin/plate-lab/experiments", "/api/admin/showroom-lab/experiments"]) {
    expect((await request.get(path)).status()).toBe(404);
  }
  expect((await request.get("/api/dealership/organizations")).status()).toBe(401);
});

test("real ONNX suggestions on an existing illustrative vehicle remain adjustable", async ({ page }) => {
  const uploads: string[] = [];
  page.on("request", (request) => { if (request.method() !== "GET") uploads.push(request.url()); });
  await page.goto("/en/tools/blur-license-plate");
  await page.locator('input[type="file"]').setInputFiles("public/motorframe/suv-plata.webp");
  await expect(page.getByRole("button", { name: "Mark", exact: true })).toBeVisible({ timeout: 90000 });
  await expect(page.locator(".mf-processing")).toHaveCount(0, { timeout: 90000 });
  await expect(page.locator(".mf-error")).toHaveCount(0);
  expect(await page.locator(".mf-region").count()).toBeGreaterThan(0);
  await page.getByRole("button", { name: "Resize selection from se" }).scrollIntoViewIfNeeded();
  const region = page.locator(".mf-region-wrap").first();
  const before = await region.boundingBox();
  const handle = await page.getByRole("button", { name: "Resize selection from se" }).boundingBox();
  await page.mouse.move(handle!.x + handle!.width / 2, handle!.y + handle!.height / 2);
  await page.mouse.down();
  await page.mouse.move(handle!.x + handle!.width / 2 + 12, handle!.y + handle!.height / 2 + 8, { steps: 4 });
  await page.mouse.up();
  await expect.poll(async () => (await region.boundingBox())!.width).toBeGreaterThan(before!.width);
  expect(uploads).toEqual([]);
});
