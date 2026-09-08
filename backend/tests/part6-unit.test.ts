import assert from 'node:assert/strict';
import { AlertSeverity } from '@prisma/client';
import { alertConfig, calculateAlertSeverity } from '../src/config/alert.config.js';
import { updateDeviceSettingsSchema } from '../src/modules/settings/settings.validation.js';
import { listAlertsQuerySchema } from '../src/modules/alert/alert.validation.js';
import { analyticsQuerySchema } from '../src/modules/analytics/analytics.validation.js';

async function runPart6UnitTests() {
  console.log('====================================================');
  console.log('--- Running Part 6 Unit & Pure-Logic Tests ---');
  console.log('====================================================');

  // 1. Severity Calculation Tests
  console.log('Test 1: Alert severity calculation (WARNING vs CRITICAL)...');

  // Cold Temp High (limit: 6.0, margin: 2.0)
  assert.equal(
    calculateAlertSeverity(7.0, 6.0, alertConfig.criticalMargins.coldTemp, 'HIGH'),
    AlertSeverity.WARNING,
    '7.0 > 6.0 but < 8.0 must be WARNING'
  );
  assert.equal(
    calculateAlertSeverity(8.0, 6.0, alertConfig.criticalMargins.coldTemp, 'HIGH'),
    AlertSeverity.CRITICAL,
    '8.0 >= 6.0 + 2.0 must be CRITICAL'
  );
  assert.equal(
    calculateAlertSeverity(10.5, 6.0, alertConfig.criticalMargins.coldTemp, 'HIGH'),
    AlertSeverity.CRITICAL,
    '10.5 >= 8.0 must be CRITICAL'
  );

  // Cold Temp Low (limit: 1.0, margin: 2.0)
  assert.equal(
    calculateAlertSeverity(0.5, 1.0, alertConfig.criticalMargins.coldTemp, 'LOW'),
    AlertSeverity.WARNING,
    '0.5 < 1.0 but > -1.0 must be WARNING'
  );
  assert.equal(
    calculateAlertSeverity(-1.0, 1.0, alertConfig.criticalMargins.coldTemp, 'LOW'),
    AlertSeverity.CRITICAL,
    '-1.0 <= 1.0 - 2.0 must be CRITICAL'
  );
  assert.equal(
    calculateAlertSeverity(-3.5, 1.0, alertConfig.criticalMargins.coldTemp, 'LOW'),
    AlertSeverity.CRITICAL,
    '-3.5 <= -1.0 must be CRITICAL'
  );

  // Hot Temp High (limit: 70.0, margin: 5.0)
  assert.equal(
    calculateAlertSeverity(72.0, 70.0, alertConfig.criticalMargins.hotTemp, 'HIGH'),
    AlertSeverity.WARNING,
    '72.0 < 75.0 must be WARNING'
  );
  assert.equal(
    calculateAlertSeverity(75.0, 70.0, alertConfig.criticalMargins.hotTemp, 'HIGH'),
    AlertSeverity.CRITICAL,
    '75.0 >= 75.0 must be CRITICAL'
  );

  // Hot Temp Low (limit: 50.0, margin: 5.0)
  assert.equal(
    calculateAlertSeverity(48.0, 50.0, alertConfig.criticalMargins.hotTemp, 'LOW'),
    AlertSeverity.WARNING,
    '48.0 > 45.0 must be WARNING'
  );
  assert.equal(
    calculateAlertSeverity(45.0, 50.0, alertConfig.criticalMargins.hotTemp, 'LOW'),
    AlertSeverity.CRITICAL,
    '45.0 <= 45.0 must be CRITICAL'
  );

  // Humidity High (limit: 85.0, margin: 10.0)
  assert.equal(
    calculateAlertSeverity(88.0, 85.0, alertConfig.criticalMargins.humidity, 'HIGH'),
    AlertSeverity.WARNING,
    '88.0 < 95.0 must be WARNING'
  );
  assert.equal(
    calculateAlertSeverity(95.0, 85.0, alertConfig.criticalMargins.humidity, 'HIGH'),
    AlertSeverity.CRITICAL,
    '95.0 >= 95.0 must be CRITICAL'
  );

  // Humidity Low (limit: 20.0, margin: 10.0)
  assert.equal(
    calculateAlertSeverity(15.0, 20.0, alertConfig.criticalMargins.humidity, 'LOW'),
    AlertSeverity.WARNING,
    '15.0 > 10.0 must be WARNING'
  );
  assert.equal(
    calculateAlertSeverity(10.0, 20.0, alertConfig.criticalMargins.humidity, 'LOW'),
    AlertSeverity.CRITICAL,
    '10.0 <= 10.0 must be CRITICAL'
  );
  console.log('✓ Test 1 passed: All severity thresholds and margin calculations verified.');

  // 2. Settings Validation Tests
  console.log('Test 2: Device settings schema validation...');
  // Valid full payload
  const validSettings = updateDeviceSettingsSchema.safeParse({
    coldTempMin: 0.0,
    coldTempMax: 8.0,
    hotTempMin: 50.0,
    hotTempMax: 70.0,
    humidityMin: 20.0,
    humidityMax: 85.0,
    alertsEnabled: true,
  });
  assert.equal(validSettings.success, true);

  // Valid partial payload
  const validPartial = updateDeviceSettingsSchema.safeParse({
    coldTempMin: 2.0,
    alertsEnabled: false,
  });
  assert.equal(validPartial.success, true);

  // Invalid: cold min > max
  const invalidCold = updateDeviceSettingsSchema.safeParse({
    coldTempMin: 12.0,
    coldTempMax: 4.0,
  });
  assert.equal(invalidCold.success, false, 'Cold min > max must fail validation');

  // Invalid: hot min > max
  const invalidHot = updateDeviceSettingsSchema.safeParse({
    hotTempMin: 80.0,
    hotTempMax: 60.0,
  });
  assert.equal(invalidHot.success, false, 'Hot min > max must fail validation');

  // Invalid: humidity min > max
  const invalidHumidity = updateDeviceSettingsSchema.safeParse({
    humidityMin: 90.0,
    humidityMax: 30.0,
  });
  assert.equal(invalidHumidity.success, false, 'Humidity min > max must fail validation');

  // Invalid: NaN and Infinity
  const nanCold = updateDeviceSettingsSchema.safeParse({
    coldTempMin: Number.NaN,
  });
  assert.equal(nanCold.success, false, 'NaN must fail validation');

  const infHot = updateDeviceSettingsSchema.safeParse({
    hotTempMax: Number.POSITIVE_INFINITY,
  });
  assert.equal(infHot.success, false, 'Infinity must fail validation');

  // Invalid: Out of sensible range (humidity > 100)
  const outOfRangeHumidity = updateDeviceSettingsSchema.safeParse({
    humidityMax: 120.0,
  });
  assert.equal(outOfRangeHumidity.success, false, 'Humidity > 100 must fail validation');
  console.log('✓ Test 2 passed: Device settings validation strictly enforces numeric, finite, min/max rules.');

  // 3. Alerts Query Schema Tests
  console.log('Test 3: Alert query schema validation and parsing...');
  const parsedAlertQuery = listAlertsQuerySchema.safeParse({
    status: 'active',
    limit: '25',
    page: '2',
    from: '2026-09-08T00:00:00.000Z',
    to: '2026-09-08T23:59:59.000Z',
  });
  assert.equal(parsedAlertQuery.success, true);
  if (parsedAlertQuery.success) {
    assert.equal(parsedAlertQuery.data.status, 'active');
    assert.equal(parsedAlertQuery.data.limit, 25);
    assert.equal(parsedAlertQuery.data.page, 2);
  }

  const invalidAlertDate = listAlertsQuerySchema.safeParse({
    from: 'not-a-date',
  });
  assert.equal(invalidAlertDate.success, false, 'Invalid ISO date must fail validation');
  console.log('✓ Test 3 passed: Alert query schema correctly parses and validates query parameters.');

  // 4. Analytics Query Schema Tests
  console.log('Test 4: Analytics query schema validation...');
  const parsedAnalyticsQuery = analyticsQuerySchema.safeParse({
    from: '2026-09-08T10:00:00.000Z',
    to: '2026-09-08T11:00:00.000Z',
    limit: '50',
  });
  assert.equal(parsedAnalyticsQuery.success, true);
  if (parsedAnalyticsQuery.success) {
    assert.equal(parsedAnalyticsQuery.data.limit, 50);
  }

  const invalidAnalyticsDate = analyticsQuerySchema.safeParse({
    to: 'yesterday',
  });
  assert.equal(invalidAnalyticsDate.success, false, 'Invalid date string must fail validation');
  console.log('✓ Test 4 passed: Analytics query schema validated.');

  console.log('====================================================');
  console.log('✓ ALL PART 6 UNIT & PURE-LOGIC TESTS PASSED!');
  console.log('====================================================');
}

runPart6UnitTests().catch((err) => {
  console.error('Part 6 unit test failed:', err);
  process.exit(1);
});
