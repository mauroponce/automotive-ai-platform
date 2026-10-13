CREATE TYPE "PlatformRole" AS ENUM ('USER', 'SUPER_ADMIN');
ALTER TABLE "User" ADD COLUMN "platformRole" "PlatformRole" NOT NULL DEFAULT 'USER';
ALTER TABLE "User" ADD COLUMN "roleChangedAt" TIMESTAMP(3);
CREATE TABLE "AdminAuditEvent" (
  "id" TEXT NOT NULL,
  "actorId" TEXT,
  "subjectUserId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdminAuditEvent_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "single_super_admin" ON "User" (("platformRole")) WHERE "platformRole" = 'SUPER_ADMIN';
