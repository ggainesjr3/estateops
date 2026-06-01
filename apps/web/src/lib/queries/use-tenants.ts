'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@web/lib/api/endpoints';
import type { TenantDetail, TenantListItem } from '@web/lib/api/types';
import { queryKeys } from '@web/lib/queries/keys';
import { useUiStore } from '@web/stores/ui-store';

export function useTenantsList(
  filters: Record<string, string | undefined>,
  initialData?: TenantListItem[],
) {
  const token = useUiStore((s) => s.accessToken);
  return useQuery({
    queryKey: queryKeys.tenants.list(filters),
    queryFn: async () => {
      const page = await api.tenants.list(filters, token ?? undefined);
      return Promise.all(
        page.items.map(async (t) => {
          try {
            const detail = await api.tenants.get(t.id, token ?? undefined);
            const lease = detail.activeLease;
            return {
              ...t,
              activeUnitLabel: lease
                ? `${lease.propertyName} · ${lease.unitNumber}`
                : null,
              activeLeaseId: lease?.id ?? null,
              leaseEndDate: lease?.endDate ?? null,
            } satisfies TenantListItem;
          } catch {
            return {
              ...t,
              activeUnitLabel: null,
              activeLeaseId: null,
              leaseEndDate: null,
            };
          }
        }),
      );
    },
    enabled: !!token,
    initialData,
  });
}

export function useTenant(id: string, initialData?: TenantDetail) {
  const token = useUiStore((s) => s.accessToken);
  return useQuery({
    queryKey: queryKeys.tenants.detail(id),
    queryFn: () => api.tenants.get(id, token ?? undefined),
    enabled: !!token && !!id,
    initialData,
  });
}

export function useTenantCommunication(id: string) {
  const token = useUiStore((s) => s.accessToken);
  return useQuery({
    queryKey: queryKeys.tenants.comms(id),
    queryFn: async () => {
      const page = await api.tenants.communicationHistory(id, token ?? undefined);
      return page.items;
    },
    enabled: !!token && !!id,
  });
}

export function useTenantDocuments(id: string) {
  const token = useUiStore((s) => s.accessToken);
  return useQuery({
    queryKey: queryKeys.tenants.documents(id),
    queryFn: () => api.tenants.documents(id, token ?? undefined),
    enabled: !!token && !!id,
  });
}

export function useUpdateTenant(id: string) {
  const token = useUiStore((s) => s.accessToken);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api.tenants.update(id, body, token ?? undefined),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.tenants.detail(id) });
      void qc.invalidateQueries({ queryKey: queryKeys.tenants.all });
    },
  });
}

export function useLogTenantCommunication(tenantId: string) {
  const token = useUiStore((s) => s.accessToken);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api.tenants.sendMessage(tenantId, body, token ?? undefined),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.tenants.comms(tenantId) });
    },
  });
}
