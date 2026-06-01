'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@web/lib/api/endpoints';
import type { Lease, LeaseDetail, LeaseListItem } from '@web/lib/api/types';
import { queryKeys } from '@web/lib/queries/keys';
import { useUiStore } from '@web/stores/ui-store';

export function useLeasesList(
  filters: Record<string, string | undefined>,
  initialData?: LeaseListItem[],
) {
  const token = useUiStore((s) => s.accessToken);
  return useQuery({
    queryKey: queryKeys.leases.list(filters),
    queryFn: async () => {
      const { items } = await api.leases.list(filters, token ?? undefined);
      const enriched = await Promise.all(
        items.map(async (lease) => {
          try {
            const detail = await api.leases.get(lease.id, token ?? undefined);
            const primary = detail.tenants.find((t) => t.isPrimary) ?? detail.tenants[0];
            return {
              ...lease,
              tenantLabel: primary?.tenantName ?? '—',
              unitLabel: lease.unitId.slice(0, 8),
            } satisfies LeaseListItem;
          } catch {
            return { ...lease, tenantLabel: '—', unitLabel: lease.unitId.slice(0, 8) };
          }
        }),
      );
      return enriched;
    },
    enabled: !!token,
    initialData,
  });
}

export function useLease(id: string, initialData?: LeaseDetail) {
  const token = useUiStore((s) => s.accessToken);
  return useQuery({
    queryKey: queryKeys.leases.detail(id),
    queryFn: () => api.leases.get(id, token ?? undefined),
    enabled: !!token && !!id,
    initialData,
  });
}

export function useLeaseVersions(id: string) {
  const token = useUiStore((s) => s.accessToken);
  return useQuery({
    queryKey: queryKeys.leases.versions(id),
    queryFn: () => api.leases.versions(id, token ?? undefined),
    enabled: !!token && !!id,
  });
}

function useLeaseDetailMutation(
  mutationFn: (id: string, token: string | null) => Promise<Lease>,
) {
  const token = useUiStore((s) => s.accessToken);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; optimistic?: Partial<Lease> }) =>
      mutationFn(vars.id, token),
    onMutate: async ({ id, optimistic }) => {
      await qc.cancelQueries({ queryKey: queryKeys.leases.detail(id) });
      const prev = qc.getQueryData<LeaseDetail>(queryKeys.leases.detail(id));
      if (prev && optimistic) {
        qc.setQueryData(queryKeys.leases.detail(id), { ...prev, ...optimistic });
      }
      return { prev, id };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) {
        qc.setQueryData(queryKeys.leases.detail(ctx.id), ctx.prev);
      }
    },
    onSettled: (_d, _e, { id }) => {
      qc.invalidateQueries({ queryKey: queryKeys.leases.detail(id) });
      qc.invalidateQueries({ queryKey: queryKeys.leases.all });
      qc.invalidateQueries({ queryKey: queryKeys.leases.versions(id) });
    },
  });
}

export function useCreateLease() {
  const token = useUiStore((s) => s.accessToken);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api.leases.create(body, token ?? undefined),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.leases.all });
    },
  });
}

export function useLeaseSend() {
  return useLeaseDetailMutation((id, token) => api.leases.send(id, token ?? undefined));
}

export function useLeaseRecall() {
  return useLeaseDetailMutation((id, token) => api.leases.recall(id, token ?? undefined));
}

export function useLeaseSign() {
  const token = useUiStore((s) => s.accessToken);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: 'tenant' | 'manager' }) =>
      api.leases.sign(id, role, token ?? undefined),
    onSettled: (_d, _e, { id }) => {
      qc.invalidateQueries({ queryKey: queryKeys.leases.detail(id) });
      qc.invalidateQueries({ queryKey: queryKeys.leases.all });
      qc.invalidateQueries({ queryKey: queryKeys.leases.versions(id) });
    },
  });
}

export function useLeaseRenew() {
  return useLeaseDetailMutation((id, token) => api.leases.renew(id, token ?? undefined));
}

export function useLeaseTerminate() {
  const token = useUiStore((s) => s.accessToken);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.leases.terminate(id, reason, token ?? undefined),
    onMutate: async ({ id, reason }) => {
      await qc.cancelQueries({ queryKey: queryKeys.leases.detail(id) });
      const prev = qc.getQueryData<LeaseDetail>(queryKeys.leases.detail(id));
      if (prev) {
        qc.setQueryData(queryKeys.leases.detail(id), {
          ...prev,
          status: 'terminated' as Lease['status'],
          terminationReason: reason,
        });
      }
      return { prev, id };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(queryKeys.leases.detail(ctx.id), ctx.prev);
    },
    onSettled: (_d, _e, { id }) => {
      qc.invalidateQueries({ queryKey: queryKeys.leases.detail(id) });
      qc.invalidateQueries({ queryKey: queryKeys.leases.all });
      qc.invalidateQueries({ queryKey: queryKeys.leases.versions(id) });
    },
  });
}
