import { QueryProvider } from '@web/providers/query-provider';
import { DashboardShell } from '@web/components/layout/dashboard-shell';
import { TokenBanner } from '@web/components/layout/token-banner';
import { ChunkErrorBoundary } from '@web/components/chunk-error-boundary';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <ChunkErrorBoundary>
      <QueryProvider>
        <TokenBanner />
        <DashboardShell>{children}</DashboardShell>
      </QueryProvider>
    </ChunkErrorBoundary>
  );
}
