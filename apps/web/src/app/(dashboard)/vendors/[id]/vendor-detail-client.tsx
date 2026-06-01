'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { ArrowLeft, Mail, Phone } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { RatingStars } from '@web/components/maintenance/ticket-detail-panels';
import { PriorityBadge } from '@web/components/maintenance/priority-badge';
import { StatusBadge } from '@web/components/maintenance/status-badge';
import { TradeBadges } from '@web/components/vendors/trade-badges';
import { VendorStatusBadge } from '@web/components/vendors/vendor-status-badge';
import { PageHeader } from '@web/components/shared/page-header';
import { TableSkeleton } from '@web/components/shared/table-skeleton';
import { Button } from '@web/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@web/components/ui/card';
import { DataTable } from '@web/components/ui/data-table';
import type {
  MaintenanceTicket,
  MaintenanceTicketListItem,
  Vendor,
} from '@web/lib/api/types';
import { useVendor, useVendorTickets } from '@web/lib/queries/use-vendors';
import { useMemo } from 'react';

const ACTIVE_STATUSES = new Set([
  'created',
  'triaged',
  'assigned',
  'dispatched',
  'in_progress',
]);

const COMPLETED_STATUSES = new Set(['invoiced', 'closed']);

function computeMetrics(tickets: MaintenanceTicket[]) {
  const completed = tickets.filter(
    (t) => t.completedAt != null || COMPLETED_STATUSES.has(t.status),
  );

  let avgCompletionHours: number | null = null;
  const withDuration = completed.filter((t) => t.completedAt);
  if (withDuration.length) {
    const totalMs = withDuration.reduce((sum, t) => {
      const end = new Date(t.completedAt!).getTime();
      const start = new Date(t.createdAt).getTime();
      return sum + (end - start);
    }, 0);
    avgCompletionHours = Math.round(totalMs / withDuration.length / 3_600_000);
  }

  const active = tickets.filter((t) => ACTIVE_STATUSES.has(t.status));

  return { completedCount: completed.length, avgCompletionHours, active };
}

const activeTicketColumns: ColumnDef<MaintenanceTicketListItem>[] = [
  {
    accessorKey: 'title',
    header: 'Ticket',
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
    accessorKey: 'propertyName',
    header: 'Property',
    cell: ({ row }) => row.original.propertyName ?? '—',
  },
  {
    accessorKey: 'priority',
    header: 'Priority',
    cell: ({ row }) => <PriorityBadge priority={row.original.priority} />,
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    accessorKey: 'createdAt',
    header: 'Created',
    cell: ({ row }) => format(new Date(row.original.createdAt), 'MMM d, yyyy'),
  },
];

export function VendorDetailClient({
  vendorId,
  initialVendor,
  initialTickets,
  propertyNames,
  serverError,
}: {
  vendorId: string;
  initialVendor: Vendor | null;
  initialTickets: MaintenanceTicket[];
  propertyNames: Record<string, string>;
  serverError: string | null;
}) {
  const { data: vendor, isLoading, error } = useVendor(vendorId, initialVendor ?? undefined);
  const { data: tickets = initialTickets } = useVendorTickets(vendorId, initialTickets);

  const enrichedTickets = useMemo<MaintenanceTicketListItem[]>(
    () =>
      tickets.map((t) => ({
        ...t,
        propertyName: propertyNames[t.propertyId],
      })),
    [tickets, propertyNames],
  );

  const metrics = useMemo(() => computeMetrics(enrichedTickets), [enrichedTickets]);
  const activeTickets = useMemo(
    () => enrichedTickets.filter((t) => ACTIVE_STATUSES.has(t.status)),
    [enrichedTickets],
  );

  if (isLoading && !vendor) {
    return <TableSkeleton cols={4} />;
  }

  if (!vendor) {
    return (
      <p className="text-sm text-destructive">
        {error?.message ?? serverError ?? 'Vendor not found'}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" className="-ml-2 w-fit" asChild>
        <Link href="/vendors">
          <ArrowLeft className="mr-2 h-4 w-4" />
          All vendors
        </Link>
      </Button>

      <PageHeader title={vendor.name} description="Vendor profile and performance." />

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-xl">{vendor.name}</CardTitle>
            <VendorStatusBadge isActive={vendor.isActive} />
          </div>
          <RatingStars rating={vendor.rating} />
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 text-sm">
          <div className="space-y-2">
            {vendor.email ? (
              <p className="flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                <a href={`mailto:${vendor.email}`} className="text-primary hover:underline">
                  {vendor.email}
                </a>
              </p>
            ) : (
              <p className="text-muted-foreground">No email on file</p>
            )}
            {vendor.phone ? (
              <p className="flex items-center gap-2">
                <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
                <a href={`tel:${vendor.phone}`} className="text-primary hover:underline">
                  {vendor.phone}
                </a>
              </p>
            ) : (
              <p className="text-muted-foreground">No phone on file</p>
            )}
          </div>
          <div className="space-y-2">
            <p>
              <span className="text-muted-foreground">License:</span>{' '}
              <span className="font-medium">{vendor.licenseNumber ?? '—'}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Insurance expires:</span>{' '}
              <span className="font-medium">
                {vendor.insuranceExpiry
                  ? format(new Date(vendor.insuranceExpiry), 'MMM d, yyyy')
                  : '—'}
              </span>
            </p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-muted-foreground mb-2">Trades</p>
            <TradeBadges trades={vendor.trades} />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Jobs completed
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold tabular-nums">
            {metrics.completedCount}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg completion time
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {metrics.avgCompletionHours != null ? `${metrics.avgCompletionHours}h` : '—'}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active tickets
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold tabular-nums">
            {metrics.active.length}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Active tickets</CardTitle>
        </CardHeader>
        <CardContent>
          {activeTickets.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active tickets assigned.</p>
          ) : (
            <DataTable columns={activeTicketColumns} data={activeTickets} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
