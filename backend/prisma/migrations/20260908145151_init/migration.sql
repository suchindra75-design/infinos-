-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'OPERATOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "DeviceStatus" AS ENUM ('ONLINE', 'STALE', 'OFFLINE');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('HOT_TEMPERATURE', 'COLD_TEMPERATURE', 'HUMIDITY', 'DEVICE_OFFLINE', 'DATA_MISSING');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'VIEWER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "devices" (
    "id" TEXT NOT NULL,
    "deviceCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "thingSpeakChannelId" TEXT NOT NULL,
    "thingSpeakReadKey" TEXT,
    "status" "DeviceStatus" NOT NULL DEFAULT 'OFFLINE',
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sensor_readings" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "thingSpeakEntryId" INTEGER NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "hotTemperature" DOUBLE PRECISION,
    "coldTemperature" DOUBLE PRECISION,
    "humidity" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sensor_readings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_settings" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "hotWarningThreshold" DOUBLE PRECISION NOT NULL DEFAULT 60.0,
    "hotCriticalThreshold" DOUBLE PRECISION NOT NULL DEFAULT 50.0,
    "coldWarningThreshold" DOUBLE PRECISION NOT NULL DEFAULT 4.0,
    "coldCriticalThreshold" DOUBLE PRECISION NOT NULL DEFAULT 8.0,
    "humidityWarningThreshold" DOUBLE PRECISION NOT NULL DEFAULT 70.0,
    "humidityCriticalThreshold" DOUBLE PRECISION NOT NULL DEFAULT 85.0,
    "offlineTimeoutSeconds" INTEGER NOT NULL DEFAULT 300,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "device_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "type" "AlertType" NOT NULL,
    "severity" "AlertSeverity" NOT NULL,
    "message" TEXT NOT NULL,
    "triggerValue" DOUBLE PRECISION,
    "thresholdValue" DOUBLE PRECISION,
    "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedAt" TIMESTAMP(3),
    "acknowledgedById" TEXT,

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "devices_deviceCode_key" ON "devices"("deviceCode");

-- CreateIndex
CREATE INDEX "devices_status_idx" ON "devices"("status");

-- CreateIndex
CREATE INDEX "sensor_readings_deviceId_idx" ON "sensor_readings"("deviceId");

-- CreateIndex
CREATE INDEX "sensor_readings_recordedAt_idx" ON "sensor_readings"("recordedAt");

-- CreateIndex
CREATE INDEX "sensor_readings_deviceId_recordedAt_idx" ON "sensor_readings"("deviceId", "recordedAt");

-- CreateIndex
CREATE UNIQUE INDEX "sensor_readings_deviceId_thingSpeakEntryId_key" ON "sensor_readings"("deviceId", "thingSpeakEntryId");

-- CreateIndex
CREATE UNIQUE INDEX "device_settings_deviceId_key" ON "device_settings"("deviceId");

-- CreateIndex
CREATE INDEX "alerts_deviceId_idx" ON "alerts"("deviceId");

-- CreateIndex
CREATE INDEX "alerts_triggeredAt_idx" ON "alerts"("triggeredAt");

-- CreateIndex
CREATE INDEX "alerts_deviceId_triggeredAt_idx" ON "alerts"("deviceId", "triggeredAt");

-- AddForeignKey
ALTER TABLE "sensor_readings" ADD CONSTRAINT "sensor_readings_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_settings" ADD CONSTRAINT "device_settings_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_acknowledgedById_fkey" FOREIGN KEY ("acknowledgedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
