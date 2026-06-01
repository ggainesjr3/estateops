'use client';

import { Download } from 'lucide-react';
import { EmptyState } from '@web/components/shared/empty-state';
import { PageHeader } from '@web/components/shared/page-header';
import { TableSkeleton } from '@web/components/shared/table-skeleton';
import { ReportStatCard } from '@web/components/reports/report-stat-card';
import { Button } from '@web/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@web/components/ui/table';
import type { DelinquencyReport } from '@web/lib/api/types';
import { formatUsd } from '@web/lib/format-currency';
import { exportToCsv } from '@web/lib/utils/export-csv';
import { useDelinquencyReport } from '@web/lib/queries/use-reports';
import { cn } from '@web/lib/utils';

export function DelinquencyReportClient({
  initialData,
  serverError,
}: {
  initialData: DelinquencyReport | null;
  serverError: string | null;
}) {
  const { data, isLoading, error, isFetching } = useDelinquencyReport(initialData ?? undefined);
  const tenants = data?.tenants ?? [];
  const hasData = tenants.length > 0;

  function exportCsv() {
    if (!data) return;
    exportToCsv('delinquency-report.csv', data.tenants.map((t) => ({
      tenant: t.tenantName,
      unit: t.unit,
      property: t.property,
      amountOwed: t.amountOwed,
      daysPastDue: t.daysPastDue,
    })));
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Delinquency report"
        description="Tenants with overdue balances."
        actions={
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={!hasData}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        }
      />

      {(error || serverError) && (
        <p className="text-sm text-destructive">{error?.message ?? serverError}</p>
      )}

      {isLoading && !data ? (
        <TableSkeleton cols={5} />
      ) : !hasData ? (
        <EmptyState
          title="No delinquent tenants"
          description="All tenants are current on their balances."
        />
      ) : (
        <>
          {isFetching && <p className="text-xs text-muted-foreground">Refreshing…</p>}
          <div className="grid gap-4 sm:grid-cols-3">
            <ReportStatCard
              title="Delinquent tenants"
              value={String(data!.summary.totalDelinquent)}
            />
            <ReportStatCard
              title="Total amount owed"
              value={formatUsd(data!.summary.totalAmountOwed)}
            />
            <ReportStatCard
              title="Avg days past due"
              value={String(data!.summary.avgDaysPastDue)}
            />
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead className="text-right">Amount owed</TableHead>
                  <TableHead className="text-right">Days past due</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenants.map((t) => (
                  <TableRow key={`${t.tenantName}-${t.unit}-${t.property}`}>
                    <TableCell className="font-medium">{t.tenantName}</TableCell>
                    <TableCell>{t.unit}</TableCell>
                    <TableCell>{t.property}</TableCell>
                    <TableCell className="text-right tabular-nums text-red-600">
                      {formatUsd(t.amountOwed)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        'text-right tabular-nums font-medium',
                        t.daysPastDue > 30 ? 'text-red-600' : 'text-amber-600',
                      )}
                    >
                      {t.daysPastDue}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
