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

    // ----------------------------------------------------
    // TEST 8: Dynamic Field Preservation in PDF and CSV
    // ----------------------------------------------------
    console.log('Test 8: Dynamic field preservation in PDF and CSV...');

    (prisma.device.findUnique as any) = async (query: any) => {
      if (query?.select?.fieldMappings !== undefined) {
        return { id: 'dev-dynamic', deviceCode: 'BAG-DYN', name: 'Dynamic Bag', fieldMappings: null };
      }
      return { id: 'dev-dynamic', deviceCode: 'BAG-DYN', name: 'Dynamic Bag', ownerId: adminUser.id, createdAt: new Date() };
    };

    const dynamicReadings = [
      {
        recordedAt: new Date('2026-09-08T10:00:00.000Z'),
        coldTemperature: null,
        hotTemperature: null,
        humidity: null,
        fieldValues: { field1: 4.2, field2: 5.1 },
      },
      {
        recordedAt: new Date('2026-09-08T10:05:00.000Z'),
        coldTemperature: null,
        hotTemperature: null,
        humidity: null,
        fieldValues: { field1: 4.5, field2: 5.3 },
      },
    ];

    (prisma.sensorReading.findMany as any) = async () => dynamicReadings;
    (prisma.sensorReading.aggregate as any) = async () => ({
      _count: { id: 2 },
      _min: { coldTemperature: null, hotTemperature: null, humidity: null, recordedAt: dynamicReadings[0].recordedAt },
      _max: { coldTemperature: null, hotTemperature: null, humidity: null, recordedAt: dynamicReadings[1].recordedAt },
      _avg: { coldTemperature: null, hotTemperature: null, humidity: null },
    });
    (prisma.sensorReading.findFirst as any) = async () => dynamicReadings[1];
    (prisma.alert.findMany as any) = async () => [];

    const csvRes = await exportService.exportCsv('dev-dynamic', { limit: 100 }, adminUser);
    assert.ok(csvRes.csv.includes('Field 1'), 'CSV must contain Field 1 column');
    assert.ok(csvRes.csv.includes('Field 2'), 'CSV must contain Field 2 column');
    assert.ok(!csvRes.csv.includes('coldTemperature'), 'CSV must NOT contain legacy coldTemperature column');
    assert.ok(!csvRes.csv.includes('hotTemperature'), 'CSV must NOT contain legacy hotTemperature column');
    assert.ok(!csvRes.csv.includes('humidity'), 'CSV must NOT contain legacy humidity column');

    const { pdfBuffer } = await exportService.exportPdf('dev-dynamic', { limit: 100 }, adminUser);
    const pdfStr = pdfBuffer.toString('utf-8');
    assert.ok(pdfStr.includes('Field 1'), 'PDF must contain Field 1 label');
    assert.ok(pdfStr.includes('Field 2'), 'PDF must contain Field 2 label');
    assert.ok(pdfStr.includes('4.2') || pdfStr.includes('4.5'), 'PDF must contain Field 1 values');
    assert.ok(pdfStr.includes('5.1') || pdfStr.includes('5.3'), 'PDF must contain Field 2 values');
    assert.ok(!pdfStr.includes('Cold Compartment (°C)') || pdfStr.indexOf('Cold Compartment (°C)') > pdfStr.indexOf('Field 1'),
      'PDF should prefer Field labels over legacy Cold Compartment');

    // Test 8b: Verify legacy fallback still works when no fieldValues exist
    (prisma.sensorReading.findMany as any) = async () => [];
    (prisma.sensorReading.aggregate as any) = async () => ({
      _count: { id: 0 }, _min: { coldTemperature: null, hotTemperature: null, humidity: null, recordedAt: null },
      _max: { coldTemperature: null, hotTemperature: null, humidity: null, recordedAt: null },
      _avg: { coldTemperature: null, hotTemperature: null, humidity: null },
    });
    (prisma.sensorReading.findFirst as any) = async () => null;
    const legacyCsvRes = await exportService.exportCsv('dev-dynamic', { limit: 10 }, adminUser);
    assert.ok(legacyCsvRes.csv.includes('coldTemperature,hotTemperature,humidity'), 'Legacy CSV fallback must work');

    console.log('✓ Test 8 passed: Dynamic field preservation works in PDF and CSV.');

    // ----------------------------------------------------
    // TEST 9: CRITICAL Cold+Cold fixture — true PDF bytes (BAG-TEST-001)
    // ----------------------------------------------------
    console.log('Test 9: Critical Cold+Cold fixture BAG-TEST-001 — real PDF bytes...');

    const coldColdMappings = [
      { fieldNumber: 1, fieldKey: 'field1', label: 'Cold Compartment 1', metric: 'temperature', zone: 'cold', unit: '°C' },
      { fieldNumber: 2, fieldKey: 'field2', label: 'Cold Compartment 2', metric: 'temperature', zone: 'cold', unit: '°C' },
    ];
    const coldColdReadings = [
      {
        recordedAt: new Date('2026-09-08T10:00:00.000Z'),
        coldTemperature: null,
        hotTemperature: null,
        humidity: null,
        fieldValues: { field1: 4.2, field2: 5.1 },
      },
      {
        recordedAt: new Date('2026-09-08T10:05:00.000Z'),
        coldTemperature: null,
        hotTemperature: null,
        humidity: null,
        fieldValues: { field1: 4.4, field2: 5.3 },
      },
      {
        recordedAt: new Date('2026-09-08T10:10:00.000Z'),
        coldTemperature: null,
        hotTemperature: null,
        humidity: null,
        fieldValues: { field1: 4.1, field2: 5.0 },
      },
    ];

    (prisma.device.findUnique as any) = async (query: any) => {
      if (query?.select?.fieldMappings !== undefined) {
        return { id: 'dev-test-001', fieldMappings: coldColdMappings };
      }
      return { id: 'dev-test-001', deviceCode: 'BAG-TEST-001', name: 'Test Bag 001', ownerId: adminUser.id, createdAt: new Date() };
    };
    (prisma.sensorReading.findMany as any) = async () => coldColdReadings;
    (prisma.sensorReading.aggregate as any) = async () => ({
      _count: { id: 3 },
      _min: { coldTemperature: null, hotTemperature: null, humidity: null, recordedAt: coldColdReadings[0].recordedAt },
      _max: { coldTemperature: null, hotTemperature: null, humidity: null, recordedAt: coldColdReadings[2].recordedAt },
      _avg: { coldTemperature: null, hotTemperature: null, humidity: null },
    });
    (prisma.sensorReading.findFirst as any) = async () => coldColdReadings[2];
    (prisma.alert.findMany as any) = async () => [];

    const criticalPdf = await exportService.exportPdf('dev-test-001', { limit: 100 }, adminUser);
    const criticalStr = criticalPdf.pdfBuffer.toString('utf-8');
    assert.ok(criticalStr.includes('Cold Compartment 1'), 'PDF MUST contain "Cold Compartment 1"');
    assert.ok(criticalStr.includes('4.2'), 'PDF MUST contain value "4.2"');
    assert.ok(criticalStr.includes('Cold Compartment 2'), 'PDF MUST contain "Cold Compartment 2"');
    assert.ok(criticalStr.includes('5.1'), 'PDF MUST contain value "5.1"');
    assert.equal(criticalStr.includes('Hot Compartment'), false, 'PDF MUST NOT contain "Hot Compartment" for Cold+Cold bag');
    assert.equal(criticalStr.includes('Relative Humidity'), false, 'PDF MUST NOT contain "Relative Humidity" for Cold+Cold bag');
    assert.equal(criticalStr.includes('Cold Temp (C)'), false, 'PDF MUST NOT contain legacy "Cold Temp (C)" column');
    assert.equal(criticalStr.includes('Hot Temp (C)'), false, 'PDF MUST NOT contain legacy "Hot Temp (C)" column');
    assert.equal(criticalStr.includes('Humidity (%)'), false, 'PDF MUST NOT contain legacy "Humidity (%)" column');
    // Separate statistics for both fields (min/max/avg over 4.2,4.4,4.1 and 5.1,5.3,5.0)
    assert.ok(criticalStr.includes('4.1'), 'PDF MUST contain field1 min "4.1"');
    assert.ok(criticalStr.includes('4.4'), 'PDF MUST contain field1 max "4.4"');
    assert.ok(criticalStr.includes('5.0'), 'PDF MUST contain field2 min "5.0"');
    assert.ok(criticalStr.includes('5.3'), 'PDF MUST contain field2 max "5.3"');

    const criticalCsv = await exportService.exportCsv('dev-test-001', { limit: 100 }, adminUser);
    assert.ok(criticalCsv.csv.includes('Cold Compartment 1'), 'CSV MUST contain "Cold Compartment 1" header');
    assert.ok(criticalCsv.csv.includes('Cold Compartment 2'), 'CSV MUST contain "Cold Compartment 2" header');
    assert.ok(criticalCsv.csv.includes('4.2'), 'CSV MUST contain value 4.2');
    assert.ok(criticalCsv.csv.includes('5.1'), 'CSV MUST contain value 5.1');

    console.log('✓ Test 9 passed: BAG-TEST-001 PDF bytes contain both dynamic fields, zero legacy columns.');

    // ----------------------------------------------------
    // TEST 10: Field-agnostic matrix A–J — same PDF code path
    // ----------------------------------------------------
    console.log('Test 10: Field-agnostic matrix A-J...');

    const LEGACY_TOKENS = ['Hot Compartment', 'Relative Humidity', 'Cold Temp (C)', 'Hot Temp (C)', 'Humidity (%)', 'Cold Compartment (°C)', 'Hot Compartment (°C)'];
    const mkMapping = (n: number, label: string, unit = '') => ({
      fieldNumber: n, fieldKey: `field${n}`, label, metric: 'other', zone: 'none', unit,
    });

    const matrixCases: Array<{ name: string; mappings: any[]; values: Record<string, any>; mustContain: string[]; mustLack: string[] }> = [
      { name: 'A. Cold + Cold', mappings: [mkMapping(1, 'Cold A', '°C'), mkMapping(2, 'Cold B', '°C')], values: { field1: 4.2, field2: 5.1 }, mustContain: ['Cold A', 'Cold B', '4.2', '5.1'], mustLack: LEGACY_TOKENS },
      { name: 'B. Hot + Hot', mappings: [mkMapping(1, 'Hot A', '°C'), mkMapping(2, 'Hot B', '°C')], values: { field1: 61.5, field2: 63.2 }, mustContain: ['Hot A', 'Hot B', '61.5', '63.2'], mustLack: ['Relative Humidity', 'Cold Temp (C)', 'Humidity (%)', 'Cold Compartment'] },
      { name: 'C. Cold + Hot', mappings: [mkMapping(1, 'Cold Zone', '°C'), mkMapping(2, 'Hot Zone', '°C')], values: { field1: 3.9, field2: 58.4 }, mustContain: ['Cold Zone', 'Hot Zone', '3.9', '58.4'], mustLack: ['Relative Humidity', 'Cold Temp (C)', 'Hot Temp (C)', 'Humidity (%)'] },
      { name: 'D. Humidity + Hot + Cold', mappings: [mkMapping(1, 'Humidity', '%'), mkMapping(2, 'Hot Cell', '°C'), mkMapping(3, 'Cold Cell', '°C')], values: { field1: 55.5, field2: 60.1, field3: 4.0 }, mustContain: ['Humidity', 'Hot Cell', 'Cold Cell', '55.5', '60.1', '4.0'], mustLack: ['Cold Temp (C)', 'Hot Temp (C)', 'Relative Humidity', 'Cold Compartment', 'Hot Compartment'] },
      { name: 'E. Humidity + Cold + Cold', mappings: [mkMapping(1, 'Humidity Top', '%'), mkMapping(2, 'Cold Left', '°C'), mkMapping(3, 'Cold Right', '°C')], values: { field1: 48.2, field2: 2.8, field3: 3.3 }, mustContain: ['Humidity Top', 'Cold Left', 'Cold Right', '48.2', '2.8', '3.3'], mustLack: ['Hot Compartment', 'Cold Temp (C)', 'Hot Temp (C)', 'Relative Humidity'] },
      { name: 'F. Hot + Hot + Humidity', mappings: [mkMapping(1, 'Heater 1', '°C'), mkMapping(2, 'Heater 2', '°C'), mkMapping(3, 'Moisture', '%')], values: { field1: 65.0, field2: 66.7, field3: 70.2 }, mustContain: ['Heater 1', 'Heater 2', 'Moisture', '65.0', '66.7', '70.2'], mustLack: ['Cold Temp (C)', 'Hot Temp (C)', 'Relative Humidity', 'Cold Compartment', 'Hot Compartment'] },
      { name: 'G. Battery + Door + Pressure + pH', mappings: [mkMapping(1, 'Battery Voltage', 'V'), { fieldNumber: 2, fieldKey: 'field2', label: 'Door Status', metric: 'other', zone: 'none', unit: '' }, mkMapping(3, 'Pressure', 'hPa'), { fieldNumber: 4, fieldKey: 'field4', label: 'pH', metric: 'other', zone: 'none', unit: '' }], values: { field1: 12.6, field2: 'OPEN', field3: 1013.2, field4: 7.1 }, mustContain: ['Battery Voltage', 'Door Status', 'Pressure', 'pH', '12.6', 'OPEN', '1013.2', '7.1'], mustLack: LEGACY_TOKENS },
      { name: 'H. 8 fields', mappings: [1, 2, 3, 4, 5, 6, 7, 8].map((n) => mkMapping(n, `Sensor ${n}`, '°C')), values: { field1: 1.1, field2: 2.2, field3: 3.3, field4: 4.4, field5: 5.5, field6: 6.6, field7: 7.7, field8: 8.8 }, mustContain: ['Sensor 1', 'Sensor 8', '1.1', '8.8'], mustLack: LEGACY_TOKENS },
      { name: 'I. Missing values', mappings: [mkMapping(1, 'Present Field', '°C'), mkMapping(2, 'Absent Field', '°C')], values: { field1: 9.9 }, mustContain: ['Present Field', 'Absent Field', '9.9', '--'], mustLack: LEGACY_TOKENS },
      { name: 'J. Unlabelled fields (derived)', mappings: [], values: { field1: 11.1, field2: 22.2 }, mustContain: ['Field 1', 'Field 2', '11.1', '22.2'], mustLack: LEGACY_TOKENS },
      { name: 'K. Numeric strings', mappings: [mkMapping(1, 'String Cold', '°C'), mkMapping(2, 'String Cold 2', '°C')], values: { field1: '4.2', field2: '5.1' }, mustContain: ['String Cold', 'String Cold 2', '4.2', '5.1'], mustLack: LEGACY_TOKENS },
    ];

    for (const tc of matrixCases) {
      const readings = [
        { recordedAt: new Date('2026-09-08T10:00:00.000Z'), coldTemperature: null, hotTemperature: null, humidity: null, fieldValues: { ...tc.values } },
        { recordedAt: new Date('2026-09-08T10:05:00.000Z'), coldTemperature: null, hotTemperature: null, humidity: null, fieldValues: { ...tc.values } },
      ];
      (prisma.device.findUnique as any) = async (query: any) => {
        if (query?.select?.fieldMappings !== undefined) {
          return { id: 'dev-matrix', fieldMappings: tc.mappings.length > 0 ? tc.mappings : null };
        }
        return { id: 'dev-matrix', deviceCode: 'BAG-MATRIX', name: 'Matrix Bag', ownerId: adminUser.id, createdAt: new Date() };
      };
      (prisma.sensorReading.findMany as any) = async () => readings;
      (prisma.sensorReading.aggregate as any) = async () => ({
        _count: { id: 2 },
        _min: { coldTemperature: null, hotTemperature: null, humidity: null, recordedAt: readings[0].recordedAt },
        _max: { coldTemperature: null, hotTemperature: null, humidity: null, recordedAt: readings[1].recordedAt },
        _avg: { coldTemperature: null, hotTemperature: null, humidity: null },
      });
      (prisma.sensorReading.findFirst as any) = async () => readings[1];
      (prisma.alert.findMany as any) = async () => [];

      const { pdfBuffer } = await exportService.exportPdf('dev-matrix', { limit: 100 }, adminUser);
      const pdfText = pdfBuffer.toString('utf-8');
      for (const token of tc.mustContain) {
        assert.ok(pdfText.includes(token), `${tc.name}: PDF MUST contain "${token}"`);
      }
      for (const token of tc.mustLack) {
        assert.equal(pdfText.includes(token), false, `${tc.name}: PDF MUST NOT contain legacy token "${token}"`);
      }
      // No literal NaN from Number(string).toFixed on non-numeric fields
      assert.equal(pdfText.includes('NaN'), false, `${tc.name}: PDF MUST NOT contain "NaN"`);
      console.log(`  ✓ ${tc.name}`);
    }

    console.log('✓ Test 10 passed: matrix A–K handled by the same field-agnostic PDF path.');

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
