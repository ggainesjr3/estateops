export const AI_RETRY_BACKOFF_MS = [2000, 8000] as const;
export const AI_MAX_RETRIES = 2;
export const AI_MAX_VALIDATION_RETRIES = 1;

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
