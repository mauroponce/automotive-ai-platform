CREATE TYPE "PlateLabExperimentStatus" AS ENUM ('DRAFT', 'QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELED');
CREATE TYPE "PlateLabAnnotationState" AS ENUM ('PENDING', 'ANNOTATED', 'NO_VISIBLE_PLATE');

CREATE TABLE "PlateLabExperiment" (
  "id" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "status" "PlateLabExperimentStatus" NOT NULL DEFAULT 'DRAFT',
  "configuration" JSONB NOT NULL,
  "selectedModelId" TEXT,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "canceledAt" TIMESTAMP(3),
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PlateLabExperiment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PlateLabExperiment_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE
);
CREATE TABLE "PlateLabImage" (
  "id" TEXT NOT NULL,
  "experimentId" TEXT NOT NULL,
  "originalName" TEXT NOT NULL,
  "artifactKey" TEXT NOT NULL,
  "checksum" TEXT NOT NULL,
  "contentType" TEXT NOT NULL,
  "byteSize" INTEGER NOT NULL,
  "width" INTEGER NOT NULL,
  "height" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'queued',
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlateLabImage_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PlateLabImage_artifactKey_key" UNIQUE ("artifactKey"),
  CONSTRAINT "PlateLabImage_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "PlateLabExperiment"("id") ON DELETE CASCADE
);
CREATE TABLE "PlateLabDetectionRun" (
  "id" TEXT NOT NULL,
  "imageId" TEXT NOT NULL,
  "modelId" TEXT NOT NULL,
  "strategy" TEXT NOT NULL,
  "threshold" DOUBLE PRECISION NOT NULL,
  "iouThreshold" DOUBLE PRECISION,
  "detections" JSONB NOT NULL,
  "preprocessingMs" INTEGER NOT NULL,
  "inferenceMs" INTEGER NOT NULL,
  "postprocessingMs" INTEGER NOT NULL,
  "warnings" JSONB NOT NULL,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlateLabDetectionRun_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PlateLabDetectionRun_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "PlateLabImage"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX "PlateLabDetectionRun_imageId_modelId_strategy_threshold_iouThreshold_key" ON "PlateLabDetectionRun"("imageId", "modelId", "strategy", "threshold", "iouThreshold");
CREATE TABLE "PlateLabOutput" (
  "id" TEXT NOT NULL,
  "imageId" TEXT NOT NULL,
  "modelId" TEXT NOT NULL,
  "method" TEXT NOT NULL,
  "marginPercent" DOUBLE PRECISION NOT NULL,
  "artifactKey" TEXT NOT NULL,
  "contentType" TEXT NOT NULL,
  "byteSize" INTEGER NOT NULL,
  "detectionCount" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlateLabOutput_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PlateLabOutput_artifactKey_key" UNIQUE ("artifactKey"),
  CONSTRAINT "PlateLabOutput_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "PlateLabImage"("id") ON DELETE CASCADE
);
CREATE TABLE "PlateLabAnnotationRevision" (
  "id" TEXT NOT NULL,
  "imageId" TEXT NOT NULL,
  "revision" INTEGER NOT NULL,
  "state" "PlateLabAnnotationState" NOT NULL,
  "boxes" JSONB NOT NULL,
  "tags" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlateLabAnnotationRevision_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PlateLabAnnotationRevision_imageId_revision_key" UNIQUE ("imageId", "revision"),
  CONSTRAINT "PlateLabAnnotationRevision_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "PlateLabImage"("id") ON DELETE CASCADE
);
CREATE TABLE "PlateLabMetricSnapshot" (
  "id" TEXT NOT NULL,
  "experimentId" TEXT NOT NULL,
  "annotationRevisionIds" JSONB NOT NULL,
  "metrics" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlateLabMetricSnapshot_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PlateLabMetricSnapshot_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "PlateLabExperiment"("id") ON DELETE CASCADE
);
