import { createJob } from "@/lib/services/jobs"; import { enqueueGeneration } from "@/lib/queue"; import { ZodError } from "zod";
export const runtime="nodejs";
export async function POST(request:Request){try {const job=createJob(await request.json());if(process.env.APP_DEMO_MODE==="false")await enqueueGeneration(job.id);return Response.json({data:job,meta:{demo:process.env.APP_DEMO_MODE!=="false"}},{status:202});}catch(error){if(error instanceof ZodError)return Response.json({error:{code:"validation_error",message:"Invalid job request",details:error.issues}},{status:400});return Response.json({error:{code:"job_creation_failed",message:error instanceof Error?error.message:"Unknown error"}},{status:500});}}
export function GET(){return Response.json({data:[],meta:{nextCursor:null}});}
