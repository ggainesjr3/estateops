'use client';

import { useState } from 'react';
import { TenantsTable } from '@web/components/tenants/tenants-table';
import { EmptyState } from '@web/components/shared/empty-state';
import { PageHeader } from '@web/components/shared/page-header';
import { TableSkeleton } from '@web/components/shared/table-skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@web/components/ui/select';
import type { TenantListItem } from '@web/lib/api/types';
import { useTenantsList } from '@web/lib/queries/use-tenants';

const TENANT_STATUSES = ['prospect', 'active', 'past', 'blacklisted'] as const;

export function TenantsPageClient({
  initialData,
  serverError,
}: {
  initialData: TenantListItem[];
  serverError: string | null;
}) {
  const [status, setStatus] = useState<string | undefined>();
  const filters = { status, limit: '50' };
  const { data, isLoading, isFetching, error } = useTenantsList(filters, initialData);
  const items = data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tenants"
        description="Residents, prospects, and lease holders."
      />

      <Select
        value={status ?? 'all'}
        onValueChange={(v) => setStatus(v === 'all' ? undefined : v)}
      >
        <SelectTrigger className="max-w-xs">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          {TENANT_STATUSES.map((s) => (
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
        <TableSkeleton cols={6} />
      ) : items.length === 0 ? (
        <EmptyState
          title="No tenants"
          description="Add tenants to assign leases and track communication."
          actionLabel="Add tenant"
          href="/tenants"
        />
      ) : (
        <>
          {isFetching && (
            <p className="text-xs text-muted-foreground">Refreshing…</p>
          )}
          <TenantsTable items={items} />
        </>
      )}
    </div>
  );
}
