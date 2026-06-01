import type { JobsOptions, WorkerOptions } from 'bullmq';

/** Retry delays after attempt 1, 2, and 3 (ms). */
export const QUEUE_BACKOFF_DELAYS_MS = [1000, 5000, 30000] as const;

export const DEFAULT_QUEUE_JOB_OPTIONS: JobsOptions = {
  attempts: 3,
  backoff: { type: 'custom' },
  removeOnComplete: 100,
  removeOnFail: false,
};

export const QUEUE_WORKER_SETTINGS: NonNullable<WorkerOptions['settings']> = {
  backoffStrategy: (attemptsMade: number): number => {
    const index = Math.max(0, attemptsMade - 1);
    return (
      QUEUE_BACKOFF_DELAYS_MS[index] ??
      QUEUE_BACKOFF_DELAYS_MS[QUEUE_BACKOFF_DELAYS_MS.length - 1]!
    );
  },
};
