import { Prisma, UserRole } from '@prisma/client';
import { prisma } from '../../config/database.js';
import { AppError } from '../../middleware/error.middleware.js';
import { SafeUser } from '../../types/auth.types.js';
import { ExportQueryInput } from './export.validation.js';
import { SimplePdfDocument, PdfTableColumn } from './pdf-builder.js';

export class ExportService {
  /**
   * Sanitizes device code for safe inclusion in filenames.
   */
  public sanitizeFilenamePart(part: string): string {
    return part.replace(/[^a-zA-Z0-9_-]/g, '_');
  }

  /**
   * Generates a safe export filename.
   */
  public generateFilename(deviceCode: string, type: 'csv' | 'pdf'): string {
    const cleanCode = this.sanitizeFilenamePart(deviceCode);
    const dateStr = new Date().toISOString().split('T')[0];
    const ext = type === 'csv' ? 'csv' : 'pdf';
    const tag = type === 'csv' ? 'readings' : 'report';
    return `INFINOS_${cleanCode}_${tag}_${dateStr}.${ext}`;
  }

  /**
   * Verifies that the user has permission to access the target device.
   */
  private async getAuthorizedDevice(deviceId: string, user: SafeUser) {
    const device = await prisma.device.findUnique({
      where: { id: deviceId },
      select: {
        id: true,
        deviceCode: true,
        name: true,
        ownerId: true,
        createdAt: true,
      },
    });

    if (!device) {
      throw new AppError('Device not found', 404, 'DEVICE_NOT_FOUND');
    }

    if (user.role === UserRole.OPERATOR && device.ownerId !== user.id) {
      throw new AppError(
        'Forbidden: You do not have permission to export data for this device',
        403,
        'FORBIDDEN'
      );
    }

    return device;
  }

/**
    * Escapes values according to RFC 4180 for CSV output.
    */
  private escapeCsvValue(val: string | number | null | undefined): string {
    if (val === null || val === undefined) {
      return '';
    }
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  /**
     * Parses any raw field value into a finite number, or null.
     * Accepts JS numbers and numeric strings (ThingSpeak feeds arrive as strings).
     * Returns null for null/undefined/empty/non-numeric values (e.g. Door Status "OPEN").
     */
  private toFiniteNumber(val: unknown): number | null {
    if (val === null || val === undefined) return null;
    if (typeof val === 'number') {
      return Number.isFinite(val) ? val : null;
    }
    if (typeof val === 'string') {
      const trimmed = val.trim();
      if (trimmed === '') return null;
      const parsed = Number(trimmed);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  }

  /**
     * Returns true when a raw field value counts as "present" for field discovery.
     * Any non-null, non-undefined, non-empty value (numeric OR non-numeric string)
     * keeps the field alive so string fields like Door Status are never dropped.
     */
  private hasFieldValue(val: unknown): boolean {
    if (val === null || val === undefined) return false;
    if (typeof val === 'number') return Number.isFinite(val);
    if (typeof val === 'string') return val.trim() !== '';
    if (typeof val === 'boolean') return true;
    return true;
  }

  /**
     * Formats a raw field value for PDF display.
     * Numeric values (numbers or numeric strings) render with 1 decimal + unit.
     * Non-numeric values render as their raw string so Door Status etc. stay visible.
     * Missing values render as '--'.
     */
  private formatFieldValue(val: unknown, unit: string): string {
    if (val === null || val === undefined) return '--';
    if (typeof val === 'string' && val.trim() === '') return '--';
    const num = this.toFiniteNumber(val);
    if (num !== null) {
      return `${num.toFixed(1)} ${unit || ''}`.trim();
    }
    return String(val);
  }

  /**
     * Normalizes raw device fieldMappings into a guaranteed shape:
     * { fieldNumber, fieldKey, label, metric, zone, unit }.
     * Never invents Cold/Hot/Humidity semantics: missing labels fall back to "Field N".
     */
  private normalizeMappings(raw: unknown): any[] {
    if (!Array.isArray(raw)) return [];
    const out: any[] = [];
    for (const m of raw as any[]) {
      if (!m || typeof m !== 'object') continue;
      const num = Number(m.fieldNumber) && Number.isFinite(Number(m.fieldNumber))
        ? Number(m.fieldNumber)
        : (Number(String(m.fieldKey || '').replace('field', '')) || out.length + 1);
      const fieldKey: string = typeof m.fieldKey === 'string' && m.fieldKey.startsWith('field')
        ? m.fieldKey
        : `field${num}`;
      const label: string = typeof m.label === 'string' && m.label.trim().length > 0
        ? m.label.trim()
        : `Field ${num}`;
      out.push({
        fieldNumber: num,
        fieldKey,
        label,
        metric: m.metric ?? 'other',
        zone: m.zone ?? 'none',
        unit: typeof m.unit === 'string' ? m.unit : '',
      });
    }
    out.sort((a, b) => a.fieldNumber - b.fieldNumber);
    return out;
  }

  /**
     * Derives field mappings from fieldValues keys present in sensor readings.
     * Used as fallback when device.fieldMappings is unavailable.
     * Includes ANY present value (numeric, numeric-string, or non-numeric string)
     * and never invents Cold/Hot/Humidity semantics: labels are generic "Field N".
     */
  private deriveMappingsFromFieldValues(readings: Array<{ fieldValues?: any }>): any[] {
    const activeKeys = new Set<string>();
    for (const r of readings) {
      const fv = (r.fieldValues && typeof r.fieldValues === 'object') ? (r.fieldValues as Record<string, any>) : {};
      for (const k of Object.keys(fv)) {
        if (k.startsWith('field')) {
          if (this.hasFieldValue(fv[k])) {
            activeKeys.add(k);
          }
        }
      }
    }

    const sortedKeys = Array.from(activeKeys).sort((a: string, b: string) => {
      const numA = Number(a.replace('field', ''));
      const numB = Number(b.replace('field', ''));
      return numA - numB;
    });

    return sortedKeys.map((key: string) => {
      const num = Number(key.replace('field', '')) || 1;
      return { fieldNumber: num, fieldKey: key, label: `Field ${num}`, metric: 'other', zone: 'none', unit: '' };
    });
  }

  /**
    * Helper to round numbers to 2 decimal places safely.
    */
  private round(val: number | null | undefined): number | null {
    if (val === null || val === undefined) return null;
    return Math.round(val * 100) / 100;
  }

  /**
   * Generates CSV export for a device's sensor readings.
   * Dynamically generates columns based on device fieldMappings when available.
   */
  async exportCsv(
    deviceId: string,
    query: ExportQueryInput,
    user: SafeUser
  ): Promise<{ csv: string; filename: string }> {
    const device = await this.getAuthorizedDevice(deviceId, user);

    // Fetch device fieldMappings for dynamic column headers
    const fullDevice = await prisma.device.findUnique({
      where: { id: device.id },
      select: { fieldMappings: true },
    });
    const mappings: any[] = this.normalizeMappings(fullDevice?.fieldMappings);

    const where: Prisma.SensorReadingWhereInput = { deviceId: device.id };
    if (query.from || query.to) {
      where.recordedAt = {};
      if (query.from) where.recordedAt.gte = new Date(query.from);
      if (query.to) where.recordedAt.lte = new Date(query.to);
    }

    // Chronological order (ASC), strictly bounded by limit
    const readings = await prisma.sensorReading.findMany({
      where,
      orderBy: { recordedAt: 'asc' },
      take: query.limit,
      select: {
        recordedAt: true,
        coldTemperature: true,
        hotTemperature: true,
        humidity: true,
        fieldValues: true,
      },
    });

    const effectiveMappings = mappings.length > 0 ? mappings : this.deriveMappingsFromFieldValues(readings);

    const filename = this.generateFilename(device.deviceCode, 'csv');

    if (effectiveMappings.length > 0) {
      // Dynamic CSV headers from device fieldMappings or derived fieldValues
      const fieldHeaders = effectiveMappings.map((m: any) => {
        const unit = m.unit ? ` (${m.unit})` : '';
        return `${m.label}${unit}`;
      });
      const headerRow = ['recordedAt', 'deviceCode', 'deviceName', ...fieldHeaders].join(',');
      const rows: string[] = [headerRow];

      for (const r of readings) {
        const fv = (r.fieldValues && typeof r.fieldValues === 'object') ? (r.fieldValues as Record<string, any>) : {};
        const fieldValues = effectiveMappings.map((m: any) => {
          const val = fv[m.fieldKey] ?? null;
          return this.escapeCsvValue(val);
        });
        const row = [
          this.escapeCsvValue(r.recordedAt.toISOString()),
          this.escapeCsvValue(device.deviceCode),
          this.escapeCsvValue(device.name),
          ...fieldValues,
        ].join(',');
        rows.push(row);
      }

      const csvContent = rows.join('\r\n') + '\r\n';
      return { csv: csvContent, filename };
    }

    // Legacy fallback: fixed 3-column format (only when no fieldMappings AND no fieldValues exist)
    const headerRow = 'recordedAt,deviceCode,deviceName,coldTemperature,hotTemperature,humidity';
    const rows: string[] = [headerRow];

    for (const r of readings) {
      const row = [
        this.escapeCsvValue(r.recordedAt.toISOString()),
        this.escapeCsvValue(device.deviceCode),
        this.escapeCsvValue(device.name),
        this.escapeCsvValue(r.coldTemperature ?? ''),
        this.escapeCsvValue(r.hotTemperature ?? ''),
        this.escapeCsvValue(r.humidity ?? ''),
      ].join(',');
      rows.push(row);
    }

    const csvContent = rows.join('\r\n') + '\r\n';
    return { csv: csvContent, filename };
  }

  /**
   * Generates a professional PDF report for a device's sensor readings, summary, and alerts.
   */
  async exportPdf(
    deviceId: string,
    query: ExportQueryInput,
    user: SafeUser
  ): Promise<{ pdfBuffer: Buffer; filename: string }> {
    const device = await this.getAuthorizedDevice(deviceId, user);

    // Fetch device fieldMappings for dynamic PDF columns
    const fullDevice = await prisma.device.findUnique({
      where: { id: device.id },
      select: { fieldMappings: true },
    });
    const mappings: any[] = this.normalizeMappings(fullDevice?.fieldMappings);

    const where: Prisma.SensorReadingWhereInput = { deviceId: device.id };
    if (query.from || query.to) {
      where.recordedAt = {};
      if (query.from) where.recordedAt.gte = new Date(query.from);
      if (query.to) where.recordedAt.lte = new Date(query.to);
    }

    // 1. Efficient aggregate summary query across the entire requested period
    const [aggregations, latestReading, alerts, tableReadings] = await Promise.all([
      prisma.sensorReading.aggregate({
        where,
        _count: { id: true },
        _min: {
          coldTemperature: true,
          hotTemperature: true,
          humidity: true,
          recordedAt: true,
        },
        _max: {
          coldTemperature: true,
          hotTemperature: true,
          humidity: true,
          recordedAt: true,
        },
        _avg: {
          coldTemperature: true,
          hotTemperature: true,
          humidity: true,
        },
      }),
      prisma.sensorReading.findFirst({
        where: { deviceId: device.id },
        orderBy: { recordedAt: 'desc' },
        select: {
          coldTemperature: true,
          hotTemperature: true,
          humidity: true,
          fieldValues: true,
          recordedAt: true,
        },
      }),
      prisma.alert.findMany({
        where: { deviceId: device.id },
        orderBy: { triggeredAt: 'desc' },
        take: 15,
        select: {
          id: true,
          type: true,
          severity: true,
          message: true,
          isResolved: true,
          triggeredAt: true,
          resolvedAt: true,
        },
      }),
      // Bound the detailed sensor readings in the PDF table to maintain low memory footprint
      prisma.sensorReading.findMany({
        where,
        orderBy: { recordedAt: 'asc' },
        take: Math.min(query.limit, 250),
        select: {
          recordedAt: true,
          coldTemperature: true,
          hotTemperature: true,
          humidity: true,
          fieldValues: true,
        },
      }),
    ]);

    const effectiveMappings = mappings.length > 0 ? mappings : this.deriveMappingsFromFieldValues(tableReadings);

    const filename = this.generateFilename(device.deviceCode, 'pdf');

    // 2. Build PDF Document
    const pdf = new SimplePdfDocument();

    // Brand Title Header (Dark slate background bar)
    pdf.drawRect(40, 725, 532, 45, 0.08, 0.12, 0.22);
    pdf.drawText('INFINOS SMART DELIVERY BAG SYSTEM', 55, 750, {
      font: 'F2',
      fontSize: 14,
      r: 1,
      g: 1,
      b: 1,
    });
    pdf.drawText('Sensor Telemetry & Operational Quality Audit Report', 55, 735, {
      font: 'F1',
      fontSize: 9,
      r: 0.85,
      g: 0.9,
      b: 1,
    });

    // Metadata Card
    pdf.drawBorderedRect(40, 640, 532, 75, 0.85, 0.88, 0.92, 1, [0.97, 0.98, 1.0]);
    pdf.drawText('DEVICE INFORMATION', 52, 698, {
      font: 'F2',
      fontSize: 9.5,
      r: 0.15,
      g: 0.25,
      b: 0.5,
    });

    pdf.drawText(`Bag Code: ${device.deviceCode}`, 52, 680, { font: 'F2', fontSize: 9 });
    pdf.drawText(`Device Name: ${device.name}`, 52, 665, { font: 'F1', fontSize: 9 });
    pdf.drawText(
      `Generated: ${new Date().toISOString().replace('T', ' ').substring(0, 19)} UTC`,
      52,
      650,
      { font: 'F1', fontSize: 8.5, r: 0.4, g: 0.4, b: 0.4 }
    );

    const periodStr =
      query.from || query.to
        ? `${query.from ? query.from.substring(0, 10) : 'Start'} to ${query.to ? query.to.substring(0, 10) : 'Present'}`
        : 'All Available History';
    pdf.drawText(`Period: ${periodStr}`, 300, 680, { font: 'F1', fontSize: 9 });
    pdf.drawText(`Total Records: ${aggregations._count.id}`, 300, 665, {
      font: 'F2',
      fontSize: 9,
      r: 0.1,
      g: 0.5,
      b: 0.2,
    });
    pdf.drawText(`Export Limit: ${query.limit} readings`, 300, 650, {
      font: 'F1',
      fontSize: 8.5,
      r: 0.4,
      g: 0.4,
      b: 0.4,
    });

    // KPI Summary Section
    pdf.drawText('TELEMETRY SUMMARY (STATISTICAL AGGREGATES)', 40, 622, {
      font: 'F2',
      fontSize: 10,
      r: 0.1,
      g: 0.15,
      b: 0.25,
    });

    if (effectiveMappings.length > 0) {
      // Dynamic KPI Cards generated from the ACTUAL device fields.
      // One card per field; numeric fields get Latest/Min/Max/Avg,
      // non-numeric fields show their raw Latest value (no fabricated statistics).
      const latestFv = (latestReading?.fieldValues && typeof latestReading.fieldValues === 'object')
        ? (latestReading.fieldValues as Record<string, any>)
        : {};

      const cards = effectiveMappings.slice(0, 8);
      const colsCount = Math.min(cards.length, 3);
      const boxW = Math.floor((532 - (colsCount - 1) * 11) / colsCount);
      const boxH = 58;
      const startY = 550;

      cards.forEach((m: any, idx: number) => {
        const rowIdx = Math.floor(idx / 3);
        const colIdx = idx % 3;
        const xPos = 40 + colIdx * (boxW + 11);
        const yPos = startY - rowIdx * (boxH + 10);

        // Compute stats for fieldKey (numeric values only, incl. numeric strings)
        let minVal: number | null = null;
        let maxVal: number | null = null;
        let sumVal = 0;
        let cntVal = 0;

        for (const r of tableReadings) {
          const fv = (r.fieldValues && typeof r.fieldValues === 'object') ? (r.fieldValues as Record<string, any>) : {};
          const num = this.toFiniteNumber(fv[m.fieldKey]);
          if (num !== null) {
            minVal = minVal === null ? num : Math.min(minVal, num);
            maxVal = maxVal === null ? num : Math.max(maxVal, num);
            sumVal += num;
            cntVal++;
          }
        }

        const rawLatest = latestFv[m.fieldKey] !== undefined && latestFv[m.fieldKey] !== null
          ? latestFv[m.fieldKey]
          : (
            m.zone === 'cold' ? latestReading?.coldTemperature :
            m.zone === 'hot' ? latestReading?.hotTemperature :
            m.metric === 'humidity' ? latestReading?.humidity : null
          );
        const isNumericField = cntVal > 0 || this.toFiniteNumber(rawLatest) !== null;

        const unitStr = m.unit ? ` (${m.unit})` : '';
        const titleText = `${m.label}${unitStr}`;

        pdf.drawBorderedRect(xPos, yPos, boxW, boxH, 0.82, 0.85, 0.9, 1, [0.96, 0.97, 0.99]);
        pdf.drawText(titleText.substring(0, 26), xPos + 8, yPos + 42, {
          font: 'F2',
          fontSize: 8.5,
          r: 0.1,
          g: 0.3,
          b: 0.6,
        });
        const latestStr = rawLatest !== null && rawLatest !== undefined && !(typeof rawLatest === 'string' && rawLatest.trim() === '')
          ? this.formatFieldValue(rawLatest, m.unit || '')
          : 'N/A';
        pdf.drawText(
          `Latest: ${latestStr}`,
          xPos + 8,
          yPos + 28,
          { font: 'F2', fontSize: 8.5, r: 0.1, g: 0.1, b: 0.1 }
        );
        pdf.drawText(
          isNumericField
            ? `Min: ${minVal !== null ? minVal.toFixed(1) : 'N/A'} | Max: ${maxVal !== null ? maxVal.toFixed(1) : 'N/A'} | Avg: ${cntVal > 0 ? (sumVal / cntVal).toFixed(1) : 'N/A'}`
            : `Readings: ${tableReadings.length} (non-numeric)`,
          xPos + 8,
          yPos + 12,
          { font: 'F1', fontSize: 7.5, r: 0.35, g: 0.35, b: 0.35 }
        );
      });

      const totalRows = Math.ceil(cards.length / 3);
      pdf.setY(startY - (totalRows - 1) * (boxH + 10) - 20);
    } else {
      // Legacy fallback KPI cards if no fieldMappings defined
      const boxW = 170;
      const boxH = 68;
      const startY = 545;

      // Cold Temp Card
      pdf.drawBorderedRect(40, startY, boxW, boxH, 0.75, 0.85, 0.95, 1, [0.93, 0.97, 1.0]);
      pdf.drawText('Cold Compartment (°C)', 50, startY + 52, {
        font: 'F2',
        fontSize: 9,
        r: 0.05,
        g: 0.35,
        b: 0.75,
      });
      pdf.drawText(
        `Latest: ${latestReading?.coldTemperature !== null && latestReading?.coldTemperature !== undefined ? `${latestReading.coldTemperature} °C` : 'N/A'}`,
        50,
        startY + 38,
        { font: 'F2', fontSize: 9, r: 0.1, g: 0.1, b: 0.1 }
      );
      pdf.drawText(
        `Min: ${this.round(aggregations._min.coldTemperature) ?? 'N/A'} °C | Max: ${this.round(aggregations._max.coldTemperature) ?? 'N/A'} °C`,
        50,
        startY + 24,
        { font: 'F1', fontSize: 8, r: 0.3, g: 0.3, b: 0.3 }
      );
      pdf.drawText(
        `Average: ${this.round(aggregations._avg.coldTemperature) ?? 'N/A'} °C`,
        50,
        startY + 10,
        { font: 'F1', fontSize: 8, r: 0.3, g: 0.3, b: 0.3 }
      );

      // Hot Temp Card
      pdf.drawBorderedRect(221, startY, boxW, boxH, 0.95, 0.82, 0.78, 1, [1.0, 0.96, 0.95]);
      pdf.drawText('Hot Compartment (°C)', 231, startY + 52, {
        font: 'F2',
        fontSize: 9,
        r: 0.85,
        g: 0.25,
        b: 0.15,
      });
      pdf.drawText(
        `Latest: ${latestReading?.hotTemperature !== null && latestReading?.hotTemperature !== undefined ? `${latestReading.hotTemperature} °C` : 'N/A'}`,
        231,
        startY + 38,
        { font: 'F2', fontSize: 9, r: 0.1, g: 0.1, b: 0.1 }
      );
      pdf.drawText(
        `Min: ${this.round(aggregations._min.hotTemperature) ?? 'N/A'} °C | Max: ${this.round(aggregations._max.hotTemperature) ?? 'N/A'} °C`,
        231,
        startY + 24,
        { font: 'F1', fontSize: 8, r: 0.3, g: 0.3, b: 0.3 }
      );
      pdf.drawText(
        `Average: ${this.round(aggregations._avg.hotTemperature) ?? 'N/A'} °C`,
        231,
        startY + 10,
        { font: 'F1', fontSize: 8, r: 0.3, g: 0.3, b: 0.3 }
      );

      // Humidity Card
      pdf.drawBorderedRect(402, startY, boxW, boxH, 0.8, 0.9, 0.8, 1, [0.94, 0.98, 0.94]);
      pdf.drawText('Relative Humidity (%)', 412, startY + 52, {
        font: 'F2',
        fontSize: 9,
        r: 0.15,
        g: 0.55,
        b: 0.25,
      });
      pdf.drawText(
        `Latest: ${latestReading?.humidity !== null && latestReading?.humidity !== undefined ? `${latestReading.humidity} %` : 'N/A'}`,
        412,
        startY + 38,
        { font: 'F2', fontSize: 9, r: 0.1, g: 0.1, b: 0.1 }
      );
      pdf.drawText(
        `Min: ${this.round(aggregations._min.humidity) ?? 'N/A'} % | Max: ${this.round(aggregations._max.humidity) ?? 'N/A'} %`,
        412,
        startY + 24,
        { font: 'F1', fontSize: 8, r: 0.3, g: 0.3, b: 0.3 }
      );
      pdf.drawText(
        `Average: ${this.round(aggregations._avg.humidity) ?? 'N/A'} %`,
        412,
        startY + 10,
        { font: 'F1', fontSize: 8, r: 0.3, g: 0.3, b: 0.3 }
      );

      pdf.setY(525);
    }

    // Alert Summary Section
    pdf.drawText(`RELEVANT ALERTS (${alerts.length} Recent)`, 40, pdf.getY(), {
      font: 'F2',
      fontSize: 10,
      r: 0.1,
      g: 0.15,
      b: 0.25,
    });
    pdf.setY(pdf.getY() - 14);

    const alertCols: PdfTableColumn[] = [
      { header: 'Alert Type', width: 140 },
      { header: 'Severity', width: 65, align: 'center' },
      { header: 'Status', width: 65, align: 'center' },
      { header: 'Triggered (UTC)', width: 130 },
      { header: 'Resolved (UTC)', width: 132 },
    ];

    if (alerts.length === 0) {
      pdf.drawBorderedRect(40, pdf.getY() - 15, 532, 24, 0.88, 0.88, 0.88, 1, [0.98, 0.98, 0.98]);
      pdf.drawText('No operational alerts recorded for this device.', 52, pdf.getY() - 8, {
        font: 'F1',
        fontSize: 8.5,
        r: 0.45,
        g: 0.45,
        b: 0.45,
      });
      pdf.setY(pdf.getY() - 26);
    } else {
      // Alert table header
      pdf.drawTableRow(alertCols, alertCols.map((c) => c.header), pdf.getY() - 14, 18, {
        isHeader: true,
        bgR: 0.25,
        bgG: 0.3,
        bgB: 0.38,
      });
      pdf.setY(pdf.getY() - 14);

      for (let i = 0; i < alerts.length; i++) {
        pdf.checkPageBreak(20);
        const a = alerts[i];
        const rowVals = [
          String(a.type || '').replace(/_/g, ' '),
          String(a.severity || ''),
          a.isResolved ? 'RESOLVED' : 'ACTIVE',
          a.triggeredAt ? a.triggeredAt.toISOString().replace('T', ' ').substring(0, 19) : '',
          a.resolvedAt ? a.resolvedAt.toISOString().replace('T', ' ').substring(0, 19) : 'Active',
        ];
        const isEven = i % 2 === 0;
        pdf.drawTableRow(alertCols, rowVals, pdf.getY() - 14, 16, {
          bgR: isEven ? 0.98 : 1.0,
          bgG: isEven ? 0.98 : 1.0,
          bgB: isEven ? 0.99 : 1.0,
        });
        pdf.setY(pdf.getY() - 14);
      }
      pdf.setY(pdf.getY() - 10);
    }

    // Sensor Readings Table Section
    pdf.checkPageBreak(60);
    pdf.drawText(
      `RECORDED SENSOR READINGS (${tableReadings.length}${aggregations._count.id > tableReadings.length ? ` of ${aggregations._count.id}` : ''})`,
      40,
      pdf.getY(),
      {
        font: 'F2',
        fontSize: 10,
        r: 0.1,
        g: 0.15,
        b: 0.25,
      }
    );
    pdf.setY(pdf.getY() - 14);

    // Build dynamic reading columns from effectiveMappings, or use legacy 3-column layout
    const readingCols: PdfTableColumn[] = [{ header: 'Timestamp (UTC)', width: 160 }];
    if (effectiveMappings.length > 0) {
      const fieldColWidth = Math.min(Math.floor(372 / effectiveMappings.length), 130);
      for (const m of effectiveMappings) {
        const unit = m.unit ? ` (${m.unit})` : '';
        readingCols.push({ header: `${m.label}${unit}`, width: fieldColWidth, align: 'right' });
      }
    } else {
      readingCols.push(
        { header: 'Cold Temp (C)', width: 120, align: 'right' },
        { header: 'Hot Temp (C)', width: 120, align: 'right' },
        { header: 'Humidity (%)', width: 132, align: 'right' }
      );
    }

    if (tableReadings.length === 0) {
      pdf.drawBorderedRect(40, pdf.getY() - 15, 532, 24, 0.88, 0.88, 0.88, 1, [0.98, 0.98, 0.98]);
      pdf.drawText('No sensor readings found for the selected time window.', 52, pdf.getY() - 8, {
        font: 'F1',
        fontSize: 8.5,
        r: 0.45,
        g: 0.45,
        b: 0.45,
      });
    } else {
      // Readings table header
      pdf.drawTableRow(readingCols, readingCols.map((c) => c.header), pdf.getY() - 14, 18, {
        isHeader: true,
        bgR: 0.15,
        bgG: 0.22,
        bgB: 0.35,
      });
      pdf.setY(pdf.getY() - 14);

      for (let i = 0; i < tableReadings.length; i++) {
        if (pdf.checkPageBreak(25)) {
          // Re-draw header on new page
          pdf.drawTableRow(readingCols, readingCols.map((c) => c.header), pdf.getY() - 14, 18, {
            isHeader: true,
            bgR: 0.15,
            bgG: 0.22,
            bgB: 0.35,
          });
          pdf.setY(pdf.getY() - 14);
        }

        const r = tableReadings[i];
        let rowVals: string[];

        if (effectiveMappings.length > 0) {
          const fv = (r.fieldValues && typeof r.fieldValues === 'object') ? (r.fieldValues as Record<string, any>) : {};
          rowVals = [
            r.recordedAt.toISOString().replace('T', ' ').substring(0, 19),
            ...effectiveMappings.map((m: any) => this.formatFieldValue(fv[m.fieldKey], m.unit || '')),
          ];
        } else {
          rowVals = [
            r.recordedAt.toISOString().replace('T', ' ').substring(0, 19),
            r.coldTemperature !== null ? `${r.coldTemperature.toFixed(1)} C` : '--',
            r.hotTemperature !== null ? `${r.hotTemperature.toFixed(1)} C` : '--',
            r.humidity !== null ? `${r.humidity.toFixed(1)} %` : '--',
          ];
        }

        const isEven = i % 2 === 0;
        pdf.drawTableRow(readingCols, rowVals, pdf.getY() - 13, 15, {
          bgR: isEven ? 0.97 : 1.0,
          bgG: isEven ? 0.97 : 1.0,
          bgB: isEven ? 0.98 : 1.0,
        });
        pdf.setY(pdf.getY() - 13);
      }
    }

    const pdfBuffer = pdf.build();
    return { pdfBuffer, filename };
  }
}

export const exportService = new ExportService();
