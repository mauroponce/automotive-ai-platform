import { PgBoss } from "pg-boss";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required to prepare the queue schema.");

const boss = new PgBoss({ connectionString });
await boss.start();
for (const name of ["image-generation", "vehicle-batch-dispatch", "vehicle-batch-reconcile", "plate-lab-experiment", "showroom-lab-experiment"]) await boss.createQueue(name);
await boss.stop({ graceful: false });
