'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@web/lib/api/endpoints';
import { queryKeys } from './keys';

export function useOccupancyReport(
  filters: Record<string, string | undefined>,
  initial?: Awaited<ReturnType<typeof api.reports.occupancy>>,
) {
  return useQuery({
    queryKey: queryKeys.reports.occupancy(filters),
    queryFn: () => api.reports.occupancy(filters),
    initialData: initial,
  });
}

export function useRevenueReport(
  filters: Record<string, string | undefined>,
  initial?: Awaited<ReturnType<typeof api.reports.revenue>>,
) {
  return useQuery({
    queryKey: queryKeys.reports.revenue(filters),
    queryFn: () => api.reports.revenue(filters),
    initialData: initial,
  });
}

export function useMaintenanceReport(
  filters: Record<string, string | undefined>,
  initial?: Awaited<ReturnType<typeof api.reports.maintenance>>,
) {
  return useQuery({
    queryKey: queryKeys.reports.maintenance(filters),
    queryFn: () => api.reports.maintenance(filters),
    initialData: initial,
  });
}

export function useRentRollReport(
  asOf: string | undefined,
  initial?: Awaited<ReturnType<typeof api.reports.rentRoll>>,
) {
  return useQuery({
    queryKey: queryKeys.reports.rentRoll(asOf),
    queryFn: () => api.reports.rentRoll(asOf),
    initialData: initial,
  });
}

export function useDelinquencyReport(
  initial?: Awaited<ReturnType<typeof api.reports.delinquency>>,
) {
  return useQuery({
    queryKey: queryKeys.reports.delinquency(),
    queryFn: () => api.reports.delinquency(),
    initialData: initial,
  });
}
