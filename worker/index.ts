import { db } from "../lib/db";
import { queue } from "../lib/queue";

async function start() {
  const boss = await queue();
  await boss.work("image-generation", async (jobs) => {
    for (const message of jobs) {
      const data = message.data as { jobId: string };
      const job = await db.generationJob.findUnique({ where: { id: data.jobId } });
      if (!job) continue;
      await db.generationJob.update({ where: { id: job.id }, data: { status: "PROCESSING" } });
      try {
        throw new Error("Asset retrieval must be configured before live generation.");
      } catch (error) {
        await db.generationJob.update({ where: { id: job.id }, data: { status: "FAILED" } });
        await db.generationAttempt.create({ data: { jobId: job.id, provider: "openai", modelIdentifier: (job.requestedSettings as { model: string }).model, status: "FAILED", errorMessage: error instanceof Error ? error.message : "Unknown error" } });
        throw error;
      }
    }
  });
}
start().catch((error) => { console.error(error); process.exit(1); });
