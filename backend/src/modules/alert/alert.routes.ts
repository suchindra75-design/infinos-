import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { alertController } from './alert.controller.js';

export const alertRouter = Router();

// Global alerts route with query filtering (active/resolved, type, severity, date range, pagination)
alertRouter.get('/', authenticate, (req, res, next) => alertController.listAlerts(req, res, next));

// Resolve an active alert manually
alertRouter.patch('/:id/resolve', authenticate, (req, res, next) =>
  alertController.resolveAlert(req, res, next)
);
