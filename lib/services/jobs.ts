import { randomUUID } from "node:crypto"; import { z } from "zod"; import { validateSettings } from "@/lib/models";
export const jobSchema=z.object({vehicleAssetId:z.string().uuid(),showroomAssetId:z.string().uuid(),promptVersionId:z.string().uuid(),model:z.string(),quality:z.enum(["high","medium"]).default("high"),idempotencyKey:z.string().min(16).max(200)});
export type JobInput=z.infer<typeof jobSchema>;
export type QueuedJob={id:string;status:"queued";idempotencyKey:string;settings:ReturnType<typeof validateSettings>};
const demoJobs=new Map<string,QueuedJob>();
export function createJob(raw:unknown):QueuedJob {const data=jobSchema.parse(raw);const settings=validateSettings({model:data.model as ReturnType<typeof validateSettings>["model"],quality:data.quality});const existing=demoJobs.get(data.idempotencyKey);if(existing)return existing;const job={id:randomUUID(),status:"queued" as const,idempotencyKey:data.idempotencyKey,settings};demoJobs.set(data.idempotencyKey,job);return job;}
