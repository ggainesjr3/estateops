'use client';

import { useMemo, useState } from 'react';
import { CreateInvoiceDialog } from '@web/components/accounting/create-invoice-dialog';
import { PayInvoiceDialog } from '@web/components/accounting/pay-invoice-dialog';
import {
  InvoicesFilters,
  type InvoiceFilters,
} from '@web/components/accounting/invoices-filters';
import { InvoicesTable } from '@web/components/accounting/invoices-table';
import { EmptyState } from '@web/components/shared/empty-state';
import { PageHeader } from '@web/components/shared/page-header';
import { TableSkeleton } from '@web/components/shared/table-skeleton';
import { Button } from '@web/components/ui/button';
import type { CursorPage, InvoiceSummary, Property } from '@web/lib/api/types';

import { useInvoicesList } from '@web/lib/queries/use-accounting';

export function InvoicesPageClient({
  initialData,
  properties,
  serverError,
}: {
  initialData: CursorPage<InvoiceSummary> | null;
  properties: Property[];
  serverError: string | null;
}) {
  const [filters, setFilters] = useState<InvoiceFilters>({});
  const [cursor, setCursor] = useState<string | undefined>();
  const [payInvoice, setPayInvoice] = useState<InvoiceSummary | null>(null);

  const queryFilters = useMemo(
    () => ({
      ...filters,
      limit: '25',
      cursor,
    }),
    [filters, cursor],
  );

  const { data, isLoading, isFetching, error } = useInvoicesList(
    queryFilters,
    cursor ? undefined : (initialData ?? undefined),
  );

  const items = data?.items ?? [];
  const showSkeleton = isLoading && !items.length;
  const hasFilters = Object.values(filters).some(
    (v) => v !== undefined && v !== '',
  );
  const showEmptyState = !showSkeleton && items.length === 0 && !hasFilters;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoices"
        description="Receivables by tenant and unit."
        actions={<CreateInvoiceDialog />}
      />

      {!showEmptyState && (
        <InvoicesFilters
          filters={filters}
          onChange={(f) => { setFilters(f); setCursor(undefined); }}
          properties={properties}
        />
      )}

      {(error || serverError) && (
        <p className="text-sm text-destructive">{error?.message ?? serverError}</p>
      )}

      {isFetching && items.length > 0 && (
        <p className="text-xs text-muted-foreground">Refreshing…</p>
      )}

      {showSkeleton ? (
        <TableSkeleton cols={7} />
      ) : showEmptyState ? (
        <EmptyState
          title="No invoices yet"
          description="Invoices you create for active leases will appear here. Use “Create invoice” to bill rent, late fees, deposits, and more."
        />
      ) : (
        <>
          <InvoicesTable items={items} onPayNow={setPayInvoice} />
          <div className="flex justify-end gap-2">
            {cursor && (
              <Button variant="outline" size="sm" onClick={() => setCursor(undefined)}>
                First page
              </Button>
            )}
            {data?.nextCursor && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCursor(data.nextCursor ?? undefined)}
              >
                Next page
              </Button>
            )}
          </div>
        </>
      )}

      <PayInvoiceDialog
        invoice={payInvoice}
        open={Boolean(payInvoice)}
        onOpenChange={(open) => !open && setPayInvoice(null)}
      />
    </div>
  );
}
