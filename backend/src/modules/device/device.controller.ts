import { Request, Response, NextFunction } from 'express';
import { deviceService } from './device.service.js';
import { AppError } from '../../middleware/error.middleware.js';

export class DeviceController {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const includeArchived = req.query.includeArchived === 'true';
      const devices = await deviceService.listDevices(includeArchived);
      res.status(200).json({
        success: true,
        data: {
          devices,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
      }
      const device = await deviceService.createDevice(req.body, req.user.id);
      res.status(201).json({
        success: true,
        data: {
          device,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const device = await deviceService.getDeviceById(id);
      res.status(200).json({
        success: true,
        data: {
          device,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
      }
      const { id } = req.params;
      const device = await deviceService.updateDevice(id, req.body, req.user);
      res.status(200).json({
        success: true,
        data: {
          device,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
      }
      const { id } = req.params;
      const result = await deviceService.deleteDevice(id, req.user);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const status = await deviceService.getDeviceStatus(id);
      res.status(200).json({
        success: true,
        data: status,
      });
    } catch (error) {
      next(error);
    }
  }

  async testConnection(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await deviceService.testConnection(req.body);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getLatestReading(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
      }
      const { id } = req.params;
      const reading = await deviceService.getLatestDeviceReading(id, req.user);
      res.status(200).json({
        success: true,
        data: reading,
      });
    } catch (error) {
      next(error);
    }
  }

  async getReadings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
      }
      const { id } = req.params;
      const query = {
        limit: req.query.limit ? Number(req.query.limit) : undefined,
        from: req.query.from as string | undefined,
        to: req.query.to as string | undefined,
      };
      const result = await deviceService.getDeviceReadings(id, query, req.user);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async sync(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
      }
      const { id } = req.params;
      const result = await deviceService.syncDeviceManually(id, req.user);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const deviceController = new DeviceController();
