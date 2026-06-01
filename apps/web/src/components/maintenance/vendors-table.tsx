'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { type ColumnDef } from '@tanstack/react-table';
import { RatingStars } from '@web/components/maintenance/ticket-detail-panels';
import { TradeBadges } from '@web/components/vendors/trade-badges';
import { VendorStatusBadge } from '@web/components/vendors/vendor-status-badge';
import { DataTable } from '@web/components/ui/data-table';
import type { VendorListItem } from '@web/lib/api/types';
import { cn } from '@web/lib/utils';

function insuranceExpiryClass(expiry: string | null): string {
  if (!expiry) return 'text-muted-foreground';
  const days = (new Date(expiry).getTime() - Date.now()) / 86_400_000;
  if (days < 0) return 'text-destructive font-medium';
  if (days < 30) return 'text-amber-600 dark:text-amber-400 font-medium';
  return '';
}

const columns: ColumnDef<VendorListItem>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => (
      <Link
        href={`/vendors/${row.original.id}`}
        className="font-medium text-primary hover:underline"
      >
        {row.original.name}
      </Link>
    ),
  },
  {
    accessorKey: 'trades',
    header: 'Trades',
    cell: ({ row }) => <TradeBadges trades={row.original.trades} />,
  },
  {
    accessorKey: 'rating',
    header: 'Rating',
    cell: ({ row }) => <RatingStars rating={row.original.rating} />,
  },
  {
    accessorKey: 'phone',
    header: 'Phone',
    cell: ({ row }) => row.original.phone ?? '—',
  },
  {
    accessorKey: 'insuranceExpiry',
    header: 'Insurance expiry',
    cell: ({ row }) => {
      const expiry = row.original.insuranceExpiry;
      if (!expiry) return '—';
      return (
        <span className={cn('tabular-nums', insuranceExpiryClass(expiry))}>
          {format(new Date(expiry), 'MMM d, yyyy')}
        </span>
      );
    },
  },
  {
    accessorKey: 'activeTicketCount',
    header: 'Active tickets',
    cell: ({ row }) => (
      <span className="tabular-nums">{row.original.activeTicketCount ?? 0}</span>
    ),
  },
  {
    accessorKey: 'isActive',
    header: 'Status',
    cell: ({ row }) => <VendorStatusBadge isActive={row.original.isActive} />,
  },
];

export function VendorsTable({ vendors }: { vendors: VendorListItem[] }) {
  return (
    <DataTable
      columns={columns}
      data={vendors}
      filterColumnId="name"
      filterPlaceholder="Filter by name…"
      emptyMessage="No vendors match your filters."
    />
  );
}
