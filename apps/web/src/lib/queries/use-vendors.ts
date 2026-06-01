'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@web/lib/api/endpoints';
import type { MaintenanceTicket, Vendor, VendorListItem } from '@web/lib/api/types';
import { queryKeys } from '@web/lib/queries/keys';
import { useUiStore } from '@web/stores/ui-store';

function insuranceStatus(expiry: string | null): VendorListItem['insuranceStatus'] {
  if (!expiry) return 'unknown';
  const days = (new Date(expiry).getTime() - Date.now()) / 86_400_000;
  if (days < 0) return 'expired';
  if (days < 30) return 'expiring';
  return 'valid';
}

export function useVendorsList(
  filters: Record<string, string | undefined>,
  ticketCounts: Record<string, number>,
  initialData?: VendorListItem[],
) {
  const token = useUiStore((s) => s.accessToken);
  return useQuery({
    queryKey: queryKeys.vendors.list(filters),
    queryFn: async () => {
      const page = await api.vendors.list(
        { ...filters, limit: filters.limit ?? '100' },
        token ?? undefined,
      );
      return page.items.map(
        (v) =>
          ({
            ...v,
            activeTicketCount: ticketCounts[v.id] ?? 0,
            insuranceStatus: insuranceStatus(v.insuranceExpiry),
          }) satisfies VendorListItem,
      );
    },
    enabled: !!token,
    initialData,
  });
}

export function useVendor(id: string, initialData?: Vendor) {
  const token = useUiStore((s) => s.accessToken);
  return useQuery({
    queryKey: queryKeys.vendors.detail(id),
    queryFn: () => api.vendors.get(id, token ?? undefined),
    enabled: !!token && !!id,
    initialData,
  });
}

export function useVendorTickets(vendorId: string, initialData?: MaintenanceTicket[]) {
  const token = useUiStore((s) => s.accessToken);
  return useQuery({
    queryKey: queryKeys.vendors.tickets(vendorId),
    queryFn: async () => {
      const page = await api.vendors.tickets(
        vendorId,
        { limit: '100' },
        token ?? undefined,
      );
      return page.items as MaintenanceTicket[];
    },
    enabled: !!token && !!vendorId,
    initialData,
  });
}

export function useCreateVendor() {
  const qc = useQueryClient();
  const token = useUiStore((s) => s.accessToken);
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api.vendors.create(body, token ?? undefined),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.vendors.all });
    },
  });
}
