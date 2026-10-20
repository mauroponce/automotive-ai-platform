import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = () => process.env.PLATE_LAB_STORAGE_ROOT ?? "/tmp/automotive-plate-lab";
function safeKey(key: string) { if (!/^[a-zA-Z0-9/_-]+\.[a-z0-9]+$/i.test(key) || key.includes("..")) throw new Error("Invalid lab artifact key"); return key; }
export const plateLabStorage = {
  async put(experimentId: string, extension: string, body: Buffer) {
    const key = `${experimentId}/${randomUUID()}.${extension}`; const destination = path.join(root(), safeKey(key));
    await mkdir(path.dirname(destination), { recursive: true }); await writeFile(destination, body);
    return { key, checksum: createHash("sha256").update(body).digest("hex") };
  },
  async get(key: string) { return readFile(path.join(/* turbopackIgnore: true */ root(), safeKey(key))); },
};
