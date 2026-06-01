'use client';

import { useMemo, useState } from 'react';
import { AddVendorDialog } from '@web/components/vendors/add-vendor-dialog';
import { VendorsTable } from '@web/components/maintenance/vendors-table';
import { EmptyState } from '@web/components/shared/empty-state';
import { PageHeader } from '@web/components/shared/page-header';
import { TableSkeleton } from '@web/components/shared/table-skeleton';
import { Button } from '@web/components/ui/button';
import type { MaintenanceTicket, Vendor, VendorListItem } from '@web/lib/api/types';
import { useMaintenanceTicketsList } from '@web/lib/queries/use-maintenance';
import { useVendorsList } from '@web/lib/queries/use-vendors';

function enrichVendorListItem(
  v: Vendor,
  ticketCounts: Record<string, number>,
): VendorListItem {
  let insuranceStatus: VendorListItem['insuranceStatus'] = 'unknown';
  if (v.insuranceExpiry) {
    const days = (new Date(v.insuranceExpiry).getTime() - Date.now()) / 86_400_000;
    if (days < 0) insuranceStatus = 'expired';
    else if (days < 30) insuranceStatus = 'expiring';
    else insuranceStatus = 'valid';
  }
  return {
    ...v,
    activeTicketCount: ticketCounts[v.id] ?? 0,
    insuranceStatus,
  };
}

const ACTIVE_STATUSES = new Set([
  'created',
  'triaged',
  'assigned',
  'dispatched',
  'in_progress',
]);

function countActiveByVendor(tickets: MaintenanceTicket[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const t of tickets) {
    if (!t.assignedVendorId || !ACTIVE_STATUSES.has(t.status)) continue;
    counts[t.assignedVendorId] = (counts[t.assignedVendorId] ?? 0) + 1;
  }
  return counts;
}

export function VendorsPageClient({
  initialVendors,
  initialTickets,
  serverError,
}: {
  initialVendors: VendorListItem[];
  initialTickets: MaintenanceTicket[];
  serverError: string | null;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { data: tickets = initialTickets } = useMaintenanceTicketsList(
    { limit: '100' },
    initialTickets,
  );
  const ticketCounts = useMemo(() => countActiveByVendor(tickets), [tickets]);
  const enrichedInitial = useMemo(
    () => initialVendors.map((v) => enrichVendorListItem(v, ticketCounts)),
    [initialVendors, ticketCounts],
  );

  const { data: vendors = [], isLoading, error } = useVendorsList(
    {},
    ticketCounts,
    enrichedInitial,
  );

  const showSkeleton = isLoading && !vendors.length;
  const showEmptyState = !showSkeleton && vendors.length === 0;

  function handleCreated() {
    setSuccessMessage('Vendor added successfully.');
    window.setTimeout(() => setSuccessMessage(null), 4000);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vendors"
        description="Licensed contractors and service partners."
        actions={
          <Button type="button" onClick={() => setDialogOpen(true)}>
            Add vendor
          </Button>
        }
      />

      <AddVendorDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={handleCreated}
      />

      {successMessage && (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
          {successMessage}
        </p>
      )}

      {(error || serverError) && (
        <p className="text-sm text-destructive">{error?.message ?? serverError}</p>
      )}

      {showSkeleton ? (
        <TableSkeleton cols={7} />
      ) : showEmptyState ? (
        <EmptyState
          title="No vendors yet"
          description="Add licensed contractors and service partners so you can assign maintenance tickets and track their work."
          actionLabel="Add vendor"
          onAction={() => setDialogOpen(true)}
        />
      ) : (
        <VendorsTable vendors={vendors} />
      )}
    </div>
  );
}
