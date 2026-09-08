import { env } from '../config/env.js';
import { deviceSyncService } from '../services/device-sync.service.js';
import { logger } from '../utils/logger.js';
import { DeviceSyncSummary } from '../types/sync.types.js';

export class DeviceSyncWorker {
  private timer: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private isProcessing: boolean = false;
  private readonly syncIntervalMs: number;

  constructor(syncIntervalMs: number = env.SYNC_INTERVAL_MS) {
    this.syncIntervalMs = syncIntervalMs;
  }

  /**
   * Starts the background synchronization worker.
   * Prevents duplicate timers and duplicate instances.
   */
  public start(): void {
    if (this.isRunning) {
      logger.warn('DeviceSyncWorker is already running; start request ignored');
      return;
    }

    this.isRunning = true;
    logger.info('DeviceSyncWorker started', {
      intervalMs: this.syncIntervalMs,
    });

    // Execute first run shortly after startup (1000ms delay to allow server setup to settle)
    setTimeout(() => {
      if (this.isRunning) {
        this.runSyncCycle().catch((err) => {
          logger.error('Error during initial sync cycle', { error: err?.message });
        });
      }
    }, 1000);

    // Schedule regular periodic sync cycles
    this.timer = setInterval(() => {
      this.runSyncCycle().catch((err) => {
        logger.error('Error during scheduled sync cycle', { error: err?.message });
      });
    }, this.syncIntervalMs);
  }

  /**
   * Executes a single synchronization cycle.
   * Concurrency Guard: Guarantees no overlapping runs if a previous run is taking longer than interval.
   */
  public async runSyncCycle(): Promise<DeviceSyncSummary> {
    if (!this.isRunning) {
      return {
        totalDevices: 0,
        successfulSyncs: 0,
        failedSyncs: 0,
        newReadingsCount: 0,
        results: [],
        skipped: true,
      };
    }

    if (this.isProcessing) {
      logger.warn('Previous device sync cycle is still in progress. Skipping this cycle to prevent overlap.');
      return {
        totalDevices: 0,
        successfulSyncs: 0,
        failedSyncs: 0,
        newReadingsCount: 0,
        results: [],
        skipped: true,
      };
    }

    this.isProcessing = true;
    try {
      return await deviceSyncService.syncAllDevices();
    } catch (err: any) {
      logger.error('Unhandled error in DeviceSyncWorker execution cycle', {
        error: err?.message || 'Unknown error',
      });
      return {
        totalDevices: 0,
        successfulSyncs: 0,
        failedSyncs: 0,
        newReadingsCount: 0,
        results: [],
      };
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Gracefully stops the worker and clears the interval timer.
   * Waits up to 3 seconds for any in-flight cycle to complete.
   */
  public async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    logger.info('Stopping DeviceSyncWorker...');
    this.isRunning = false;

    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    // Wait for in-flight processing to drain if currently executing
    let waitAttempts = 0;
    while (this.isProcessing && waitAttempts < 15) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      waitAttempts++;
    }

    logger.info('DeviceSyncWorker stopped cleanly');
  }

  /**
   * Returns current status of the worker.
   */
  public getStatus(): { isRunning: boolean; isProcessing: boolean; intervalMs: number } {
    return {
      isRunning: this.isRunning,
      isProcessing: this.isProcessing,
      intervalMs: this.syncIntervalMs,
    };
  }
}

export const deviceSyncWorker = new DeviceSyncWorker();
