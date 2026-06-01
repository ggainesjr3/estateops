'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@web/lib/api/endpoints';
import { queryKeys } from './keys';

export function useAdminStats(initial?: Awaited<ReturnType<typeof api.admin.stats>>) {
  return useQuery({
    queryKey: queryKeys.admin.stats(),
    queryFn: () => api.admin.stats(),
    initialData: initial,
  });
}

export function useAdminUsers(initial?: Awaited<ReturnType<typeof api.admin.users>>) {
  return useQuery({
    queryKey: queryKeys.admin.users(),
    queryFn: () => api.admin.users(),
    initialData: initial,
  });
}

export function useAdminSystemHealth(
  initial?: Awaited<ReturnType<typeof api.admin.systemHealth>>,
) {
  return useQuery({
    queryKey: queryKeys.admin.systemHealth(),
    queryFn: () => api.admin.systemHealth(),
    initialData: initial,
    refetchInterval: 30_000,
  });
}

export function useAdminQueues(initial?: Awaited<ReturnType<typeof api.admin.queues>>) {
  return useQuery({
    queryKey: queryKeys.admin.queues(),
    queryFn: () => api.admin.queues(),
    initialData: initial,
    refetchInterval: 30_000,
  });
}

export function useAdminAuditLogs(
  filters: Record<string, string | undefined>,
  initial?: Awaited<ReturnType<typeof api.admin.auditLogs>>,
) {
  return useQuery({
    queryKey: queryKeys.admin.auditLogs(filters),
    queryFn: () => api.admin.auditLogs(filters),
    initialData: initial,
  });
}

export function useUpdateUserRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      api.admin.updateUserRole(userId, role),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.admin.users() });
      void qc.invalidateQueries({ queryKey: queryKeys.admin.all });
    },
  });
}

export function useDeactivateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => api.admin.deactivateUser(userId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.admin.users() });
    },
  });
}
