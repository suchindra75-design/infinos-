import { Request, Response, NextFunction } from 'express';
import { settingsService } from './settings.service.js';
import { updateDeviceSettingsSchema } from './settings.validation.js';

export class SettingsController {
  /**
   * GET /api/v1/devices/:id/settings
   * Retrieves current threshold and alert configuration for a Smart Bag.
   */
  async getSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const settings = await settingsService.getDeviceSettings(req.params.id, req.user!);
      res.status(200).json({
        success: true,
        data: settings,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/devices/:id/settings
   * Updates threshold and alert configuration for a Smart Bag.
   */
  async updateSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = updateDeviceSettingsSchema.parse(req.body);
      const updated = await settingsService.updateDeviceSettings(req.params.id, input, req.user!);
      res.status(200).json({
        success: true,
        message: 'Device settings updated successfully',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const settingsController = new SettingsController();
