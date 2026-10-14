CREATE TYPE "ShowroomLabExperimentStatus" AS ENUM ('DRAFT', 'QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED');

CREATE TABLE "ShowroomLabExperiment" (
  "id" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "status" "ShowroomLabExperimentStatus" NOT NULL DEFAULT 'DRAFT',
  "configuration" JSONB NOT NULL,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ShowroomLabExperiment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ShowroomLabExperiment_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE
);
CREATE TABLE "ShowroomLabImage" (
  "id" TEXT NOT NULL,
  "experimentId" TEXT NOT NULL,
  "originalName" TEXT NOT NULL,
  "artifactKey" TEXT NOT NULL,
  "contentType" TEXT NOT NULL,
  "byteSize" INTEGER NOT NULL,
  "width" INTEGER NOT NULL,
  "height" INTEGER NOT NULL,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ShowroomLabImage_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ShowroomLabImage_artifactKey_key" UNIQUE ("artifactKey"),
  CONSTRAINT "ShowroomLabImage_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "ShowroomLabExperiment"("id") ON DELETE CASCADE
);
CREATE TABLE "ShowroomLabBackground" (
  "id" TEXT NOT NULL,
  "experimentId" TEXT NOT NULL,
  "originalName" TEXT NOT NULL,
  "artifactKey" TEXT NOT NULL,
  "contentType" TEXT NOT NULL,
  "byteSize" INTEGER NOT NULL,
  "width" INTEGER NOT NULL,
  "height" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ShowroomLabBackground_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ShowroomLabBackground_artifactKey_key" UNIQUE ("artifactKey"),
  CONSTRAINT "ShowroomLabBackground_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "ShowroomLabExperiment"("id") ON DELETE CASCADE
);
CREATE TABLE "ShowroomLabRun" (
  "id" TEXT NOT NULL,
  "imageId" TEXT NOT NULL,
  "backgroundId" TEXT NOT NULL,
  "modelId" TEXT NOT NULL,
  "maskArtifactKey" TEXT NOT NULL,
  "outputArtifactKey" TEXT NOT NULL,
  "preprocessingMs" INTEGER NOT NULL,
  "inferenceMs" INTEGER NOT NULL,
  "postprocessingMs" INTEGER NOT NULL,
  "warnings" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ShowroomLabRun_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ShowroomLabRun_maskArtifactKey_key" UNIQUE ("maskArtifactKey"),
  CONSTRAINT "ShowroomLabRun_outputArtifactKey_key" UNIQUE ("outputArtifactKey"),
  CONSTRAINT "ShowroomLabRun_imageId_backgroundId_modelId_key" UNIQUE ("imageId", "backgroundId", "modelId"),
  CONSTRAINT "ShowroomLabRun_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "ShowroomLabImage"("id") ON DELETE CASCADE,
  CONSTRAINT "ShowroomLabRun_backgroundId_fkey" FOREIGN KEY ("backgroundId") REFERENCES "ShowroomLabBackground"("id") ON DELETE CASCADE
);
