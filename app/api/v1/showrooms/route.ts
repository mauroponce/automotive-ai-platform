import { AuthorizationError, requirePortalUser } from "@/lib/authorization";
export async function GET(){try{await requirePortalUser();return Response.json({data:[],meta:{nextCursor:null}});}catch(error){if(error instanceof AuthorizationError)return Response.json({error:{code:"unauthorized",message:"Authentication required"}},{status:401});throw error;}}
