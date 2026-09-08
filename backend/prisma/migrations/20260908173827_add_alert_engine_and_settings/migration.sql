-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AlertType" ADD VALUE 'COLD_TEMPERATURE_LOW';
ALTER TYPE "AlertType" ADD VALUE 'COLD_TEMPERATURE_HIGH';
ALTER TYPE "AlertType" ADD VALUE 'HOT_TEMPERATURE_LOW';
ALTER TYPE "AlertType" ADD VALUE 'HOT_TEMPERATURE_HIGH';
ALTER TYPE "AlertType" ADD VALUE 'HUMIDITY_LOW';
ALTER TYPE "AlertType" ADD VALUE 'HUMIDITY_HIGH';

-- AlterTable
ALTER TABLE "alerts" ADD COLUMN     "isResolved" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "resolvedAt" TIMESTAMP(3),
ADD COLUMN     "resolvedById" TEXT;

-- AlterTable
ALTER TABLE "device_settings" ADD COLUMN     "alertsEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "coldTempMax" DOUBLE PRECISION NOT NULL DEFAULT 8.0,
ADD COLUMN     "coldTempMin" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
ADD COLUMN     "hotTempMax" DOUBLE PRECISION NOT NULL DEFAULT 70.0,
ADD COLUMN     "hotTempMin" DOUBLE PRECISION NOT NULL DEFAULT 50.0,
ADD COLUMN     "humidityMax" DOUBLE PRECISION NOT NULL DEFAULT 85.0,
ADD COLUMN     "humidityMin" DOUBLE PRECISION NOT NULL DEFAULT 20.0;

-- CreateIndex
CREATE INDEX "alerts_deviceId_isResolved_idx" ON "alerts"("deviceId", "isResolved");

-- CreateIndex
CREATE INDEX "alerts_deviceId_type_isResolved_idx" ON "alerts"("deviceId", "type", "isResolved");

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
