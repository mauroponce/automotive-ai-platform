import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export class AuthorizationError extends Error { constructor(message="Access denied"){super(message)} }
export async function currentPrincipal(){const session=await getServerSession(authOptions);if(!session?.user?.email) return null;return db.user.findUnique({where:{email:session.user.email},select:{id:true,email:true,name:true,platformRole:true}})}
export async function requireAuthenticatedUser(){const user=await currentPrincipal();if(!user) throw new AuthorizationError("Authentication required");return user}
export async function requireSuperAdmin(){const user=await requireAuthenticatedUser();if(user.platformRole!=="SUPER_ADMIN")throw new AuthorizationError();return user}
export async function requirePortalUser(){return requireAuthenticatedUser()}
export async function requireOrganizationMembership(organizationId:string){const user=await requirePortalUser();const membership=await db.membership.findUnique({where:{organizationId_userId:{organizationId,userId:user.id}},select:{organizationId:true}});if(!membership&&user.platformRole!=="SUPER_ADMIN")throw new AuthorizationError();return user}
export async function requireSuperAdminPage(){try{return await requireSuperAdmin()}catch{redirect("/login?error=access_denied")}}
export async function requirePortalPage(){try{return await requirePortalUser()}catch{redirect("/login?error=authentication_required")}}
