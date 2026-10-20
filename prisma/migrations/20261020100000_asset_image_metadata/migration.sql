ALTER TABLE "Asset"
ADD COLUMN "checksum" TEXT,
ADD COLUMN "width" INTEGER,
ADD COLUMN "height" INTEGER;

ALTER TABLE "Asset"
ADD CONSTRAINT "Asset_width_positive" CHECK ("width" IS NULL OR "width" > 0),
ADD CONSTRAINT "Asset_height_positive" CHECK ("height" IS NULL OR "height" > 0),
ADD CONSTRAINT "Asset_byteSize_positive" CHECK ("byteSize" > 0);
