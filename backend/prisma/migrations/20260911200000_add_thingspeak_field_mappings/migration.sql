-- AlterTable
ALTER TABLE "devices" ADD COLUMN     "fieldMappings" JSONB;

-- AlterTable
ALTER TABLE "sensor_readings" ADD COLUMN     "fieldValues" JSONB;
