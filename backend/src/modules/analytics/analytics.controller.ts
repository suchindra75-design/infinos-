import { Request, Response, NextFunction } from 'express';
import { analyticsService } from './analytics.service.js';
import { analyticsQuerySchema } from './analytics.validation.js';

export class AnalyticsController {
  /**
   * GET /api/v1/devices/:id/analytics/summary
   */
  async getSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = analyticsQuerySchema.parse(req.query);
      const summary = await analyticsService.getSummary(req.params.id, query, req.user!);
      res.status(200).json({
        success: true,
        data: summary,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/devices/:id/analytics/timeseries
   */
  async getTimeseries(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = analyticsQuerySchema.parse(req.query);
      const timeseries = await analyticsService.getTimeseries(req.params.id, query, req.user!);
      res.status(200).json({
        success: true,
        data: timeseries,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const analyticsController = new AnalyticsController();
