-- AlterTable
ALTER TABLE "devices" ADD COLUMN     "isArchived" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "devices_isArchived_idx" ON "devices"("isArchived");
