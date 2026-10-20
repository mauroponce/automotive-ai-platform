import { AuthorizationError, requirePortalUser } from "@/lib/authorization";

export async function POST(){try{await requirePortalUser();return Response.json({error:{code:"api_uploads_unavailable",message:"Public API uploads remain disabled until API-key authentication and verified upload finalization are implemented."}},{status:503});}catch(error){if(error instanceof AuthorizationError)return Response.json({error:{code:"unauthorized",message:"Authentication required"}},{status:401});throw error;}}
