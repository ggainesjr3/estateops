'use client';

import { format } from 'date-fns';
import { Download } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { PageHeader } from '@web/components/shared/page-header';
import { TableSkeleton } from '@web/components/shared/table-skeleton';
import { Button } from '@web/components/ui/button';
import { DataTable } from '@web/components/ui/data-table';
import { api } from '@web/lib/api/endpoints';
import { downloadAuthenticatedCsv } from '@web/lib/api/download-csv';
import type { RentRollRow } from '@web/lib/api/types';
import { formatUsd } from '@web/lib/format-currency';
import { useRentRoll } from '@web/lib/queries/use-accounting';

const columns: ColumnDef<RentRollRow, unknown>[] = [
  { accessorKey: 'propertyName', header: 'Property' },
  { accessorKey: 'unitNumber', header: 'Unit' },
  {
    accessorKey: 'tenantName',
    header: 'Tenant',
    cell: ({ row }) => row.original.tenantName ?? '—',
  },
  {
    accessorKey: 'leaseEndDate',
    header: 'Lease end',
    cell: ({ row }) =>
      row.original.leaseEndDate
        ? format(new Date(row.original.leaseEndDate), 'MMM d, yyyy')
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
    accessorKey: 'lastPaymentDate',
    header: 'Last payment',
    cell: ({ row }) =>
      row.original.lastPaymentDate
        ? format(new Date(row.original.lastPaymentDate), 'MMM d, yyyy')
        : '—',
  },
  { accessorKey: 'status', header: 'Status', cell: ({ row }) => row.original.status },
];

export function RentRollClient({
  initialData,
  serverError,
}: {
  initialData: RentRollRow[] | null;
  serverError: string | null;
}) {
  const { data, isLoading, error, isFetching } = useRentRoll(initialData ?? undefined);
  const rows = data ?? [];

  async function exportCsv() {
    await downloadAuthenticatedCsv(api.accounting.exportRentRoll(), 'rent-roll.csv');
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rent roll"
        description="Occupancy and rent by unit."
        actions={
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        }
      />

      {(error || serverError) && (
        <p className="text-sm text-destructive">{error?.message ?? serverError}</p>
      )}

      {isLoading && !rows.length ? (
        <TableSkeleton cols={7} />
      ) : (
        <>
          {isFetching && <p className="text-xs text-muted-foreground">Refreshing…</p>}
          <DataTable
            columns={columns}
            data={rows}
            filterColumnId="tenantName"
            filterPlaceholder="Filter tenant…"
          />
        </>
      )}
    </div>
  );
}
