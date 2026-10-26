import { PgBoss } from "pg-boss";
import type { TransactionDb } from "@/lib/db";
let pending: Promise<PgBoss> | undefined;
const queueNames = ["vehicle-batch-dispatch", "vehicle-batch-reconcile"] as const;
export function queue() {
  return pending ??= (async () => {
    const boss = new PgBoss({ connectionString: process.env.DATABASE_URL!, migrate: false });
    boss.on("error", (error) => console.error("Queue error", error.message));
    await boss.start();
    // Queue DDL belongs to the owner migrator; runtime has DML privileges only.
    return boss;
  })().catch((error) => { pending = undefined; throw error; });
}
export const activeQueueNames = queueNames;
export async function enqueueVehicleBatchDispatch(batchId: string, tx: TransactionDb) {
  const q = await queue();
  return q.send("vehicle-batch-dispatch", { batchId }, {
    singletonKey: batchId, retryLimit: 3, retryDelay: 30,
    db: { async executeSql(text, values) { return { rows: await tx.$queryRawUnsafe(text, ...(values ?? [])) as Record<string, unknown>[] }; } },
  });
}
export async function enqueueVehicleBatchReconcile(batchId: string, delaySeconds = 60) {
  const q = await queue();
  // A continuation can be inserted while its predecessor is still active.
  return q.send("vehicle-batch-reconcile", { batchId }, { retryLimit: 3, retryDelay: 60, startAfter: new Date(Date.now() + delaySeconds * 1000) });
}
