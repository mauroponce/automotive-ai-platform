import { PgBoss } from "pg-boss";
let boss: PgBoss | undefined;
export async function queue(){if(!boss){boss=new PgBoss({connectionString:process.env.DATABASE_URL!});await boss.start();}return boss;}
export async function enqueueGeneration(jobId:string){const q=await queue(); return q.send("image-generation",{jobId},{singletonKey:jobId,retryLimit:3,retryDelay:30});}
