'use client';

import { AdminNav } from '@web/components/admin/admin-nav';
import { PageHeader } from '@web/components/shared/page-header';
import { Badge } from '@web/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@web/components/ui/card';
import type { AdminQueueStats } from '@web/lib/api/types';
import { useAdminQueues } from '@web/lib/queries/use-admin';
import { cn } from '@web/lib/utils';

function queueStatus(queue: AdminQueueStats): 'healthy' | 'warning' | 'error' {
  if (queue.failed > 0) return 'error';
  if (queue.waiting > 10) return 'warning';
  return 'healthy';
}

const statusStyles = {
  healthy: 'border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30',
  warning: 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30',
  error: 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30',
};

export function AdminQueuesClient({
  initialQueues,
  serverError,
}: {
  initialQueues: AdminQueueStats[] | null;
  serverError: string | null;
}) {
  const { data: queues = [], isLoading, error } = useAdminQueues(initialQueues ?? undefined);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Queue monitor"
        description="BullMQ job queue depths. Auto-refreshes every 30 seconds."
      />
      <AdminNav />

      {(error || serverError) && (
        <p className="text-sm text-destructive">{error?.message ?? serverError}</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {(isLoading && !queues.length ? Array.from({ length: 6 }) : queues).map((queue, i) => {
          if (!queue) {
            return (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <CardTitle className="text-base">Loading…</CardTitle>
                </CardHeader>
              </Card>
            );
          }

          const status = queueStatus(queue);
          return (
            <Card key={queue.name} className={cn('border-2', statusStyles[status])}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base font-mono">{queue.name}</CardTitle>
                <Badge
                  variant={
                    status === 'healthy'
                      ? 'default'
                      : status === 'warning'
                        ? 'secondary'
                        : 'destructive'
                  }
                >
                  {status === 'healthy' ? 'Healthy' : status === 'warning' ? 'Busy' : 'Failed'}
                </Badge>
              </CardHeader>
              <CardContent className="grid grid-cols-3 gap-2 text-center text-sm">
                <div>
                  <p className="text-2xl font-semibold tabular-nums">{queue.waiting}</p>
                  <p className="text-xs text-muted-foreground">Waiting</p>
                </div>
                <div>
                  <p className="text-2xl font-semibold tabular-nums">{queue.active}</p>
                  <p className="text-xs text-muted-foreground">Active</p>
                </div>
                <div>
                  <p className="text-2xl font-semibold tabular-nums">{queue.failed}</p>
                  <p className="text-xs text-muted-foreground">Failed</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
