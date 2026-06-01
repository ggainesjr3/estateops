'use client';

import Link from 'next/link';
import { type ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@web/components/ui/data-table';
import type { MaintenanceTicketListItem } from '@web/lib/api/types';
import { STATUS_LABELS } from '@web/lib/maintenance-state-machine';
import { PriorityBadge } from './priority-badge';
import { SlaIndicator } from './sla-indicator';
import { TradeIcon } from './trade-icon';

const columns: ColumnDef<MaintenanceTicketListItem>[] = [
  {
    accessorKey: 'title',
    header: 'Title',
    enableSorting: true,
    cell: ({ row }) => (
      <Link
        href={`/maintenance/${row.original.id}`}
        className="font-medium text-primary hover:underline"
      >
        {row.original.title}
      </Link>
    ),
  },
  {
    accessorKey: 'description',
    header: 'Description',
    enableSorting: false,
    cell: ({ row }) => (
      <span className="line-clamp-2 max-w-[200px] text-sm text-muted-foreground">
        {row.original.description ?? '—'}
      </span>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    enableSorting: true,
    cell: ({ row }) => STATUS_LABELS[row.original.status],
    filterFn: 'equalsString',
  },
  {
    accessorKey: 'priority',
    header: 'Priority',
    enableSorting: true,
    cell: ({ row }) => <PriorityBadge priority={row.original.priority} />,
    filterFn: 'equalsString',
  },
  {
    accessorKey: 'trade',
    header: 'Trade',
    enableSorting: true,
    cell: ({ row }) => (
      <span className="inline-flex items-center gap-1 capitalize">
        <TradeIcon trade={row.original.trade} />
        {row.original.trade.replace('_', ' ')}
      </span>
    ),
    filterFn: 'equalsString',
  },
  {
    id: 'sla',
    header: 'SLA',
    cell: ({ row }) => (
      <SlaIndicator slaDueAt={row.original.slaDueAt} status={row.original.status} />
    ),
  },
  {
    accessorKey: 'propertyId',
    header: 'Property',
    enableSorting: true,
    cell: ({ row }) => row.original.propertyName ?? row.original.propertyId.slice(0, 8),
    filterFn: 'equalsString',
  },
  {
    id: 'vendor',
    header: 'Vendor',
    cell: ({ row }) => row.original.vendorName ?? '—',
  },
  {
    accessorKey: 'createdAt',
    header: 'Created',
    enableSorting: true,
    cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString(),
  },
];

export function MaintenanceTicketsTable({
  tickets,
}: {
  tickets: MaintenanceTicketListItem[];
}) {
  return (
    <DataTable
      columns={columns}
      data={tickets}
      filterColumnId="title"
      filterPlaceholder="Filter by title…"
    />
  );
}
