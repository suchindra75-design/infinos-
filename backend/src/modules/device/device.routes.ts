import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { deviceController } from './device.controller.js';
import { createDeviceSchema, updateDeviceSchema, testConnectionSchema } from './device.validation.js';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';
import { validateBody } from '../../middleware/validate.middleware.js';
import { settingsController } from '../settings/settings.controller.js';
import { updateDeviceSettingsSchema } from '../settings/settings.validation.js';
import { alertController } from '../alert/alert.controller.js';
import { analyticsController } from '../analytics/analytics.controller.js';
import { exportController } from '../export/export.controller.js';

export const deviceRouter = Router();

const adminRole = UserRole?.ADMIN || ('ADMIN' as const);
const operatorRole = UserRole?.OPERATOR || ('OPERATOR' as const);

// All device endpoints strictly require authentication
deviceRouter.use(authenticate);

// List all devices (ADMIN, OPERATOR, VIEWER)
deviceRouter.get('/', (req, res, next) => {
  deviceController.list(req, res, next);
});

// Create new device (ADMIN, OPERATOR only)
deviceRouter.post(
  '/',
  requireRole(adminRole, operatorRole),
  validateBody(createDeviceSchema),
  (req, res, next) => {
    deviceController.create(req, res, next);
  }
);

// Test ThingSpeak connection (ADMIN, OPERATOR only)
deviceRouter.post(
  '/test-connection',
  requireRole(adminRole, operatorRole),
  validateBody(testConnectionSchema),
  (req, res, next) => {
    deviceController.testConnection(req, res, next);
  }
);

// Get device status by ID (ADMIN, OPERATOR, VIEWER)
deviceRouter.get('/:id/status', (req, res, next) => {
  deviceController.getStatus(req, res, next);
});

// Trigger manual device synchronization (ADMIN, OPERATOR only - with ownership enforcement)
deviceRouter.post(
  '/:id/sync',
  requireRole(adminRole, operatorRole),
  (req, res, next) => {
    deviceController.sync(req, res, next);
  }
);

// Get latest ThingSpeak reading for device (ADMIN, OPERATOR, VIEWER)
deviceRouter.get('/:id/readings/latest', (req, res, next) => {
  deviceController.getLatestReading(req, res, next);
});

// Get historical ThingSpeak readings for device (ADMIN, OPERATOR, VIEWER)
deviceRouter.get('/:id/readings', (req, res, next) => {
  deviceController.getReadings(req, res, next);
});

// Get device details by ID (ADMIN, OPERATOR, VIEWER)
deviceRouter.get('/:id', (req, res, next) => {
  deviceController.getById(req, res, next);
});

// Device Settings (GET: ADMIN, VIEWER, and OPERATOR if owned; PATCH: ADMIN and OPERATOR if owned)
deviceRouter.get('/:id/settings', (req, res, next) => {
  settingsController.getSettings(req, res, next);
});

deviceRouter.patch(
  '/:id/settings',
  validateBody(updateDeviceSettingsSchema),
  (req, res, next) => {
    settingsController.updateSettings(req, res, next);
  }
);

// Device Alerts (GET: ADMIN, VIEWER, and OPERATOR if owned)
deviceRouter.get('/:id/alerts', (req, res, next) => {
  alertController.listDeviceAlerts(req, res, next);
});

// Device Analytics Summary (GET: ADMIN, VIEWER, and OPERATOR if owned)
deviceRouter.get('/:id/analytics/summary', (req, res, next) => {
  analyticsController.getSummary(req, res, next);
});

// Device Analytics Timeseries (GET: ADMIN, VIEWER, and OPERATOR if owned)
deviceRouter.get('/:id/analytics/timeseries', (req, res, next) => {
  analyticsController.getTimeseries(req, res, next);
});

// Device Sensor Telemetry CSV Export (GET: ADMIN, VIEWER, and OPERATOR if owned)
deviceRouter.get('/:id/export/csv', (req, res, next) => {
  exportController.exportCsv(req, res, next);
});

// Device Sensor Report PDF Export (GET: ADMIN, VIEWER, and OPERATOR if owned)
deviceRouter.get('/:id/export/pdf', (req, res, next) => {
  exportController.exportPdf(req, res, next);
});

// Update device (ADMIN, OPERATOR only - with ownership enforcement in service)
deviceRouter.patch(
  '/:id',
  requireRole(adminRole, operatorRole),
  validateBody(updateDeviceSchema),
  (req, res, next) => {
    deviceController.update(req, res, next);
  }
);

// Delete device (ADMIN, OPERATOR only - with ownership enforcement in service)
deviceRouter.delete(
  '/:id',
  requireRole(adminRole, operatorRole),
  (req, res, next) => {
    deviceController.delete(req, res, next);
  }
);
