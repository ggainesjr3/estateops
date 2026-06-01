'use client';

import { useState } from 'react';
import { CreateLeaseDialog } from '@web/components/leases/create-lease-dialog';
import { LeasesTable } from '@web/components/leases/leases-table';
import { EmptyState } from '@web/components/shared/empty-state';
import { PageHeader } from '@web/components/shared/page-header';
import { TableSkeleton } from '@web/components/shared/table-skeleton';
import { Button } from '@web/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@web/components/ui/select';
import type { Lease, LeaseListItem } from '@web/lib/api/types';
import { useLeasesList } from '@web/lib/queries/use-leases';

const LEASE_STATUSES = [
  'draft',
  'pending',
  'active',
  'expired',
  'renewed',
  'terminated',
] as const;

export function LeasesPageClient({
  initialItems,
  serverError,
}: {
  initialItems: Lease[];
  serverError: string | null;
}) {
  const [status, setStatus] = useState<string | undefined>();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const filters = { status, limit: '50' };
  const initialData = initialItems.map(
    (l) => ({ ...l, tenantLabel: '—', unitLabel: l.unitId.slice(0, 8) }) satisfies LeaseListItem,
  );
  const { data, isLoading, isFetching, error } = useLeasesList(filters, initialData);
  const items = data ?? [];
  const showEmptyState = !isLoading && items.length === 0 && !status;

  function handleCreated() {
    setSuccessMessage('Lease created in draft status.');
    window.setTimeout(() => setSuccessMessage(null), 5000);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leases"
        description="Track draft through active leases and renewals."
        actions={
          <Button type="button" onClick={() => setDialogOpen(true)}>
            Create lease
          </Button>
        }
      />

      <CreateLeaseDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={handleCreated}
      />

      {successMessage && (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
          {successMessage}
        </p>
      )}

      <Select
        value={status ?? 'all'}
        onValueChange={(v) => setStatus(v === 'all' ? undefined : v)}
      >
        <SelectTrigger className="max-w-xs">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          {LEASE_STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {(error || serverError) && (
        <p className="text-sm text-destructive">{error?.message ?? serverError}</p>
      )}

      {isLoading && !items.length ? (
        <TableSkeleton cols={5} />
      ) : showEmptyState ? (
        <EmptyState
          title="No leases yet"
          description="Create a lease in draft, send it for signing, and activate when both parties have signed."
          actionLabel="Create lease"
          onAction={() => setDialogOpen(true)}
        />
      ) : items.length === 0 ? (
        <EmptyState
          title="No matching leases"
          description="Try a different status filter or create a new lease."
          actionLabel="Create lease"
          onAction={() => setDialogOpen(true)}
        />
      ) : (
        <>
          {isFetching && (
            <p className="text-xs text-muted-foreground">Refreshing…</p>
          )}
          <LeasesTable items={items} />
        </>
      )}
    </div>
  );
}
