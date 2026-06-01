'use client';

import { useEffect } from 'react';

function isChunkLoadError(value: unknown): boolean {
  if (!value) return false;
  if (value instanceof Error) {
    return (
      value.name === 'ChunkLoadError' ||
      value.message.includes('ChunkLoadError') ||
      value.message.includes('Loading chunk')
    );
  }
  if (typeof value === 'string') {
    return value.includes('ChunkLoadError') || value.includes('Loading chunk');
  }
  return false;
}

/**
 * Global safety net for chunk-loading failures that escape React's render
 * cycle (e.g. a dynamic import rejecting). Listens for window `error` and
 * `unhandledrejection` events and, on a stale-chunk error, performs a one-time
 * hard reload to fetch the freshly compiled chunks.
 */
export function ChunkReloadListener(): null {
  useEffect(() => {
    let reloaded = false;
    const reloadOnce = () => {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    };

    const onError = (event: ErrorEvent) => {
      if (isChunkLoadError(event.error) || isChunkLoadError(event.message)) {
        reloadOnce();
      }
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      if (isChunkLoadError(event.reason)) {
        reloadOnce();
      }
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  return null;
}
