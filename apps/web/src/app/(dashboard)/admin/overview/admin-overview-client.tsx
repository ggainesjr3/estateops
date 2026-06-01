'use client';

import { format } from 'date-fns';
import Link from 'next/link';
import { AdminNav } from '@web/components/admin/admin-nav';
import { MetricCard } from '@web/components/accounting/metric-card';
import { PageHeader } from '@web/components/shared/page-header';
import { Badge } from '@web/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@web/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@web/components/ui/table';
import type {
  AdminAuditLogEntry,
  AdminOrgStats,
  AdminSystemHealth,
} from '@web/lib/api/types';
import { formatUsd } from '@web/lib/format-currency';
import {
  useAdminAuditLogs,
  useAdminStats,
  useAdminSystemHealth,
} from '@web/lib/queries/use-admin';

function HealthIndicator({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center justify-between rounded-md border px-3 py-2">
      <span className="text-sm">{label}</span>
      <Badge variant={ok ? 'default' : 'destructive'}>{ok ? 'Healthy' : 'Down'}</Badge>
    </div>
  );
}

export function AdminOverviewClient({
  initialStats,
  initialHealth,
  initialAuditLogs,
  serverError,
}: {
  initialStats: AdminOrgStats | null;
  initialHealth: AdminSystemHealth | null;
  initialAuditLogs: AdminAuditLogEntry[] | null;
  serverError: string | null;
}) {
  const { data: stats, isLoading: statsLoading, error: statsError } = useAdminStats(
    initialStats ?? undefined,
  );
  const { data: health } = useAdminSystemHealth(initialHealth ?? undefined);
  const { data: auditPage } = useAdminAuditLogs(
    { limit: '10' },
    initialAuditLogs
      ? { items: initialAuditLogs, nextCursor: null, hasMore: false }
      : undefined,
  );

  const auditLogs = auditPage?.items ?? [];
  const error = statsError?.message ?? serverError;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin overview"
        description="Organization metrics, system health, and recent activity."
      />
      <AdminNav />

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          title="Properties"
          value={String(stats?.totalProperties ?? 0)}
          loading={statsLoading && !stats}
        />
        <MetricCard
          title="Units"
          value={String(stats?.totalUnits ?? 0)}
          loading={statsLoading && !stats}
        />
        <MetricCard
          title="Occupancy"
          value={stats ? `${stats.occupancyRate}%` : '0%'}
          loading={statsLoading && !stats}
        />
        <MetricCard
          title="Active tenants"
          value={String(stats?.activeTenants ?? 0)}
          loading={statsLoading && !stats}
        />
        <MetricCard
          title="Open tickets"
          value={String(stats?.openMaintenanceTickets ?? 0)}
          loading={statsLoading && !stats}
        />
        <MetricCard
          title="Monthly revenue"
          value={stats ? formatUsd(stats.monthlyRevenue) : '$0.00'}
          loading={statsLoading && !stats}
        />
      </div>

      {health && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">System health</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <HealthIndicator ok={health.database === 'ok'} label="Database" />
            <HealthIndicator ok={health.redis === 'ok'} label="Redis" />
            {health.queues.map((queue) => (
              <HealthIndicator
                key={queue.name}
                ok={queue.depth <= 10}
                label={queue.name}
              />
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Recent audit log</CardTitle>
          <Link href="/admin/audit-logs" className="text-sm text-primary hover:underline">
            View all
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auditLogs.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {format(new Date(entry.createdAt), 'MMM d, h:mm a')}
                  </TableCell>
                  <TableCell>{entry.userName ?? entry.userEmail ?? 'System'}</TableCell>
                  <TableCell>{entry.action}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {entry.entityType} · {entry.entityId.slice(0, 8)}…
                  </TableCell>
                </TableRow>
              ))}
              {!auditLogs.length && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No audit entries yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
