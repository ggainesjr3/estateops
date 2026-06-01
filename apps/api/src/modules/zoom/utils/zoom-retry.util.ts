const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504]);
export const ZOOM_MAX_RETRIES = 3;
export const ZOOM_BACKOFF_MS = [1000, 5000, 30000] as const;

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withZoomRetry<T>(
  operation: string,
  fn: () => Promise<T>,
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= ZOOM_MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      await sleep(ZOOM_BACKOFF_MS[attempt - 1] ?? 30_000);
    }
    try {
      return await fn();
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      const status = (e as { status?: number }).status;
      if (status !== undefined && !RETRYABLE_STATUS.has(status)) {
        throw lastError;
      }
      if (attempt === ZOOM_MAX_RETRIES) {
        throw lastError;
      }
    }
  }

  throw lastError ?? new Error(`Zoom ${operation} failed`);
}
