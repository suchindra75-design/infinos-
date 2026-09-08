import { z } from 'zod';

const finiteNumber = (field: string, minVal: number, maxVal: number) =>
  z
    .number({ message: `${field} must be a number` })
    .refine((v) => Number.isFinite(v), `${field} must be a finite number`)
    .refine((v) => v >= minVal, `${field} cannot be less than ${minVal}`)
    .refine((v) => v <= maxVal, `${field} cannot exceed ${maxVal}`);

export const updateDeviceSettingsSchema = z
  .object({
    coldTempMin: finiteNumber('Cold temperature minimum', -50, 100).optional(),
    coldTempMax: finiteNumber('Cold temperature maximum', -50, 100).optional(),
    hotTempMin: finiteNumber('Hot temperature minimum', -20, 150).optional(),
    hotTempMax: finiteNumber('Hot temperature maximum', -20, 150).optional(),
    humidityMin: finiteNumber('Humidity minimum', 0, 100).optional(),
    humidityMax: finiteNumber('Humidity maximum', 0, 100).optional(),
    alertsEnabled: z.boolean().optional(),
  })
  .refine(
    (data) => {
      if (data.coldTempMin !== undefined && data.coldTempMax !== undefined) {
        return data.coldTempMin <= data.coldTempMax;
      }
      return true;
    },
    {
      message: 'Cold temperature minimum cannot be greater than cold temperature maximum',
      path: ['coldTempMin'],
    }
  )
  .refine(
    (data) => {
      if (data.hotTempMin !== undefined && data.hotTempMax !== undefined) {
        return data.hotTempMin <= data.hotTempMax;
      }
      return true;
    },
    {
      message: 'Hot temperature minimum cannot be greater than hot temperature maximum',
      path: ['hotTempMin'],
    }
  )
  .refine(
    (data) => {
      if (data.humidityMin !== undefined && data.humidityMax !== undefined) {
        return data.humidityMin <= data.humidityMax;
      }
      return true;
    },
    {
      message: 'Humidity minimum cannot be greater than humidity maximum',
      path: ['humidityMin'],
    }
  );

export type UpdateDeviceSettingsInput = z.infer<typeof updateDeviceSettingsSchema>;
