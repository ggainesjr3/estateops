'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@web/lib/api/endpoints';
import type {
  MaintenanceTicket,
  MaintenanceTicketDetail,
  MaintenanceTicketListItem,
} from '@web/lib/api/types';
import { queryKeys } from '@web/lib/queries/keys';
import { broadcastMaintenanceUpdate } from '@web/lib/realtime/use-maintenance-realtime';
import { useUiStore } from '@web/stores/ui-store';

export function useMaintenanceTicketsList(
  filters: Record<string, string | undefined>,
  initialData?: MaintenanceTicketListItem[],
) {
  const token = useUiStore((s) => s.accessToken);
  return useQuery({
    queryKey: queryKeys.maintenance.list(filters),
    queryFn: async () => {
      const page = await api.maintenance.tickets.list(
        { ...filters, limit: filters.limit ?? '100' },
        token ?? undefined,
      );
      return page.items as MaintenanceTicketListItem[];
    },
    enabled: !!token,
    initialData,
    refetchInterval: 20_000,
  });
}

export function useMaintenanceTicket(id: string, initialData?: MaintenanceTicketDetail) {
  const token = useUiStore((s) => s.accessToken);
  return useQuery({
    queryKey: queryKeys.maintenance.detail(id),
    queryFn: () => api.maintenance.tickets.get(id, token ?? undefined),
    enabled: !!token && !!id,
    initialData,
    refetchInterval: 15_000,
  });
}

export function useCreateMaintenanceTicket() {
  const token = useUiStore((s) => s.accessToken);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api.maintenance.tickets.create(body, token ?? undefined),
    onSuccess: (ticket) => {
      broadcastMaintenanceUpdate(ticket.id);
      qc.invalidateQueries({ queryKey: queryKeys.maintenance.all });
    },
  });
}

export function useUpdateMaintenanceTicket(id: string) {
  const token = useUiStore((s) => s.accessToken);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api.maintenance.tickets.update(id, body, token ?? undefined),
    onSuccess: () => {
      broadcastMaintenanceUpdate(id);
      qc.invalidateQueries({ queryKey: queryKeys.maintenance.detail(id) });
      qc.invalidateQueries({ queryKey: queryKeys.maintenance.all });
    },
  });
}

export function useTransitionMaintenanceTicket(id: string) {
  const token = useUiStore((s) => s.accessToken);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { status: string; note?: string }) =>
      api.maintenance.tickets.transition(id, body, token ?? undefined),
    onSuccess: () => {
      broadcastMaintenanceUpdate(id);
      qc.invalidateQueries({ queryKey: queryKeys.maintenance.detail(id) });
      qc.invalidateQueries({ queryKey: queryKeys.maintenance.all });
    },
  });
}

export function useAssignMaintenanceTicket(id: string) {
  const token = useUiStore((s) => s.accessToken);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { vendorId?: string | null; staffId?: string | null }) =>
      api.maintenance.tickets.assign(id, body, token ?? undefined),
    onSuccess: () => {
      broadcastMaintenanceUpdate(id);
      qc.invalidateQueries({ queryKey: queryKeys.maintenance.detail(id) });
      qc.invalidateQueries({ queryKey: queryKeys.maintenance.all });
    },
  });
}

export function useApproveVendorInvoice(ticketId: string) {
  const token = useUiStore((s) => s.accessToken);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (invoiceId: string) =>
      api.maintenance.tickets.approveInvoice(ticketId, invoiceId, token ?? undefined),
    onSuccess: () => {
      broadcastMaintenanceUpdate(ticketId);
      qc.invalidateQueries({ queryKey: queryKeys.maintenance.detail(ticketId) });
    },
  });
}

export function usePayVendorInvoice(ticketId: string) {
  const token = useUiStore((s) => s.accessToken);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (invoiceId: string) =>
      api.maintenance.tickets.payInvoice(ticketId, invoiceId, token ?? undefined),
    onSuccess: () => {
      broadcastMaintenanceUpdate(ticketId);
      qc.invalidateQueries({ queryKey: queryKeys.maintenance.detail(ticketId) });
    },
  });
}

export function usePollTicketForAi(id: string | null, enabled: boolean) {
  const token = useUiStore((s) => s.accessToken);
  return useQuery({
    queryKey: [...queryKeys.maintenance.detail(id ?? ''), 'ai-poll'],
    queryFn: () => api.maintenance.tickets.get(id!, token ?? undefined),
    enabled: !!token && !!id && enabled,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return 2000;
      if (data.aiClassification || data.status !== 'created') return false;
      return 2000;
    },
  });
}
