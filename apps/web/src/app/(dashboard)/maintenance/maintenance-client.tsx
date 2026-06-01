'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { LayoutGrid, List, Plus } from 'lucide-react';
import type { MaintenanceTicketStatus } from '@web/lib/api/types';
import { MaintenanceFilters } from '@web/components/maintenance/maintenance-filters';
import { MaintenanceKanban } from '@web/components/maintenance/maintenance-kanban';
import { MaintenanceTicketsTable } from '@web/components/maintenance/maintenance-tickets-table';
import { PageHeader } from '@web/components/shared/page-header';
import { TableSkeleton } from '@web/components/shared/table-skeleton';
import { Button } from '@web/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@web/components/ui/tabs';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@web/lib/api/endpoints';
import type {
  MaintenanceTicket,
  MaintenanceTicketListItem,
  PropertyListItem,
} from '@web/lib/api/types';
import { queryKeys } from '@web/lib/queries/keys';
import { useMaintenanceTicketsList } from '@web/lib/queries/use-maintenance';
import { useVendorsList } from '@web/lib/queries/use-vendors';
import {
  broadcastMaintenanceUpdate,
  useMaintenanceRealtime,
} from '@web/lib/realtime/use-maintenance-realtime';
import { useUiStore } from '@web/stores/ui-store';

export function MaintenancePageClient({
  initialTickets,
  initialProperties,
  serverError,
}: {
  initialTickets: MaintenanceTicket[];
  initialProperties: PropertyListItem[];
  serverError: string | null;
}) {
  const [view, setView] = useState<'table' | 'kanban'>('kanban');
  const [status, setStatus] = useState<string | undefined>();
  const [priority, setPriority] = useState<string | undefined>();
  const [trade, setTrade] = useState<string | undefined>();
  const [propertyId, setPropertyId] = useState<string | undefined>();

  const filters = { status, priority, trade, propertyId, limit: '100' };
  const { data: tickets = [], isLoading, error } = useMaintenanceTicketsList(
    filters,
    initialTickets as MaintenanceTicketListItem[],
  );
  const { data: vendors = [] } = useVendorsList({}, {});
  const token = useUiStore((s) => s.accessToken);
  const qc = useQueryClient();

  useMaintenanceRealtime();

  const propertyMap = useMemo(
    () => Object.fromEntries(initialProperties.map((p) => [p.id, p.name])),
    [initialProperties],
  );
  const vendorMap = useMemo(
    () => Object.fromEntries(vendors.map((v) => [v.id, v.name])),
    [vendors],
  );

  const enriched: MaintenanceTicketListItem[] = useMemo(
    () =>
      tickets.map((t) => ({
        ...t,
        propertyName: propertyMap[t.propertyId],
        vendorName: t.assignedVendorId ? vendorMap[t.assignedVendorId] : undefined,
      })),
    [tickets, propertyMap, vendorMap],
  );

  const handleKanbanTransition = async (
    ticketId: string,
    to: MaintenanceTicketStatus,
    note?: string,
  ) => {
    await api.maintenance.tickets.transition(
      ticketId,
      { status: to, note },
      token ?? undefined,
    );
    broadcastMaintenanceUpdate(ticketId);
    void qc.invalidateQueries({ queryKey: queryKeys.maintenance.all });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Maintenance"
        description="Track work orders from triage through completion."
        actions={
          <Button asChild>
            <Link href="/maintenance/new">
              <Plus className="mr-2 h-4 w-4" />
              New ticket
            </Link>
          </Button>
        }
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          value={view}
          onValueChange={(v) => setView(v as 'table' | 'kanban')}
        >
          <TabsList>
            <TabsTrigger value="kanban" className="gap-2">
              <LayoutGrid className="h-4 w-4" />
              Board
            </TabsTrigger>
            <TabsTrigger value="table" className="gap-2">
              <List className="h-4 w-4" />
              Table
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <MaintenanceFilters
        status={status}
        priority={priority}
        trade={trade}
        propertyId={propertyId}
        onStatus={setStatus}
        onPriority={setPriority}
        onTrade={setTrade}
        onProperty={setPropertyId}
        properties={initialProperties}
      />

      {(error || serverError) && (
        <p className="text-sm text-destructive">{error?.message ?? serverError}</p>
      )}

      {isLoading && !enriched.length ? (
        <TableSkeleton cols={6} />
      ) : view === 'kanban' ? (
        <MaintenanceKanban
          tickets={enriched}
          onTransition={(id, to, note) => {
            void handleKanbanTransition(id, to, note);
          }}
        />
      ) : (
        <MaintenanceTicketsTable tickets={enriched} />
      )}
    </div>
  );
}
