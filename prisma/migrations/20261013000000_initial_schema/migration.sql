DO $$ BEGIN
  CREATE TYPE "OrganizationRole" AS ENUM ('OWNER', 'DEALERSHIP_ADMIN', 'DEALERSHIP_STAFF');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "AssetKind" AS ENUM ('VEHICLE', 'SHOWROOM', 'LOGO', 'GENERATED', 'EVALUATION_ARTIFACT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "JobStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELED', 'NEEDS_REVIEW');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT NOT NULL,
  "name" TEXT,
  "email" TEXT,
  "emailVerified" TIMESTAMP(3),
  "image" TEXT,
  "passwordHash" TEXT,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");

CREATE TABLE IF NOT EXISTS "Account" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "providerAccountId" TEXT NOT NULL,
  CONSTRAINT "Account_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

CREATE TABLE IF NOT EXISTS "Session" (
  "id" TEXT NOT NULL,
  "sessionToken" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "expires" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Session_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "Session_sessionToken_key" ON "Session"("sessionToken");

CREATE TABLE IF NOT EXISTS "VerificationToken" (
  "identifier" TEXT NOT NULL,
  "token" TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "VerificationToken_token_key" ON "VerificationToken"("token");
CREATE UNIQUE INDEX IF NOT EXISTS "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

CREATE TABLE IF NOT EXISTS "Organization" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Membership" (
  "organizationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" "OrganizationRole" NOT NULL,
  CONSTRAINT "Membership_pkey" PRIMARY KEY ("organizationId", "userId"),
  CONSTRAINT "Membership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "Membership_userId_idx" ON "Membership"("userId");

CREATE TABLE IF NOT EXISTS "Asset" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "kind" "AssetKind" NOT NULL,
  "objectKey" TEXT NOT NULL,
  "contentType" TEXT NOT NULL,
  "byteSize" INTEGER NOT NULL,
  CONSTRAINT "Asset_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Asset_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "Asset_objectKey_key" ON "Asset"("objectKey");
CREATE INDEX IF NOT EXISTS "Asset_organizationId_kind_idx" ON "Asset"("organizationId", "kind");

CREATE TABLE IF NOT EXISTS "PromptTemplate" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  CONSTRAINT "PromptTemplate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PromptTemplate_name_key" ON "PromptTemplate"("name");

CREATE TABLE IF NOT EXISTS "PromptVersion" (
  "id" TEXT NOT NULL,
  "promptTemplateId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "promptText" TEXT NOT NULL,
  CONSTRAINT "PromptVersion_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PromptVersion_promptTemplateId_fkey" FOREIGN KEY ("promptTemplateId") REFERENCES "PromptTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "PromptVersion_promptTemplateId_version_key" ON "PromptVersion"("promptTemplateId", "version");

CREATE TABLE IF NOT EXISTS "ModelRegistry" (
  "id" TEXT NOT NULL,
  "modelIdentifier" TEXT NOT NULL,
  CONSTRAINT "ModelRegistry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ModelRegistry_modelIdentifier_key" ON "ModelRegistry"("modelIdentifier");

CREATE TABLE IF NOT EXISTS "GenerationJob" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "promptVersionId" TEXT NOT NULL,
  "status" "JobStatus" NOT NULL DEFAULT 'QUEUED',
  "requestedSettings" JSONB NOT NULL,
  CONSTRAINT "GenerationJob_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "GenerationJob_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "GenerationJob_promptVersionId_fkey" FOREIGN KEY ("promptVersionId") REFERENCES "PromptVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "GenerationJob_organizationId_status_idx" ON "GenerationJob"("organizationId", "status");

CREATE TABLE IF NOT EXISTS "GenerationAttempt" (
  "id" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "modelIdentifier" TEXT NOT NULL,
  "status" "JobStatus" NOT NULL,
  "errorMessage" TEXT,
  CONSTRAINT "GenerationAttempt_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "GenerationAttempt_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "GenerationJob"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "GenerationAttempt_jobId_idx" ON "GenerationAttempt"("jobId");
