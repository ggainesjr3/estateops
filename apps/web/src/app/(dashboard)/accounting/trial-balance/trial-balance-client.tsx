'use client';

import { useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { PageHeader } from '@web/components/shared/page-header';
import { TableSkeleton } from '@web/components/shared/table-skeleton';
import { Input } from '@web/components/ui/input';
import { Label } from '@web/components/ui/label';
import { DataTable } from '@web/components/ui/data-table';
import type { TrialBalanceRow } from '@web/lib/api/types';
import { formatUsd } from '@web/lib/format-currency';
import { useTrialBalance } from '@web/lib/queries/use-accounting';
import { cn } from '@web/lib/utils';

const columns: ColumnDef<TrialBalanceRow, unknown>[] = [
  { accessorKey: 'code', header: 'Code' },
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'type', header: 'Type', cell: ({ row }) => row.original.type },
  {
    accessorKey: 'debit',
    header: () => <span className="w-full block text-right">Debit</span>,
    cell: ({ row }) => (
      <span className="block text-right tabular-nums">{formatUsd(row.original.debit)}</span>
    ),
  },
  {
    accessorKey: 'credit',
    header: () => <span className="w-full block text-right">Credit</span>,
    cell: ({ row }) => (
      <span className="block text-right tabular-nums">{formatUsd(row.original.credit)}</span>
    ),
  },
];

export function TrialBalanceClient() {
  const [asOf, setAsOf] = useState(() => new Date().toISOString().slice(0, 10));
  const { data, isLoading, error } = useTrialBalance(asOf || undefined);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Trial balance"
        description="Debit and credit totals by account."
      />

      <div className="space-y-1 max-w-xs">
        <Label>As of date</Label>
        <Input
          type="date"
          value={asOf}
          onChange={(e) => setAsOf(e.target.value)}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error.message}</p>}

      {isLoading ? (
        <TableSkeleton cols={5} />
      ) : data ? (
        <>
          <DataTable columns={columns} data={data.rows} filterColumnId="name" />
          <div
            className={cn(
              'rounded-md border p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm font-semibold',
              !data.balanced && 'border-red-500 bg-red-50 dark:bg-red-950/30',
            )}
          >
            <div>
              <p className="text-muted-foreground font-normal">Total debits</p>
              <p className="tabular-nums">{formatUsd(data.totalDebit)}</p>
            </div>
            <div>
              <p className="text-muted-foreground font-normal">Total credits</p>
              <p className="tabular-nums">{formatUsd(data.totalCredit)}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-muted-foreground font-normal">Status</p>
              <p className={!data.balanced ? 'text-red-700 dark:text-red-400' : 'text-emerald-700'}>
                {data.balanced ? 'Balanced' : 'Out of balance'}
              </p>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
