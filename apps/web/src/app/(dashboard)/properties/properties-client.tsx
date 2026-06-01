'use client';

import { useEffect, useMemo, useState } from 'react';
import { AddPropertyDialog } from '@web/components/properties/add-property-dialog';
import {
  PropertiesFilters,
  type PropertyFilters,
} from '@web/components/properties/properties-filters';
import { PropertiesTable } from '@web/components/properties/properties-table';
import { EmptyState } from '@web/components/shared/empty-state';
import { PageHeader } from '@web/components/shared/page-header';
import { TableSkeleton } from '@web/components/shared/table-skeleton';
import { Button } from '@web/components/ui/button';
import type { PropertyListItem } from '@web/lib/api/types';
import { usePropertiesList } from '@web/lib/queries/use-properties';

export function PropertiesPageClient({
  initialData,
  serverError,
}: {
  initialData: PropertyListItem[];
  serverError: string | null;
}) {
  const [filters, setFilters] = useState<PropertyFilters>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (!showSuccess) return;
    const timeout = setTimeout(() => setShowSuccess(false), 4000);
    return () => clearTimeout(timeout);
  }, [showSuccess]);

  const queryFilters = useMemo(
    () => ({
      type: filters.type,
      status: filters.status,
      city: filters.city,
      limit: '50',
    }),
    [filters],
  );

  const { data, isLoading, isFetching, error } = usePropertiesList(
    queryFilters,
    initialData,
  );

  const items = data ?? [];
  const showSkeleton = isLoading && !items.length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Properties"
        description="Portfolio overview with occupancy and status."
        actions={
          <Button onClick={() => setDialogOpen(true)}>Add property</Button>
        }
      />

      {showSuccess && (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Property created successfully.
        </p>
      )}

      <PropertiesFilters filters={filters} onChange={setFilters} />

      {(error || serverError) && (
        <p className="text-sm text-destructive">{error?.message ?? serverError}</p>
      )}

      {showSkeleton ? (
        <TableSkeleton cols={6} />
      ) : items.length === 0 ? (
        <EmptyState
          title="No properties"
          description="Add your first property to start managing units and leases."
          actionLabel="Add property"
          onAction={() => setDialogOpen(true)}
        />
      ) : (
        <>
          {isFetching && (
            <p className="text-xs text-muted-foreground">Refreshing…</p>
          )}
          <PropertiesTable items={items} />
        </>
      )}

      <AddPropertyDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={() => setShowSuccess(true)}
      />
    </div>
  );
}
