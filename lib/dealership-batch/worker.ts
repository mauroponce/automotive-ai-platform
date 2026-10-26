import type { PgBoss } from "pg-boss";
import type { BatchProvider } from "./provider";
import { withRlsBypass } from "@/lib/db";
import { enqueueVehicleBatchReconcile } from "@/lib/queue";
import { submitVehicleBatchToOpenAI, reconcileVehicleBatchFromOpenAI } from "./openai-batch";
import { failVehicleBatch, recordVehicleBatchError } from "./service";

// Production and connected tests register the same consumers. Only tests inject
// a simulated provider; there is no customer-facing fake mode.
export async function registerVehicleBatchWorkers(boss: PgBoss, provider?: BatchProvider, reconciliationDelaySeconds = 60) {
  await boss.work("vehicle-batch-dispatch", { includeMetadata: true }, async (jobs) => {
    for (const message of jobs) {
      const { batchId } = message.data as { batchId: string };
      try {
        await submitVehicleBatchToOpenAI(batchId, provider);
        await enqueueVehicleBatchReconcile(batchId, reconciliationDelaySeconds);
      } catch (error) {
        if (message.retryCount >= message.retryLimit) await failVehicleBatch(batchId, error);
        else await recordVehicleBatchError(batchId, error);
        throw error;
      }
    }
  });
  await boss.work("vehicle-batch-reconcile", async (jobs) => {
    for (const message of jobs) {
      const { batchId } = message.data as { batchId: string };
      try {
        const batch = await withRlsBypass((tx) => tx.vehicleProcessingBatch.findUnique({ where: { id: batchId } }));
        if (!batch?.providerBatchId) continue;
        const completed = await reconcileVehicleBatchFromOpenAI(batchId, batch.providerBatchId, provider);
        if (!completed) await enqueueVehicleBatchReconcile(batchId, reconciliationDelaySeconds);
      } catch (error) {
        await recordVehicleBatchError(batchId, error);
        throw error;
      }
    }
  });
  return async () => {
    await boss.offWork("vehicle-batch-dispatch");
    await boss.offWork("vehicle-batch-reconcile");
  };
}
