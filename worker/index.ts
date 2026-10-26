import { writeFile, unlink } from "node:fs/promises";
import { db } from "../lib/db";
import { withRlsBypass } from "../lib/db";
import { queue } from "../lib/queue";
import { enqueueVehicleBatchReconcile } from "../lib/queue";
import { submitVehicleBatchToOpenAI, reconcileVehicleBatchFromOpenAI } from "../lib/dealership-batch/openai-batch";
import { failVehicleBatch, recordVehicleBatchError } from "../lib/dealership-batch/service";

async function start() {
  const boss = await queue();
  const stop = async () => { await boss.stop({ graceful: true }); process.exit(0); };
  process.on("SIGTERM", stop);
  process.on("SIGINT", stop);

  await boss.work("vehicle-batch-dispatch", { includeMetadata: true }, async (jobs) => {
    for (const message of jobs) { const { batchId } = message.data as { batchId: string }; try { await submitVehicleBatchToOpenAI(batchId); await enqueueVehicleBatchReconcile(batchId); } catch (error) { if (message.retryCount >= message.retryLimit) await failVehicleBatch(batchId, error); else await recordVehicleBatchError(batchId, error); throw error; } }
  });
  await boss.work("vehicle-batch-reconcile", async (jobs) => {
    for (const message of jobs) { const { batchId } = message.data as { batchId: string }; try { const batch = await withRlsBypass((tx) => tx.vehicleProcessingBatch.findUnique({ where: { id: batchId } })); if (!batch?.providerBatchId) continue; const completed = await reconcileVehicleBatchFromOpenAI(batchId, batch.providerBatchId); if (!completed) await enqueueVehicleBatchReconcile(batchId); } catch (error) { await recordVehicleBatchError(batchId, error); throw error; } }
  });
  const heartbeat = async () => {
    try { await db.$queryRaw`SELECT 1`; await writeFile("/tmp/automotive-worker-health", String(Date.now())); }
    catch { await unlink("/tmp/automotive-worker-health").catch(() => undefined); }
  };
  await heartbeat();
  setInterval(() => { void heartbeat(); }, 15000).unref();
  console.info("Vehicle batch worker ready");
}
start().catch((error) => { console.error(error); process.exit(1); });
