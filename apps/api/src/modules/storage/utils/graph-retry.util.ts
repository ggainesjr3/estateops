import { Logger } from '@nestjs/common';

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
const MAX_RETRIES = 3;
const BACKOFF_MS = [1000, 2000, 4000];

export interface GraphResponse<T = unknown> {
  ok: boolean;
  status: number;
  data: T;
  headers: Headers;
}

export class GraphApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body?: unknown,
  ) {
    super(message);
  }
}

export async function withGraphRetry<T>(
  operation: string,
  fn: () => Promise<GraphResponse<T>>,
  logger: Logger,
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      await sleep(BACKOFF_MS[attempt - 1] ?? 4000);
    }

    const response = await fn();
    if (response.ok) {
      return response.data;
    }

    lastError = new GraphApiError(
      `Graph API ${operation} failed with status ${response.status}`,
      response.status,
      response.data,
    );

    if (!RETRYABLE_STATUS.has(response.status) || attempt === MAX_RETRIES) {
      throw lastError;
    }

    const retryAfterHeader = response.headers.get('Retry-After');
    if (retryAfterHeader) {
      const waitSec = parseInt(retryAfterHeader, 10);
      if (!Number.isNaN(waitSec)) {
        await sleep(waitSec * 1000);
      }
    }

    logger.warn(
      `${operation} attempt ${attempt + 1}/${MAX_RETRIES + 1}: status ${response.status}`,
    );
  }

  throw lastError ?? new Error(`Graph API ${operation} failed`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
