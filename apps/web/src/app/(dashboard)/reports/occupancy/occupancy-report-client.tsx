'use client';

import { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
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
import type { OccupancyReport } from '@web/lib/api/types';
import { exportToCsv } from '@web/lib/utils/export-csv';
import { useOccupancyReport } from '@web/lib/queries/use-reports';
import { usePropertiesList } from '@web/lib/queries/use-properties';

function defaultRange() {
  const to = new Date();
  const from = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth() - 11, 1));
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatMonth(month: string) {
  const [y, m] = month.split('-');
  const idx = Number(m) - 1;
  return idx >= 0 && idx < 12 ? `${MONTH_ABBR[idx]} '${(y ?? '').slice(2)}` : month;
}

export function OccupancyReportClient({
  initialData,
  serverError,
}: {
  initialData: OccupancyReport | null;
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
  const { data, isLoading, error, isFetching } = useOccupancyReport(
    filters,
    initialData ?? undefined,
  );

  const hasData = (data?.summary.totalUnits ?? 0) > 0;

  function exportCsv() {
    if (!data) return;
    exportToCsv('occupancy-report.csv', [
      ...data.byProperty.map((p) => ({
        property: p.propertyName,
        totalUnits: p.totalUnits,
        occupied: p.occupied,
        occupancyRate: p.occupancyRate,
      })),
    ]);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Occupancy report"
        description="Unit occupancy across your portfolio."
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
          title="No occupancy data"
          description="Add properties and units to see occupancy metrics."
          href="/properties"
          actionLabel="View properties"
        />
      ) : (
        <>
          {isFetching && <p className="text-xs text-muted-foreground">Refreshing…</p>}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <ReportStatCard title="Total units" value={String(data!.summary.totalUnits)} />
            <ReportStatCard title="Occupied" value={String(data!.summary.occupied)} />
            <ReportStatCard title="Vacant" value={String(data!.summary.vacant)} />
            <ReportStatCard title="Occupancy" value={`${data!.summary.occupancyRate}%`} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Occupancy by property</CardTitle>
              </CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data!.byProperty}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="propertyName" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={60} />
                    <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                    <Tooltip formatter={(v: number) => [`${v}%`, 'Occupancy']} />
                    <Bar dataKey="occupancyRate" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Occupancy trend (12 months)</CardTitle>
              </CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data!.trend}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" tickFormatter={formatMonth} tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                    <Tooltip labelFormatter={formatMonth} formatter={(v: number) => [`${v}%`, 'Occupancy']} />
                    <Line type="monotone" dataKey="occupancyRate" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
