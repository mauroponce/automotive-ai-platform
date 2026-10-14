import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { createBasicEdit, getBasicEdit, readBasicEditOutput, saveBasicEditOutput } from "@/lib/basic-edit/storage";

const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))); delete process.env.BASIC_EDIT_STORAGE_ROOT; });

describe("Basic edit local storage", () => {
  it("keeps a normalized source and output private to its owner", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "basic-edit-")); roots.push(root); process.env.BASIC_EDIT_STORAGE_ROOT = root;
    const image = await sharp({ create: { width: 20, height: 10, channels: 3, background: "#d24b4b" } }).png().toBuffer();
    const created = await createBasicEdit("owner-a", new File([new Uint8Array(image)], "vehicle.png", { type: "image/png" }));
    expect(created.record.sourceContentType).toBe("image/jpeg");
    expect(await getBasicEdit(created.record.id, "owner-a")).toMatchObject({ id: created.record.id });
    expect(await getBasicEdit(created.record.id, "owner-b")).toBeNull();
    await saveBasicEditOutput(created.record, created.source);
    expect((await readBasicEditOutput(created.record)).byteLength).toBeGreaterThan(0);
  });
});
