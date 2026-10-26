import { registerVehicleBatchWorkers } from "../lib/dealership-batch/worker";
import { writeFile, unlink } from "node:fs/promises";
import { db } from "../lib/db";
import { queue } from "../lib/queue";

async function start() {
  const boss = await queue();
  const stop = async () => { await boss.stop({ graceful: true }); process.exit(0); };
  process.on("SIGTERM", stop);
  process.on("SIGINT", stop);

  await registerVehicleBatchWorkers(boss);
  const heartbeat = async () => {
    try { await db.$queryRaw`SELECT 1`; await writeFile("/tmp/automotive-worker-health", String(Date.now())); }
    catch { await unlink("/tmp/automotive-worker-health").catch(() => undefined); }
  };
  await heartbeat();
  setInterval(() => { void heartbeat(); }, 15000).unref();
  console.info("Vehicle batch worker ready");
}
start().catch((error) => { console.error(error); process.exit(1); });
