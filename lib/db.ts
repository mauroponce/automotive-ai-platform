import { Prisma, PrismaClient } from "@prisma/client";
const globalForPrisma=global as unknown as { prisma?:PrismaClient; servicePrisma?:PrismaClient };
export const db=globalForPrisma.prisma ?? new PrismaClient();
const serviceDatabaseUrl=process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL;
export const serviceDb=globalForPrisma.servicePrisma ?? new PrismaClient({ datasourceUrl: serviceDatabaseUrl });
if(process.env.NODE_ENV!=="production") { globalForPrisma.prisma=db; globalForPrisma.servicePrisma=serviceDb; }

export type TransactionDb = Prisma.TransactionClient;

export function withTenantDb<T>(organizationId: string, operation: (tx: TransactionDb) => Promise<T>) {
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.current_organization_id', ${organizationId}, true)`;
    return operation(tx);
  });
}

export function withRlsBypass<T>(operation: (tx: TransactionDb) => Promise<T>) {
  return serviceDb.$transaction(operation);
}
