'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import type { ColumnDef } from '@tanstack/react-table';
import { invoiceTypeLabels } from '@web/lib/invoice-status-styles';
import type { InvoiceSummary } from '@web/lib/api/types';
import { formatUsd } from '@web/lib/format-currency';
import { isInvoicePayable } from '@web/lib/invoice-utils';
import { DataTable } from '@web/components/ui/data-table';
import { Button } from '@web/components/ui/button';
import { InvoiceStatusBadge } from './invoice-status-badge';

function buildColumns(onPayNow?: (invoice: InvoiceSummary) => void): ColumnDef<InvoiceSummary, unknown>[] {
  const cols: ColumnDef<InvoiceSummary, unknown>[] = [
    {
      accessorKey: 'invoiceNumber',
      header: 'Invoice #',
      cell: ({ row }) => (
        <Link
          href={`/accounting/invoices/${row.original.id}`}
          className="font-medium hover:underline font-mono text-sm"
        >
          {row.original.invoiceNumber}
        </Link>
      ),
    },
    {
      accessorKey: 'tenantName',
      header: 'Tenant',
    },
    {
      accessorKey: 'unitLabel',
      header: 'Unit',
      cell: ({ row }) => row.original.unitLabel ?? '—',
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => invoiceTypeLabels[row.original.type],
    },
    {
      id: 'amount',
      header: 'Amount',
      cell: ({ row }) => formatUsd(row.original.amountDue),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <InvoiceStatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'dueDate',
      header: 'Due',
      cell: ({ row }) => format(new Date(row.original.dueDate), 'MMM d, yyyy'),
    },
  ];

  if (onPayNow) {
    cols.push({
      id: 'actions',
      header: '',
      cell: ({ row }) =>
        isInvoicePayable(row.original.status) ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onPayNow(row.original)}
          >
            Pay now
          </Button>
        ) : null,
    });
  }

  return cols;
}

export function InvoicesTable({
  items,
  onPayNow,
}: {
  items: InvoiceSummary[];
  onPayNow?: (invoice: InvoiceSummary) => void;
}) {
  return (
    <DataTable
      columns={buildColumns(onPayNow)}
      data={items}
      filterColumnId="tenantName"
      filterPlaceholder="Filter by tenant…"
      emptyMessage="No invoices match your filters."
    />
  );
}
