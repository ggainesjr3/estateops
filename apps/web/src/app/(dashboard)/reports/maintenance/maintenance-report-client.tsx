'use client';

import { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { EmptyState } from '@web/components/shared/empty-state';
import { PageHeader } from '@web/components/shared/page-header';
import { TableSkeleton } from '@web/components/shared/table-skeleton';
import { ReportFilters } from '@web/components/reports/report-filters';
import { ReportStatCard } from '@web/components/reports/report-stat-card';
import { Button } from '@web/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@web/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@web/components/ui/table';
import type { MaintenanceReport } from '@web/lib/api/types';
import { exportToCsv } from '@web/lib/utils/export-csv';
import { useMaintenanceReport } from '@web/lib/queries/use-reports';
import { usePropertiesList } from '@web/lib/queries/use-properties';

const PIE_COLORS = ['#0f172a', '#2563eb', '#f59e0b', '#ef4444'];

function defaultRange() {
  const to = new Date();
  const from = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth() - 11, 1));
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

export function MaintenanceReportClient({
  initialData,
  serverError,
}: {
  initialData: MaintenanceReport | null;
  serverError: string | null;
}) {
  const defaults = defaultRange();
  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);
  const [propertyId, setPropertyId] = useState('');

  const filters = useMemo(
    () => ({
      from: from || undefined,
      to: to || undefined,
      propertyId: propertyId || undefined,
    }),
    [from, to, propertyId],
  );

  const { data: properties = [] } = usePropertiesList({ limit: '100' });
  const { data, isLoading, error, isFetching } = useMaintenanceReport(
    filters,
    initialData ?? undefined,
  );

  const hasData = (data?.summary.total ?? 0) > 0;

  function exportCsv() {
    if (!data) return;
    exportToCsv('maintenance-report.csv', data.byProperty.map((p) => ({
      property: p.propertyName,
      tickets: p.count,
      avgResolutionDays: p.avgResolutionDays,
    })));
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Maintenance report"
        description="Work order volume and resolution metrics."
        actions={
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={!hasData}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        }
      />

      <ReportFilters
        from={from}
        to={to}
        propertyId={propertyId}
        onFromChange={setFrom}
        onToChange={setTo}
        onPropertyChange={setPropertyId}
        properties={properties}
      />

      {(error || serverError) && (
        <p className="text-sm text-destructive">{error?.message ?? serverError}</p>
      )}

      {isLoading && !data ? (
        <TableSkeleton cols={4} />
      ) : !hasData ? (
        <EmptyState
          title="No maintenance data"
          description="Maintenance tickets in the selected period will appear here."
          href="/maintenance"
          actionLabel="View maintenance"
        />
      ) : (
        <>
          {isFetching && <p className="text-xs text-muted-foreground">Refreshing…</p>}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <ReportStatCard title="Total tickets" value={String(data!.summary.total)} />
            <ReportStatCard title="Open" value={String(data!.summary.open)} />
            <ReportStatCard title="Completed" value={String(data!.summary.completed)} />
            <ReportStatCard title="Avg resolution" value={`${data!.summary.avgResolutionDays}d`} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">By priority</CardTitle>
              </CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data!.byPriority}
                      dataKey="count"
                      nameKey="priority"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      label={({ priority, count }) => `${priority}: ${count}`}
                    >
                      {data!.byPriority.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">By trade</CardTitle>
              </CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data!.byTrade} layout="vertical" margin={{ left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="trade" width={100} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">By property</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Property</TableHead>
                    <TableHead className="text-right">Tickets</TableHead>
                    <TableHead className="text-right">Avg resolution (days)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data!.byProperty.map((row) => (
                    <TableRow key={row.propertyName}>
                      <TableCell>{row.propertyName}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.count}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.avgResolutionDays}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
