'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Download } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { EmptyState } from '@web/components/shared/empty-state';
import { PageHeader } from '@web/components/shared/page-header';
import { TableSkeleton } from '@web/components/shared/table-skeleton';
import { Button } from '@web/components/ui/button';
import { Input } from '@web/components/ui/input';
import { Label } from '@web/components/ui/label';
import { DataTable } from '@web/components/ui/data-table';
import { cn } from '@web/lib/utils';
import type { RentRollReportRow } from '@web/lib/api/types';
import { formatUsd } from '@web/lib/format-currency';
import { exportToCsv } from '@web/lib/utils/export-csv';
import { useRentRollReport } from '@web/lib/queries/use-reports';

const columns: ColumnDef<RentRollReportRow, unknown>[] = [
  { accessorKey: 'property', header: 'Property' },
  { accessorKey: 'unit', header: 'Unit' },
  {
    accessorKey: 'tenant',
    header: 'Tenant',
    cell: ({ row }) => row.original.tenant ?? '—',
  },
  {
    accessorKey: 'leaseStart',
    header: 'Lease start',
    cell: ({ row }) => format(new Date(row.original.leaseStart), 'MMM d, yyyy'),
  },
  {
    accessorKey: 'leaseEnd',
    header: 'Lease end',
    cell: ({ row }) =>
      row.original.leaseEnd
        ? format(new Date(row.original.leaseEnd), 'MMM d, yyyy')
        : '—',
  },
  {
    accessorKey: 'monthlyRent',
    header: () => <span className="block text-right">Monthly rent</span>,
    cell: ({ row }) => (
      <span className="block text-right tabular-nums">{formatUsd(row.original.monthlyRent)}</span>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <span
        className={cn(
          'inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize',
          row.original.status === 'past_due'
            ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200'
            : 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200',
        )}
      >
        {row.original.status.replace('_', ' ')}
      </span>
    ),
  },
  {
    accessorKey: 'daysPastDue',
    header: () => <span className="block text-right">Days past due</span>,
    cell: ({ row }) => (
      <span
        className={cn(
          'block text-right tabular-nums',
          row.original.daysPastDue > 0 && 'text-red-600 font-medium',
        )}
      >
        {row.original.daysPastDue}
      </span>
    ),
  },
  {
    accessorKey: 'balance',
    header: () => <span className="block text-right">Balance</span>,
    cell: ({ row }) => (
      <span
        className={cn(
          'block text-right tabular-nums',
          parseFloat(row.original.balance) > 0 && 'text-red-600 font-medium',
        )}
      >
        {formatUsd(row.original.balance)}
      </span>
    ),
  },
];

export function RentRollReportClient({
  initialData,
  serverError,
}: {
  initialData: RentRollReportRow[] | null;
  serverError: string | null;
}) {
  const [asOf, setAsOf] = useState(new Date().toISOString().slice(0, 10));
  const { data, isLoading, error, isFetching } = useRentRollReport(
    asOf,
    initialData ?? undefined,
  );
  const rows = data ?? [];

  function exportCsv() {
    exportToCsv(
      'rent-roll-report.csv',
      rows.map((r) => ({
        property: r.property,
        unit: r.unit,
        tenant: r.tenant ?? '',
        leaseStart: r.leaseStart,
        leaseEnd: r.leaseEnd ?? '',
        monthlyRent: r.monthlyRent,
        status: r.status,
        daysPastDue: r.daysPastDue,
        balance: r.balance,
      })),
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rent roll report"
        description="Active leases and balances as of a specific date."
        actions={
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={!rows.length}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        }
      />

      <div className="max-w-xs space-y-1">
        <Label htmlFor="asOf">As of date</Label>
        <Input id="asOf" type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} />
      </div>

      {(error || serverError) && (
        <p className="text-sm text-destructive">{error?.message ?? serverError}</p>
      )}

      {isLoading && !rows.length ? (
        <TableSkeleton cols={8} />
      ) : !rows.length ? (
        <EmptyState
          title="No rent roll data"
          description="Active leases as of the selected date will appear here."
          href="/leases"
          actionLabel="View leases"
        />
      ) : (
        <>
          {isFetching && <p className="text-xs text-muted-foreground">Refreshing…</p>}
          <DataTable
            columns={columns}
            data={rows}
            filterColumnId="tenant"
            filterPlaceholder="Filter tenant…"
          />
        </>
      )}
    </div>
  );
}
