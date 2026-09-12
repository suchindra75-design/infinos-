import { env } from '../config/env.js';
import { AppError } from '../middleware/error.middleware.js';
import {
  ThingSpeakFeedsResponse,
  ThingSpeakRawFeed,
  NormalizedSensorReading,
  ThingSpeakConnectionResult,
  ThingSpeakChannelMeta,
  GetFeedsOptions,
} from '../types/thingspeak.types.js';

export class ThingSpeakService {
  private baseUrl: string;
  private timeoutMs: number;
  private maxRetries: number;

  constructor(baseUrl = env.THINGSPEAK_BASE_URL, timeoutMs = 6000, maxRetries = 1) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.timeoutMs = timeoutMs;
    this.maxRetries = maxRetries;
  }

  /**
   * Helper to parse and normalize float values safely.
   * Produces null if missing, empty, or not a valid finite number.
   */
  private parseNumberOrNull(value: string | number | null | undefined): number | null {
    if (value === null || value === undefined) {
      return null;
    }
    const trimmed = String(value).trim();
    if (trimmed === '') {
      return null;
    }
    const parsed = Number.parseFloat(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }

  /**
   * Dynamically discovers all configured fields from ThingSpeak channel metadata and sample feeds.
   * Preserves exact ThingSpeak field labels without fabricating metric assumptions.
   */
  public discoverChannelFields(
    channelMeta: ThingSpeakChannelMeta,
    sampleFeed?: ThingSpeakRawFeed
  ): import('../types/mapping.types.js').DeviceFieldMapping[] {
    if (!channelMeta) return [];
    const fields: import('../types/mapping.types.js').DeviceFieldMapping[] = [];

    for (let num = 1; num <= 8; num++) {
      const fieldKey = `field${num}` as keyof ThingSpeakChannelMeta;
      const rawLabel = channelMeta[fieldKey];
      if (typeof rawLabel === 'string' && rawLabel.trim().length > 0) {
        const label = rawLabel.trim();
        const lower = label.toLowerCase();

        let metric: 'temperature' | 'humidity' | 'other' = 'other';
        let zone: 'cold' | 'hot' | 'ambient' | 'none' = 'none';
        let unit = '';
        let fold: string | undefined = undefined;

        if (lower.includes('humid') || lower.includes('%')) {
          metric = 'humidity';
          zone = 'ambient';
          unit = '%';
        } else if (lower.includes('cold') || lower.includes('chilled') || lower.includes('fridge')) {
          metric = 'temperature';
          zone = 'cold';
          unit = '°C';
        } else if (lower.includes('hot') || lower.includes('warm') || lower.includes('heater')) {
          metric = 'temperature';
          zone = 'hot';
          unit = '°C';
        } else if (lower.includes('temp') || lower.includes('°c') || lower.includes('degree')) {
          metric = 'temperature';
          unit = '°C';
        } else if (lower.includes('volt') || lower.includes('battery') || lower.includes(' v')) {
          metric = 'other';
          unit = 'V';
        } else if (lower.includes('press') || lower.includes('bar') || lower.includes('hpa')) {
          metric = 'other';
          unit = 'hPa';
        } else {
          metric = 'other';
          unit = '';
        }

        // Extract fold/compartment number if present in label
        const foldMatch = lower.match(/(?:fold|compartment|zone|unit|#)\s*([0-9]+)/);
        if (foldMatch && foldMatch[1]) {
          fold = foldMatch[1];
        }

        fields.push({
          fieldNumber: num,
          fieldKey: `field${num}`,
          label,
          metric,
          zone,
          fold,
          unit,
        });
      }
    }

    // Dynamic discovery from feed entries if metadata has no explicit field labels
    if (fields.length === 0 && sampleFeed) {
      for (let num = 1; num <= 8; num++) {
        const feedKey = `field${num}` as keyof ThingSpeakRawFeed;
        if (sampleFeed[feedKey] !== undefined && sampleFeed[feedKey] !== null && String(sampleFeed[feedKey]).trim() !== '') {
          fields.push({
            fieldNumber: num,
            fieldKey: `field${num}`,
            label: `Field ${num}`,
            metric: 'other',
            zone: 'none',
            unit: '',
          });
        }
      }
    }

    // Fallback default if channel metadata AND sample feed have no field labels
    if (fields.length === 0) {
      fields.push(
        { fieldNumber: 1, fieldKey: 'field1', label: 'Field 1', metric: 'other', zone: 'none', unit: '' },
        { fieldNumber: 2, fieldKey: 'field2', label: 'Field 2', metric: 'other', zone: 'none', unit: '' }
      );
    }

    return fields;
  }

  /**
   * Normalizes a ThingSpeak raw feed into the INFINOS domain structure:
   * Captures all dynamic fields field1..field8 into fieldValues map.
   * Maintains coldTemperature, hotTemperature, humidity for legacy compatibility.
   */
  public normalizeFeed(
    feed: ThingSpeakRawFeed,
    channelId: string | number,
    fieldMappings?: import('../types/mapping.types.js').DeviceFieldMapping[] | null
  ): NormalizedSensorReading {
    let recordedAt = new Date().toISOString();
    if (feed.created_at) {
      const parsedDate = new Date(feed.created_at);
      if (!Number.isNaN(parsedDate.getTime())) {
        recordedAt = parsedDate.toISOString();
      }
    }

    const fieldValues: Record<string, number | null> = {};
    for (let num = 1; num <= 8; num++) {
      const key = `field${num}` as keyof ThingSpeakRawFeed;
      fieldValues[`field${num}`] = this.parseNumberOrNull(feed[key]);
    }

    let coldTemp: number | null = null;
    let hotTemp: number | null = null;
    let humidityVal: number | null = null;

    if (fieldMappings && Array.isArray(fieldMappings) && fieldMappings.length > 0) {
      const coldMapping = fieldMappings.find((m) => m.metric === 'temperature' && m.zone === 'cold');
      const hotMapping = fieldMappings.find((m) => m.metric === 'temperature' && m.zone === 'hot');
      const humidityMapping = fieldMappings.find((m) => m.metric === 'humidity');

      if (coldMapping && coldMapping.fieldKey) coldTemp = fieldValues[coldMapping.fieldKey] ?? null;
      if (hotMapping && hotMapping.fieldKey) hotTemp = fieldValues[hotMapping.fieldKey] ?? null;
      if (humidityMapping && humidityMapping.fieldKey) humidityVal = fieldValues[humidityMapping.fieldKey] ?? null;
    }

    if (coldTemp === null) coldTemp = fieldValues['field1'] ?? null;
    if (hotTemp === null) hotTemp = fieldValues['field3'] ?? null;
    if (humidityVal === null) humidityVal = fieldValues['field4'] ?? null;

    return {
      entryId: Number(feed.entry_id),
      channelId,
      recordedAt,
      coldTemperature: coldTemp,
      hotTemperature: hotTemp,
      humidity: humidityVal,
      fieldValues,
    };
  }

  /**
   * Performs an authenticated HTTP request to ThingSpeak REST API with timeout and transient retry logic.
   * Credentials are kept strictly isolated and never leaked into error messages or logs.
   */
  private async requestThingSpeak(
    endpoint: string,
    params: Record<string, string | number | undefined> = {},
    readApiKey?: string | null
  ): Promise<any> {
    const url = new URL(`${this.baseUrl}${endpoint}`);

    // Set query parameters
    for (const [key, val] of Object.entries(params)) {
      if (val !== undefined && val !== null && val !== '') {
        url.searchParams.set(key, String(val));
      }
    }

    if (readApiKey && readApiKey.trim().length > 0) {
      url.searchParams.set('api_key', readApiKey.trim());
    }

    let attempts = 0;
    let lastError: any = null;

    while (attempts <= this.maxRetries) {
      attempts++;
      const controller = new AbortController();
      const timeoutTimer = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const response = await fetch(url.toString(), {
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutTimer);

        // ThingSpeak returns "-1" or "-1\n" for private channels without valid Read API key
        const rawText = await response.text();
        const trimmedText = rawText.trim();

        if (trimmedText === '-1') {
          throw new AppError(
            'Unauthorized: Private ThingSpeak channel requires a valid Read API Key',
            401,
            'THINGSPEAK_UNAUTHORIZED'
          );
        }

        if (response.status === 404) {
          throw new AppError(
            'ThingSpeak channel not found. Please verify the Channel ID',
            404,
            'THINGSPEAK_CHANNEL_NOT_FOUND'
          );
        }

        if (response.status === 401 || response.status === 403) {
          throw new AppError(
            'Unauthorized: Invalid or missing ThingSpeak Read API Key for this channel',
            401,
            'THINGSPEAK_UNAUTHORIZED'
          );
        }

        if (response.status === 429) {
          throw new AppError(
            'ThingSpeak rate limit exceeded. Please wait before retrying',
            429,
            'THINGSPEAK_RATE_LIMITED'
          );
        }

        if (!response.ok) {
          throw new AppError(
            `ThingSpeak API responded with status ${response.status}`,
            502,
            'THINGSPEAK_BAD_GATEWAY'
          );
        }

        try {
          return JSON.parse(trimmedText);
        } catch {
          throw new AppError(
            'Received malformed response from ThingSpeak API',
            502,
            'THINGSPEAK_BAD_GATEWAY'
          );
        }
      } catch (err: any) {
        clearTimeout(timeoutTimer);

        // Do not retry client/auth errors
        if (err instanceof AppError && (err.statusCode === 401 || err.statusCode === 404 || err.statusCode === 429)) {
          throw err;
        }

        lastError = err;

        const isTimeout = err?.name === 'AbortError' || err?.code === 'ABORT_ERR';
        const isNetworkErr = err?.code === 'ECONNRESET' || err?.code === 'ENOTFOUND' || err?.code === 'ETIMEDOUT';

        if ((isTimeout || isNetworkErr) && attempts <= this.maxRetries) {
          // Small backoff before transient retry
          await new Promise((resolve) => setTimeout(resolve, 300));
          continue;
        }

        if (isTimeout) {
          throw new AppError(
            'ThingSpeak API request timed out. Service temporarily unreachable',
            504,
            'THINGSPEAK_TIMEOUT'
          );
        }

        if (err instanceof AppError) {
          throw err;
        }

        throw new AppError(
          'Failed to communicate with ThingSpeak API (network unreachable)',
          502,
          'THINGSPEAK_UNAVAILABLE'
        );
      }
    }

    throw lastError || new AppError('ThingSpeak request failed after retries', 502, 'THINGSPEAK_UNAVAILABLE');
  }

  /**
   * Retrieves channel information and metadata.
   */
  async getChannelInfo(channelId: string, readApiKey?: string | null): Promise<ThingSpeakFeedsResponse['channel']> {
    const data = await this.requestThingSpeak(
      `/channels/${encodeURIComponent(channelId)}/feeds.json`,
      { results: 0 },
      readApiKey
    );
    return data.channel;
  }

  /**
   * Retrieves the latest feed for a specific channel and normalizes it.
   * If no feeds exist in the channel, returns null.
   */
  async getLatestFeed(
    channelId: string,
    readApiKey?: string | null,
    fieldMappings?: import('../types/mapping.types.js').DeviceFieldMapping[] | null
  ): Promise<NormalizedSensorReading | null> {
    const data: ThingSpeakFeedsResponse = await this.requestThingSpeak(
      `/channels/${encodeURIComponent(channelId)}/feeds.json`,
      { results: 1 },
      readApiKey
    );

    if (!data.feeds || data.feeds.length === 0) {
      return null;
    }

    const latest = data.feeds[data.feeds.length - 1];
    return this.normalizeFeed(latest, channelId, fieldMappings);
  }

  /**
   * Retrieves historical feeds with pagination and date range filtering.
   */
  async getFeeds(
    channelId: string,
    options: GetFeedsOptions = {}
  ): Promise<{
    channel: ThingSpeakFeedsResponse['channel'];
    readings: NormalizedSensorReading[];
    count: number;
  }> {
    const params: Record<string, string | number | undefined> = {};

    if (options.limit !== undefined) {
      params.results = Math.min(Math.max(Number(options.limit), 1), 8000);
    }
    if (options.from) {
      params.start = options.from;
    }
    if (options.to) {
      params.end = options.to;
    }

    const data: ThingSpeakFeedsResponse = await this.requestThingSpeak(
      `/channels/${encodeURIComponent(channelId)}/feeds.json`,
      params,
      options.readApiKey
    );

    const feeds = Array.isArray(data.feeds) ? data.feeds : [];
    const readings = feeds.map((f) => this.normalizeFeed(f, channelId, options.fieldMappings));

    return {
      channel: data.channel,
      readings,
      count: readings.length,
    };
  }

  /**
   * Retrieves feeds since a given timestamp or ISO string.
   */
  async getFeedsSince(
    channelId: string,
    sinceTimestamp: string | Date,
    readApiKey?: string | null,
    fieldMappings?: import('../types/mapping.types.js').DeviceFieldMapping[] | null
  ): Promise<NormalizedSensorReading[]> {
    const start = typeof sinceTimestamp === 'string' ? sinceTimestamp : sinceTimestamp.toISOString();
    const result = await this.getFeeds(channelId, {
      readApiKey,
      from: start,
      fieldMappings,
    });
    return result.readings;
  }

  /**
   * Tests ThingSpeak channel connectivity and validates credentials.
   * Safe for user feedback — never exposes API keys or secrets.
   */
  async testConnection(channelId: string, readApiKey?: string | null): Promise<ThingSpeakConnectionResult> {
    const cleanChannelId = (channelId || '').trim();
    if (!cleanChannelId) {
      return {
        connected: false,
        connectionStatus: 'UNREACHABLE',
        channelId: '',
        message: 'ThingSpeak Channel ID is required',
      };
    }

    try {
      const data = await this.requestThingSpeak(
        `/channels/${encodeURIComponent(cleanChannelId)}/feeds.json`,
        { results: 1 },
        readApiKey
      );

      const sampleFeed = Array.isArray(data?.feeds) && data.feeds.length > 0 ? data.feeds[0] : undefined;
      const discoveredFields = data?.channel ? this.discoverChannelFields(data.channel, sampleFeed) : [];

      return {
        connected: true,
        connectionStatus: 'CONNECTED',
        channelId: cleanChannelId,
        channelName: data?.channel?.name || 'ThingSpeak Channel',
        message: 'Successfully connected to ThingSpeak channel',
        discoveredFields,
      };
    } catch (err: any) {
      if (err instanceof AppError) {
        return {
          connected: false,
          connectionStatus: err.statusCode === 404 || err.statusCode === 401 ? 'UNREACHABLE' : 'OFFLINE',
          channelId: cleanChannelId,
          message: err.message,
        };
      }
      return {
        connected: false,
        connectionStatus: 'OFFLINE',
        channelId: cleanChannelId,
        message: 'Unable to connect to ThingSpeak channel',
      };
    }
  }
}

export const thingspeakService = new ThingSpeakService();
