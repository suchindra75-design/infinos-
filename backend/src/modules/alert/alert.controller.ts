import { Request, Response, NextFunction } from 'express';
import { alertService } from '../../services/alert.service.js';
import { listAlertsQuerySchema } from './alert.validation.js';

export class AlertController {
  /**
   * GET /api/v1/alerts
   * Retrieves alerts across devices accessible to the requesting user.
   */
  async listAlerts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = listAlertsQuerySchema.parse(req.query);
      const result = await alertService.listAlerts(query, req.user!);

      res.status(200).json({
        success: true,
        data: result.alerts,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/devices/:id/alerts
   * Retrieves alerts for a specific device.
   */
  async listDeviceAlerts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = listAlertsQuerySchema.parse(req.query);
      const result = await alertService.listAlerts(query, req.user!, req.params.id);

      res.status(200).json({
        success: true,
        data: result.alerts,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/alerts/:id/resolve
   * Manually resolves an active alert.
   */
  async resolveAlert(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const resolved = await alertService.resolveAlertManually(req.params.id, req.user!);

      res.status(200).json({
        success: true,
        message: 'Alert resolved successfully',
        data: resolved,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const alertController = new AlertController();
