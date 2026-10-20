import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db, serviceDb, withTenantDb } from "@/lib/db";

const enabled = Boolean(process.env.DATABASE_URL && process.env.MIGRATION_DATABASE_URL);
const suite = enabled ? describe : describe.skip;
const organizationA = "rls-test-organization-a";
const organizationB = "rls-test-organization-b";

suite("tenant row-level security", () => {
  beforeAll(async () => {
    await serviceDb.organization.createMany({ data: [
      { id: organizationA, name: "RLS tenant A", trialEndsAt: new Date(Date.now() + 86_400_000) },
      { id: organizationB, name: "RLS tenant B", trialEndsAt: new Date(Date.now() + 86_400_000) },
    ], skipDuplicates: true });
    await serviceDb.asset.createMany({ data: [
      { id: "rls-test-asset-a", organizationId: organizationA, kind: "VEHICLE", objectKey: `${organizationA}/vehicle.png`, contentType: "image/png", byteSize: 1 },
      { id: "rls-test-asset-b", organizationId: organizationB, kind: "VEHICLE", objectKey: `${organizationB}/vehicle.png`, contentType: "image/png", byteSize: 1 },
    ], skipDuplicates: true });
  });

  afterAll(async () => {
    await serviceDb.organization.deleteMany({ where: { id: { in: [organizationA, organizationB] } } });
    await Promise.all([db.$disconnect(), serviceDb.$disconnect()]);
  });

  it("returns no tenant rows without a transaction context", async () => {
    expect(await db.asset.count({ where: { id: { startsWith: "rls-test-" } } })).toBe(0);
  });

  it("shows only the selected organization", async () => {
    const assets = await withTenantDb(organizationA, (tx) => tx.asset.findMany({ where: { id: { startsWith: "rls-test-" } }, select: { id: true } }));
    expect(assets).toEqual([{ id: "rls-test-asset-a" }]);
  });

  it("rejects a cross-tenant write", async () => {
    await expect(withTenantDb(organizationA, (tx) => tx.asset.create({ data: { id: "rls-test-cross-tenant", organizationId: organizationB, kind: "VEHICLE", objectKey: `${organizationB}/cross-tenant.png`, contentType: "image/png", byteSize: 1 } }))).rejects.toThrow();
  });
});
