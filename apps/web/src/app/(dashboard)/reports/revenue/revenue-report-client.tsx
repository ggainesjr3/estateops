'use client';

import { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
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
import type { RevenueReport } from '@web/lib/api/types';
import { formatUsd } from '@web/lib/format-currency';
import { exportToCsv } from '@web/lib/utils/export-csv';
import { useRevenueReport } from '@web/lib/queries/use-reports';
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

export function RevenueReportClient({
  initialData,
  serverError,
}: {
  initialData: RevenueReport | null;
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
  const { data, isLoading, error, isFetching } = useRevenueReport(
    filters,
    initialData ?? undefined,
  );

  const chartData = (data?.byMonth ?? []).map((m) => ({
    month: m.month,
    invoiced: parseFloat(m.invoiced),
    collected: parseFloat(m.collected),
  }));

  const hasData = chartData.length > 0;

  function exportCsv() {
    if (!data) return;
    exportToCsv('revenue-report.csv', data.byProperty.map((p) => ({
      property: p.propertyName,
      invoiced: p.invoiced,
      collected: p.collected,
    })));
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Revenue report"
        description="Invoiced vs collected revenue."
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
          title="No revenue data"
          description="Create invoices to see revenue metrics for the selected period."
          href="/accounting/invoices"
          actionLabel="View invoices"
        />
      ) : (
        <>
          {isFetching && <p className="text-xs text-muted-foreground">Refreshing…</p>}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <ReportStatCard title="Total invoiced" value={formatUsd(data!.summary.totalInvoiced)} />
            <ReportStatCard title="Collected" value={formatUsd(data!.summary.totalCollected)} />
            <ReportStatCard title="Outstanding" value={formatUsd(data!.summary.outstanding)} />
            <ReportStatCard title="Collection rate" value={`${data!.summary.collectionRate}%`} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Revenue vs collected by month</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" tickFormatter={formatMonth} tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => `$${v / 1000}k`} />
                  <Tooltip
                    labelFormatter={formatMonth}
                    formatter={(v: number, name: string) => [formatUsd(String(v)), name === 'invoiced' ? 'Invoiced' : 'Collected']}
                  />
                  <Legend />
                  <Bar dataKey="invoiced" name="Invoiced" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="collected" name="Collected" fill="hsl(142 76% 36%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">By property</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Property</TableHead>
                    <TableHead className="text-right">Invoiced</TableHead>
                    <TableHead className="text-right">Collected</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data!.byProperty.map((row) => (
                    <TableRow key={row.propertyName}>
                      <TableCell>{row.propertyName}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatUsd(row.invoiced)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatUsd(row.collected)}</TableCell>
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
