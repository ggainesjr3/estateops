'use client';

import { Component, type ReactNode } from 'react';

function isChunkLoadError(error: unknown): boolean {
  if (!error) return false;
  const name = error instanceof Error ? error.name : '';
  const message = error instanceof Error ? error.message : String(error);
  return (
    name === 'ChunkLoadError' ||
    message.includes('ChunkLoadError') ||
    message.includes('Loading chunk')
  );
}

interface ChunkErrorBoundaryState {
  error: Error | null;
}

/**
 * Catches render-time chunk-loading failures (common in dev after a recompile,
 * when an open page references a now-stale webpack chunk) and recovers by doing
 * a hard reload, which pulls the freshly compiled chunks. Any non-chunk error
 * is re-thrown so it can bubble to a parent boundary / Next's error UI.
 */
export class ChunkErrorBoundary extends Component<
  { children: ReactNode },
  ChunkErrorBoundaryState
> {
  override state: ChunkErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ChunkErrorBoundaryState {
    return { error };
  }

  override componentDidCatch(error: Error): void {
    if (isChunkLoadError(error) && typeof window !== 'undefined') {
      window.location.reload();
    }
  }

  override render(): ReactNode {
    const { error } = this.state;
    if (error) {
      if (isChunkLoadError(error)) {
        // A hard reload is in flight (triggered in componentDidCatch); render a
        // minimal placeholder until the page reloads.
        return (
          <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
            Updating to the latest version…
          </div>
        );
      }
      // Not a chunk error — let it propagate to the nearest error boundary.
      throw error;
    }
    return this.props.children;
  }
}
