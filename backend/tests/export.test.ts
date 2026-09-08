import assert from 'node:assert/strict';
import { UserRole, AlertType, AlertSeverity } from '@prisma/client';
import { exportQuerySchema } from '../src/modules/export/export.validation.js';
import { exportService, ExportService } from '../src/modules/export/export.service.js';
import { SimplePdfDocument } from '../src/modules/export/pdf-builder.js';
import { prisma } from '../src/config/database.js';
import { SafeUser } from '../src/types/auth.types.js';

async function runExportTests() {
  console.log('====================================================');
  console.log('--- Running Part 7: Sensor Data Exports (CSV + PDF) Tests ---');
  console.log('====================================================');

  // ----------------------------------------------------
  // TEST 1: Safe Filename Generation & Path Sanitization
  // ----------------------------------------------------
  console.log('Test 1: Safe filename generation and sanitization...');
  const testService = new ExportService();

  const safeCsvName = testService.generateFilename('BAG-001', 'csv');
  const safePdfName = testService.generateFilename('BAG-001', 'pdf');
  const todayStr = new Date().toISOString().split('T')[0];

  assert.equal(
    safeCsvName,
    `INFINOS_BAG-001_readings_${todayStr}.csv`,
    'CSV filename must match convention INFINOS_<deviceCode>_readings_<date>.csv'
  );
  assert.equal(
    safePdfName,
    `INFINOS_BAG-001_report_${todayStr}.pdf`,
    'PDF filename must match convention INFINOS_<deviceCode>_report_<date>.pdf'
  );

  // Dangerous / traversal characters sanitization
  const maliciousCode = '../../../etc/passwd; DROP TABLE "users"; <script>';
  const sanitized = testService.sanitizeFilenamePart(maliciousCode);
  assert.equal(
    sanitized.includes('/'),
    false,
    'Sanitized filename must not contain forward slashes'
  );
  assert.equal(
    sanitized.includes('\\'),
    false,
    'Sanitized filename must not contain backslashes'
  );
  assert.equal(
    sanitized.includes(';'),
    false,
    'Sanitized filename must not contain semicolons'
  );
  assert.equal(
    sanitized.includes('<'),
    false,
    'Sanitized filename must not contain HTML tags'
  );
  console.log('✓ Test 1 passed: Filenames correctly formatted and sanitized against traversal/injection.');

  // ----------------------------------------------------
  // TEST 2: Query Validation Schema & Range Enforcement
  // ----------------------------------------------------
  console.log('Test 2: Export query schema validation...');

  // Default limit
  const defaultQuery = exportQuerySchema.safeParse({});
  assert.equal(defaultQuery.success, true);
  if (defaultQuery.success) {
    assert.equal(defaultQuery.data.limit, 1000, 'Default limit must be 1000');
  }

  // Valid date range
  const validRange = exportQuerySchema.safeParse({
    from: '2026-09-01T00:00:00.000Z',
    to: '2026-09-08T23:59:59.000Z',
    limit: 500,
  });
  assert.equal(validRange.success, true);

  // Equal from and to (single instant)
  const equalRange = exportQuerySchema.safeParse({
    from: '2026-09-08T12:00:00.000Z',
    to: '2026-09-08T12:00:00.000Z',
  });
  assert.equal(equalRange.success, true);

  // Invalid: from > to
  const invalidRange = exportQuerySchema.safeParse({
    from: '2026-09-08T23:59:59.000Z',
    to: '2026-09-01T00:00:00.000Z',
  });
  assert.equal(invalidRange.success, false, 'from > to must be rejected');

  // Invalid date format
  const invalidDate = exportQuerySchema.safeParse({
    from: '2026-99-99',
  });
  assert.equal(invalidDate.success, false, 'Malformed ISO date must be rejected');

  // Invalid limit (> 10000)
  const excessiveLimit = exportQuerySchema.safeParse({
    limit: 50000,
  });
  assert.equal(excessiveLimit.success, false, 'Limit > 10000 must be rejected');

  // Invalid limit (negative or 0)
  const zeroLimit = exportQuerySchema.safeParse({
    limit: 0,
  });
  assert.equal(zeroLimit.success, false, 'Limit <= 0 must be rejected');
  console.log('✓ Test 2 passed: Query parameters strictly validated (date format, ranges, limits).');

  // ----------------------------------------------------
  // TEST 3: PDF Document Generator Structural Conformance
  // ----------------------------------------------------
  console.log('Test 3: Pure TypeScript PDF generator structural conformance...');
  const pdfDoc = new SimplePdfDocument();
  pdfDoc.drawText('INFINOS TEST REPORT', 50, 750, { fontSize: 16, font: 'F2' });
  pdfDoc.drawRect(50, 700, 500, 20, 0.1, 0.2, 0.3);
  pdfDoc.drawBorderedRect(50, 650, 500, 30, 0.8, 0.8, 0.8, 1, [0.95, 0.95, 0.95]);

  // Test pagination
  pdfDoc.checkPageBreak(700); // Forces new page
  pdfDoc.drawText('Page 2 Content', 50, 750);

  const pdfBuffer = pdfDoc.build();
  assert.ok(pdfBuffer instanceof Buffer, 'PDF build must return a Buffer');
  assert.ok(pdfBuffer.length > 500, 'PDF buffer must contain substantial bytes');

  const pdfStr = pdfBuffer.toString('utf-8');
  assert.ok(pdfStr.startsWith('%PDF-1.4'), 'PDF must start with %PDF-1.4 header');
  assert.ok(pdfStr.includes('trailer'), 'PDF must contain trailer dictionary');
  assert.ok(pdfStr.includes('startxref'), 'PDF must contain startxref offset');
  assert.ok(pdfStr.trimEnd().endsWith('%%EOF'), 'PDF must terminate with %%EOF');
  assert.ok(pdfStr.includes('/Type /Pages'), 'PDF must declare Pages catalog');
  assert.ok(pdfStr.includes('/Count 2'), 'PDF must accurately count pages');
  console.log('✓ Test 3 passed: PDF generator outputs valid, standards-compliant PDF-1.4 binary data.');

  // ----------------------------------------------------
  // TEST 4: CSV Generation, Ordering, Escaping & Nulls
  // ----------------------------------------------------
  console.log('Test 4: CSV export formatting, null handling, RFC 4180 escaping & chronological order...');

  const mockDevice = {
    id: 'dev-12345',
    deviceCode: 'BAG-001',
    name: 'Pharma Bag, "Cold Chain" Special\nZone A',
    ownerId: 'user-operator-1',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  const mockReadings = [
    {
      recordedAt: new Date('2026-09-08T10:00:00.000Z'),
      coldTemperature: 4.25,
      hotTemperature: 62.1,
      humidity: 55.4,
    },
    {
      // Null values test
      recordedAt: new Date('2026-09-08T10:05:00.000Z'),
      coldTemperature: null,
      hotTemperature: null,
      humidity: null,
    },
    {
      recordedAt: new Date('2026-09-08T10:10:00.000Z'),
      coldTemperature: 3.8,
      hotTemperature: 64.0,
      humidity: 50.0,
    },
  ];

  // Temporarily stub Prisma queries for isolated unit test
  const originalFindUnique = prisma.device.findUnique;
  const originalFindManyReadings = prisma.sensorReading.findMany;
  const originalAggregate = prisma.sensorReading.aggregate;
  const originalFindFirstReading = prisma.sensorReading.findFirst;
  const originalFindManyAlerts = prisma.alert.findMany;

  try {
    (prisma.device.findUnique as any) = async () => mockDevice;
    (prisma.sensorReading.findMany as any) = async () => mockReadings;

    const adminUser: SafeUser = {
      id: 'admin-1',
      email: 'admin@infinos.test',
      name: 'Test Admin',
      role: UserRole.ADMIN,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const { csv, filename } = await exportService.exportCsv(
      mockDevice.id,
      { limit: 100 },
      adminUser
    );

    assert.equal(filename, `INFINOS_BAG-001_readings_${todayStr}.csv`);

    const lines = csv.trim().split('\r\n');
    assert.equal(lines.length, 4, 'CSV must contain 1 header row + 3 data rows');

    // Verify Header
    assert.equal(
      lines[0],
      'recordedAt,deviceCode,deviceName,coldTemperature,hotTemperature,humidity'
    );

    // Verify Row 1: Valid readings
    assert.ok(lines[1].includes('2026-09-08T10:00:00.000Z,BAG-001'));
    assert.ok(lines[1].includes('4.25,62.1,55.4'));

    // Verify RFC 4180 Escaping for quotes and commas in device name
    assert.ok(
      lines[1].includes('"Pharma Bag, ""Cold Chain"" Special\nZone A"'),
      'Device name with quotes/commas must be RFC 4180 escaped'
    );

    // Verify Row 2: Null handling (must be empty between commas, no "null", no "NaN")
    assert.ok(
      lines[2].endsWith(',,,'),
      'Null sensor readings must result in empty CSV values'
    );
    assert.equal(lines[2].includes('null'), false, 'CSV must never contain literal "null" text');
    assert.equal(lines[2].includes('NaN'), false, 'CSV must never contain "NaN" text');

    // Verify Row 3: Chronological order
    assert.ok(lines[3].includes('2026-09-08T10:10:00.000Z'));
    assert.ok(lines[3].includes('3.8,64,50'));

    console.log('✓ Test 4 passed: CSV export correctly formats, escapes, orders, and handles nulls.');

    // ----------------------------------------------------
    // TEST 5: PDF Export Generation & Alert Summary
    // ----------------------------------------------------
    console.log('Test 5: PDF export generation with telemetry summaries & alert info...');

    const mockAlerts = [
      {
        id: 'alert-1',
        type: AlertType.COLD_TEMPERATURE_HIGH,
        severity: AlertSeverity.WARNING,
        message: 'Cold compartment temperature elevated to 7.2 C',
        isResolved: false,
        triggeredAt: new Date('2026-09-08T10:02:00.000Z'),
        resolvedAt: null,
      },
      {
        id: 'alert-2',
        type: AlertType.HOT_TEMPERATURE_LOW,
        severity: AlertSeverity.CRITICAL,
        message: 'Hot compartment temperature dropped to 42.0 C',
        isResolved: true,
        triggeredAt: new Date('2026-09-08T08:15:00.000Z'),
        resolvedAt: new Date('2026-09-08T08:45:00.000Z'),
      },
    ];

    (prisma.sensorReading.aggregate as any) = async () => ({
      _count: { id: 3 },
      _min: { coldTemperature: 3.8, hotTemperature: 62.1, humidity: 50.0, recordedAt: new Date('2026-09-08T10:00:00.000Z') },
      _max: { coldTemperature: 4.25, hotTemperature: 64.0, humidity: 55.4, recordedAt: new Date('2026-09-08T10:10:00.000Z') },
      _avg: { coldTemperature: 4.025, hotTemperature: 63.05, humidity: 52.7 },
    });

    (prisma.sensorReading.findFirst as any) = async () => mockReadings[2];
    (prisma.alert.findMany as any) = async () => mockAlerts;

    const { pdfBuffer: generatedPdf, filename: pdfFilename } = await exportService.exportPdf(
      mockDevice.id,
      { limit: 200 },
      adminUser
    );

    assert.equal(pdfFilename, `INFINOS_BAG-001_report_${todayStr}.pdf`);
    assert.ok(generatedPdf instanceof Buffer, 'PDF export must return a Buffer');
    assert.ok(generatedPdf.length > 1000, 'PDF export must produce valid binary document');

    const pdfContent = generatedPdf.toString('utf-8');
    assert.ok(pdfContent.includes('INFINOS SMART DELIVERY BAG SYSTEM'), 'PDF must include INFINOS title');
    assert.ok(pdfContent.includes('BAG-001'), 'PDF must include device code');
    assert.ok(pdfContent.includes('COLD TEMPERATURE HIGH'), 'PDF must include alert type');
    assert.ok(pdfContent.includes('HOT TEMPERATURE LOW'), 'PDF must include second alert type');
    assert.ok(pdfContent.includes('ACTIVE'), 'PDF must include active alert status');
    assert.ok(pdfContent.includes('RESOLVED'), 'PDF must include resolved alert status');

    console.log('✓ Test 5 passed: PDF export contains telemetry summaries, statistical KPI cards, and alert table.');

    // ----------------------------------------------------
    // TEST 6: RBAC & Device Ownership Enforcement
    // ----------------------------------------------------
    console.log('Test 6: RBAC & device ownership enforcement...');

    const operatorOwner: SafeUser = {
      id: 'user-operator-1',
      email: 'operator1@infinos.test',
      name: 'Owner Operator',
      role: UserRole.OPERATOR,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const operatorOther: SafeUser = {
      id: 'user-operator-2',
      email: 'operator2@infinos.test',
      name: 'Other Operator',
      role: UserRole.OPERATOR,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const viewerUser: SafeUser = {
      id: 'user-viewer-1',
      email: 'viewer@infinos.test',
      name: 'Viewer User',
      role: UserRole.VIEWER,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // 1. Owner operator can export CSV and PDF
    const operatorCsv = await exportService.exportCsv(mockDevice.id, { limit: 10 }, operatorOwner);
    assert.ok(operatorCsv.csv.length > 0);
    const operatorPdf = await exportService.exportPdf(mockDevice.id, { limit: 10 }, operatorOwner);
    assert.ok(operatorPdf.pdfBuffer.length > 0);

    // 2. Viewer can export CSV and PDF
    const viewerCsv = await exportService.exportCsv(mockDevice.id, { limit: 10 }, viewerUser);
    assert.ok(viewerCsv.csv.length > 0);

    // 3. Operator who DOES NOT own the device must be blocked (403 Forbidden)
    await assert.rejects(
      async () => {
        await exportService.exportCsv(mockDevice.id, { limit: 10 }, operatorOther);
      },
      (err: any) => {
        assert.equal(err.statusCode, 403, 'Operator without ownership must receive 403 Forbidden');
        assert.equal(err.code, 'FORBIDDEN');
        return true;
      }
    );

    await assert.rejects(
      async () => {
        await exportService.exportPdf(mockDevice.id, { limit: 10 }, operatorOther);
      },
      (err: any) => {
        assert.equal(err.statusCode, 403, 'Operator without ownership must receive 403 Forbidden');
        assert.equal(err.code, 'FORBIDDEN');
        return true;
      }
    );

    // 4. Non-existent device returns 404
    (prisma.device.findUnique as any) = async () => null;
    await assert.rejects(
      async () => {
        await exportService.exportCsv('non-existent-id', { limit: 10 }, adminUser);
      },
      (err: any) => {
        assert.equal(err.statusCode, 404, 'Non-existent device must return 404 Not Found');
        assert.equal(err.code, 'DEVICE_NOT_FOUND');
        return true;
      }
    );

    console.log('✓ Test 6 passed: RBAC and device ownership strictly enforced.');

    // ----------------------------------------------------
    // TEST 7: Empty Dataset Handling & Credential Non-Leakage
    // ----------------------------------------------------
    console.log('Test 7: Empty dataset handling and credential non-leakage...');

    (prisma.device.findUnique as any) = async () => ({
      id: 'dev-empty',
      deviceCode: 'BAG-EMPTY',
      name: 'Empty Bag',
      ownerId: adminUser.id,
      createdAt: new Date(),
    });

    (prisma.sensorReading.findMany as any) = async () => [];
    (prisma.sensorReading.aggregate as any) = async () => ({
      _count: { id: 0 },
      _min: { coldTemperature: null, hotTemperature: null, humidity: null, recordedAt: null },
      _max: { coldTemperature: null, hotTemperature: null, humidity: null, recordedAt: null },
      _avg: { coldTemperature: null, hotTemperature: null, humidity: null },
    });
    (prisma.sensorReading.findFirst as any) = async () => null;
    (prisma.alert.findMany as any) = async () => [];

    // Empty CSV
    const emptyCsvRes = await exportService.exportCsv('dev-empty', { limit: 100 }, adminUser);
    assert.ok(emptyCsvRes.csv.startsWith('recordedAt,deviceCode,deviceName,coldTemperature,hotTemperature,humidity'));
    const emptyCsvLines = emptyCsvRes.csv.trim().split('\r\n');
    assert.equal(emptyCsvLines.length, 1, 'Empty CSV must contain only header row');

    // Empty PDF
    const emptyPdfRes = await exportService.exportPdf('dev-empty', { limit: 100 }, adminUser);
    assert.ok(emptyPdfRes.pdfBuffer.length > 500, 'Empty PDF should still render clean document');
    const emptyPdfStr = emptyPdfRes.pdfBuffer.toString('utf-8');
    assert.ok(emptyPdfStr.includes('No sensor readings found'), 'Empty PDF indicates no readings found');
    assert.ok(emptyPdfStr.includes('No operational alerts recorded'), 'Empty PDF indicates no alerts recorded');

    // Credential Non-Leakage Check: verify sensitive strings are never in exports
    const sensitiveTokens = [
      'thingSpeakReadKey',
      'encryptedApiKey',
      'passwordHash',
      'jwtSecret',
      'postgres://',
      'API_KEY',
    ];

    for (const token of sensitiveTokens) {
      assert.equal(emptyCsvRes.csv.includes(token), false, `CSV must not leak ${token}`);
      assert.equal(emptyPdfStr.includes(token), false, `PDF must not leak ${token}`);
    }

    console.log('✓ Test 7 passed: Empty datasets cleanly handled and zero credentials leaked.');

  } finally {
    // Restore originals
    prisma.device.findUnique = originalFindUnique;
    prisma.sensorReading.findMany = originalFindManyReadings;
    prisma.sensorReading.aggregate = originalAggregate;
    prisma.sensorReading.findFirst = originalFindFirstReading;
    prisma.alert.findMany = originalFindManyAlerts;
  }

  console.log('====================================================');
  console.log('✓ ALL PART 7 SENSOR EXPORT TESTS PASSED SUCCESSFULLY!');
  console.log('====================================================');
}

runExportTests().catch((err) => {
  console.error('Part 7 export tests failed:', err);
  process.exit(1);
});
