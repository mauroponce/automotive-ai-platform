import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import { CreateBucketCommand, S3Client } from "@aws-sdk/client-s3";
import { db, serviceDb, withTenantDb } from "@/lib/db";
import { uploadOrganizationAsset, createVehicleProcessingBatch, queueVehicleProcessingBatch, reviewBatchItem } from "@/lib/dealership-batch/service";
import { submitVehicleBatchToOpenAI, reconcileVehicleBatchFromOpenAI } from "@/lib/dealership-batch/openai-batch";
import type { BatchProvider } from "@/lib/dealership-batch/provider";
import { storage } from "@/lib/storage";
import { queue } from "@/lib/queue";

const session = vi.hoisted(() => ({ email: "pilot-owner-a@example.test" as string | null }));
vi.mock("next-auth", () => ({ getServerSession: vi.fn(async () => session.email ? { user: { email: session.email } } : null) }));
import { GET as output } from "@/app/api/dealership/batches/[id]/items/[itemId]/output/route";

const enabled = Boolean(process.env.DATABASE_URL && process.env.MIGRATION_DATABASE_URL && process.env.S3_ENDPOINT);
const suite = enabled ? describe : describe.skip;
const keys: string[] = [];
const orgA = "cpilotorganizationaaaaaaa";
const orgB = "cpilotorganizationbbbbbbb";
let sourceId: string;
let showroomId: string;
let foreignId: string;
let image: Buffer;

async function cleanupFixtures() {
  await serviceDb.$executeRawUnsafe('DELETE FROM pgboss.job WHERE data->>\'batchId\' IN (SELECT id FROM "VehicleProcessingBatch" WHERE "organizationId" IN ($1, $2))', orgA, orgB);
  await serviceDb.vehicleProcessingBatch.deleteMany({ where: { organizationId: { in: [orgA, orgB] } } });
  await serviceDb.organization.deleteMany({ where: { id: { in: [orgA, orgB] } } });
  await serviceDb.user.deleteMany({ where: { email: { in: ["pilot-owner-a@example.test", "pilot-owner-b@example.test"] } } });
}

suite("persistent authorized pilot with SIMULATED provider, PostgreSQL and private S3", () => {
  beforeAll(async () => {
    await cleanupFixtures();
    const s3 = new S3Client({ endpoint: process.env.S3_ENDPOINT, region: "us-east-1", forcePathStyle: true, credentials: { accessKeyId: process.env.S3_ACCESS_KEY!, secretAccessKey: process.env.S3_SECRET_KEY! } });
    await s3.send(new CreateBucketCommand({ Bucket: process.env.S3_BUCKET })).catch((error) => { if (!["BucketAlreadyOwnedByYou", "BucketAlreadyExists"].includes(error.name)) throw error; });
    for (const [id, email] of [[orgA, "pilot-owner-a@example.test"], [orgB, "pilot-owner-b@example.test"]]) {
      await serviceDb.organization.create({ data: { id, name: "Simulated integration fixture", trialEndsAt: new Date(Date.now() + 86400000), memberships: { create: { role: "OWNER", user: { create: { email } } } } } });
    }
    await serviceDb.pilotOrganizationEntitlement.create({ data: { organizationId: orgA, grantedVehicleBatches: 1 } });
    image = await sharp({ create: { width: 64, height: 48, channels: 3, background: "#b33" } }).png().toBuffer();
    const file = () => new File([new Uint8Array(image)], "SIMULATED-fixture.png", { type: "image/png" });
    const source = await uploadOrganizationAsset(orgA, "VEHICLE", file()); sourceId = source.id; keys.push(source.objectKey);
    const showroom = await uploadOrganizationAsset(orgA, "SHOWROOM", file()); showroomId = showroom.id; keys.push(showroom.objectKey);
    const foreign = await uploadOrganizationAsset(orgB, "VEHICLE", file()); foreignId = foreign.id; keys.push(foreign.objectKey);
  }, 30000);
  afterAll(async () => {
    await Promise.all(keys.map((key) => storage.remove(key)));
    await cleanupFixtures();
    await (await queue()).stop({ graceful: false });
    await Promise.all([db.$disconnect(), serviceDb.$disconnect()]);
  });
  it("reserves one manual allowance, queues atomically, reconciles once, reviews and isolates downloads", async () => {
    const input = { organizationId: orgA, vehicleLabel: "SIMULATED pilot", sourceAssetIds: [sourceId], background: { source: "organization_asset", assetId: showroomId }, plateTreatment: "preserve", idempotencyKey: "pilot-integration-idempotency" };
    await expect(createVehicleProcessingBatch({ ...input, sourceAssetIds: [foreignId] })).rejects.toThrow("owned by this dealership");
    await expect(createVehicleProcessingBatch({ ...input, organizationId: orgB, sourceAssetIds: [foreignId], background: { source: "platform_preset", presetId: "studio-white-v1" } })).rejects.toThrow("entitlement");
    const [batch, duplicate] = await Promise.all([createVehicleProcessingBatch(input), createVehicleProcessingBatch(input)]);
    expect(duplicate.id).toBe(batch.id);
    await expect(createVehicleProcessingBatch({ ...input, idempotencyKey: "another-integration-batch" })).rejects.toThrow("entitlement");
    await queueVehicleProcessingBatch(orgA, batch.id);
    expect((await queueVehicleProcessingBatch(orgA, batch.id)).shouldEnqueue).toBe(false);
    const jobs = await serviceDb.$queryRawUnsafe<Array<{ count: bigint }>>('SELECT count(*) FROM pgboss.job WHERE name = $1 AND data->>\'batchId\' = $2', "vehicle-batch-dispatch", batch.id);
    expect(Number(jobs[0].count)).toBe(1);
    const provider: BatchProvider = {
      kind: "simulated",
      async submit(lines) {
        const request = JSON.parse(lines);
        expect(request.body.images).toHaveLength(2);
        expect(request.body.image).toBeUndefined();
        expect(request.body.model).toBe("gpt-image-2.5-sunburst");
        return { id: `simulated-${batch.id}`, inputFileId: "simulated-input" };
      },
      async retrieve(id) { return { id, status: "completed", output_file_id: "simulated-output" }; },
      async output() { return JSON.stringify({ custom_id: batch.items[0].providerCustomId, response: { status_code: 200, body: { data: [{ b64_json: image.toString("base64") }] } } }); },
    };
    const providerId = await submitVehicleBatchToOpenAI(batch.id, provider);
    expect(await submitVehicleBatchToOpenAI(batch.id, provider)).toBe(providerId);
    await Promise.all([reconcileVehicleBatchFromOpenAI(batch.id, providerId, provider), reconcileVehicleBatchFromOpenAI(batch.id, providerId, provider)]);
    const item = await serviceDb.vehicleProcessingItem.findUniqueOrThrow({ where: { id: batch.items[0].id }, include: { outputAsset: true } });
    expect(item.status).toBe("NEEDS_REVIEW");
    expect(item.evaluation).toMatchObject({ simulated: true, costStatus: "simulated_no_charge" });
    keys.push(item.outputAsset!.objectKey);
    expect(await storage.get(item.outputAsset!.objectKey)).toBeInstanceOf(Buffer);
    const params = Promise.resolve({ id: batch.id, itemId: item.id });
    expect((await output(new Request("http://localhost/output"), { params })).status).toBe(200);
    expect((await output(new Request("http://localhost/output?download=1"), { params })).status).toBe(409);
    await expect(reviewBatchItem(orgB, batch.id, item.id, true)).rejects.toThrow();
    await reviewBatchItem(orgA, batch.id, item.id, true);
    expect((await output(new Request("http://localhost/output?download=1"), { params })).status).toBe(200);
    expect((await serviceDb.pilotOrganizationEntitlement.findUniqueOrThrow({ where: { organizationId: orgA } })).consumedVehicleBatches).toBe(1);
    session.email = "pilot-owner-b@example.test";
    expect((await output(new Request("http://localhost/output"), { params })).status).toBe(401);
    expect(await withTenantDb(orgB, (tx) => tx.vehicleProcessingItem.count({ where: { batchId: batch.id } }))).toBe(0);
    session.email = null;
    expect((await output(new Request("http://localhost/output"), { params })).status).toBe(401);
  }, 30000);
});
