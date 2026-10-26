import { withRlsBypass } from "../lib/db";
import { queue } from "../lib/queue";
import { enqueueVehicleBatchReconcile } from "../lib/queue";
import { submitVehicleBatchToOpenAI, reconcileVehicleBatchFromOpenAI, ProviderBatchTerminalError } from "../lib/dealership-batch/openai-batch";
import { failVehicleBatch, recordVehicleBatchError } from "../lib/dealership-batch/service";

async function start() {
  const boss = await queue();
  await boss.work("image-generation", async (jobs) => {
    for (const message of jobs) {
      const data = message.data as { jobId: string };
      const job = await withRlsBypass((tx) => tx.generationJob.findUnique({ where: { id: data.jobId } }));
      if (!job) continue;
      await withRlsBypass((tx) => tx.generationJob.update({ where: { id: job.id }, data: { status: "PROCESSING" } }));
      try {
        throw new Error("Asset retrieval must be configured before live generation.");
      } catch (error) {
        await withRlsBypass(async (tx) => {
          await tx.generationJob.update({ where: { id: job.id }, data: { status: "FAILED" } });
          await tx.generationAttempt.create({ data: { jobId: job.id, provider: "openai", modelIdentifier: (job.requestedSettings as { model: string }).model, status: "FAILED", errorMessage: error instanceof Error ? error.message : "Unknown error" } });
        });
        throw error;
      }
    }
  });
  await boss.work("vehicle-batch-dispatch", { includeMetadata: true }, async (jobs) => {
    for (const message of jobs) { const { batchId } = message.data as { batchId: string }; try { await submitVehicleBatchToOpenAI(batchId); await enqueueVehicleBatchReconcile(batchId); } catch (error) { if (message.retryCount >= message.retryLimit) await failVehicleBatch(batchId, error); else await recordVehicleBatchError(batchId, error); throw error; } }
  });
  await boss.work("vehicle-batch-reconcile", async (jobs) => {
    for (const message of jobs) { const { batchId } = message.data as { batchId: string }; try { const batch = await withRlsBypass((tx) => tx.vehicleProcessingBatch.findUnique({ where: { id: batchId } })); if (!batch?.providerBatchId) continue; const completed = await reconcileVehicleBatchFromOpenAI(batchId, batch.providerBatchId); if (!completed) await enqueueVehicleBatchReconcile(batchId); } catch (error) { if (error instanceof ProviderBatchTerminalError) await failVehicleBatch(batchId, error); else await recordVehicleBatchError(batchId, error); throw error; } }
  });

}
start().catch((error) => { console.error(error); process.exit(1); });
