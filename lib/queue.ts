import { PgBoss } from "pg-boss";
let boss: PgBoss | undefined;
const queueNames=["image-generation","vehicle-batch-dispatch","vehicle-batch-reconcile"] as const;
export async function queue(){if(!boss){boss=new PgBoss({connectionString:process.env.DATABASE_URL!});await boss.start();await Promise.all(queueNames.map((name)=>boss!.createQueue(name)));}return boss;}
export async function enqueueGeneration(jobId:string){const q=await queue(); return q.send("image-generation",{jobId},{singletonKey:jobId,retryLimit:3,retryDelay:30});}
export async function enqueueVehicleBatchDispatch(batchId:string){const q=await queue();return q.send("vehicle-batch-dispatch",{batchId},{singletonKey:batchId,retryLimit:3,retryDelay:30});}
export async function enqueueVehicleBatchReconcile(batchId:string, delaySeconds=60){const q=await queue();return q.send("vehicle-batch-reconcile",{batchId},{singletonKey:`reconcile-${batchId}`,retryLimit:3,retryDelay:60,startAfter:new Date(Date.now()+delaySeconds*1000)});}
