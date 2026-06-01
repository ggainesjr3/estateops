'use client';

import { format } from 'date-fns';
import Link from 'next/link';
import {
  CollectionRateChart,
  RevenueExpenseChart,
} from '@web/components/accounting/dashboard-charts';
import { MetricCard } from '@web/components/accounting/metric-card';
import { PageHeader } from '@web/components/shared/page-header';
import { TableSkeleton } from '@web/components/shared/table-skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@web/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@web/components/ui/card';
import type { AccountingDashboard } from '@web/lib/api/types';
import { formatUsd } from '@web/lib/format-currency';
import { useAccountingDashboard } from '@web/lib/queries/use-accounting';

export function AccountingDashboardClient({
  initialData,
  serverError,
}: {
  initialData: AccountingDashboard | null;
  serverError: string | null;
}) {
  const { data, isLoading, error } = useAccountingDashboard(initialData ?? undefined);
  const dashboard = data;

  if (isLoading && !dashboard) {
    return (
      <div className="space-y-6">
        <PageHeader title="Accounting" description="Financial overview and collections." />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <MetricCard key={i} title="…" value="0" loading />
          ))}
        </div>
        <TableSkeleton cols={4} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Accounting dashboard"
        description="Month-to-date metrics, trends, and receivables."
      />

      {(error || serverError) && (
        <p className="text-sm text-destructive">{error?.message ?? serverError}</p>
      )}

      {dashboard && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Rent collected (MTD)"
              value={dashboard.metrics.rentCollectedMtd}
            />
            <MetricCard
              title="Outstanding receivables"
              value={dashboard.metrics.outstandingReceivables}
            />
            <MetricCard
              title="Security deposits held"
              value={dashboard.metrics.securityDepositsHeld}
            />
            <MetricCard
              title="Maintenance expense (MTD)"
              value={dashboard.metrics.maintenanceExpenseMtd}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <RevenueExpenseChart data={dashboard.monthlyRevenueExpense} />
            <CollectionRateChart data={dashboard.collectionByProperty} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Last 10 paid invoices</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Tenant</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dashboard.recentPaidInvoices.map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell>
                          <Link
                            href={`/accounting/invoices/${inv.id}`}
                            className="font-mono text-sm hover:underline"
                          >
                            {inv.invoiceNumber}
                          </Link>
                        </TableCell>
                        <TableCell>{inv.tenantName}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatUsd(inv.amountPaid)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Overdue invoices</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Due</TableHead>
                      <TableHead className="text-right">Days</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dashboard.overdueInvoices.map((inv) => (
                      <TableRow key={inv.id} className="bg-red-50/80 dark:bg-red-950/30">
                        <TableCell>
                          <Link
                            href={`/accounting/invoices/${inv.id}`}
                            className="font-mono text-sm hover:underline"
                          >
                            {inv.invoiceNumber}
                          </Link>
                          <p className="text-xs text-muted-foreground">{inv.tenantName}</p>
                        </TableCell>
                        <TableCell>
                          {format(new Date(inv.dueDate), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-red-700 dark:text-red-400">
                          {inv.daysOverdue ?? '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                    {!dashboard.overdueInvoices.length && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground">
                          No overdue invoices
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
