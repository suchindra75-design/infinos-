import { Request, Response, NextFunction } from 'express';
import { exportService } from './export.service.js';
import { exportQuerySchema } from './export.validation.js';

export class ExportController {
  /**
   * GET /api/v1/devices/:id/export/csv
   */
  async exportCsv(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = exportQuerySchema.parse(req.query);
      const { csv, filename } = await exportService.exportCsv(req.params.id, query, req.user!);

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.status(200).send(csv);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/devices/:id/export/pdf
   */
  async exportPdf(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = exportQuerySchema.parse(req.query);
      const { pdfBuffer, filename } = await exportService.exportPdf(req.params.id, query, req.user!);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.status(200).end(pdfBuffer);
    } catch (error) {
      next(error);
    }
  }
}

export const exportController = new ExportController();
