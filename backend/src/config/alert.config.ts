import { AlertSeverity } from '@prisma/client';

export const alertConfig = {
  defaultThresholds: {
    coldTempMin: 0.0,
    coldTempMax: 8.0,
    hotTempMin: 50.0,
    hotTempMax: 70.0,
    humidityMin: 20.0,
    humidityMax: 85.0,
    alertsEnabled: true,
  },
  // Configurable margins to transition from WARNING to CRITICAL
  criticalMargins: {
    coldTemp: 2.0, // <= min - 2.0 or >= max + 2.0 is CRITICAL
    hotTemp: 5.0,  // <= min - 5.0 or >= max + 5.0 is CRITICAL
    humidity: 10.0, // <= min - 10.0 or >= max + 10.0 is CRITICAL
  },
};

/**
 * Determines alert severity based on the difference from threshold limit.
 */
export function calculateAlertSeverity(
  val: number,
  limit: number,
  margin: number,
  direction: 'LOW' | 'HIGH'
): AlertSeverity {
  if (direction === 'LOW') {
    return val <= limit - margin ? AlertSeverity.CRITICAL : AlertSeverity.WARNING;
  } else {
    return val >= limit + margin ? AlertSeverity.CRITICAL : AlertSeverity.WARNING;
  }
}
