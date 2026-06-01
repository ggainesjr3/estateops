'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@web/lib/api/endpoints';
import type { PropertyDetail, PropertyListItem, Unit } from '@web/lib/api/types';
import { queryKeys } from '@web/lib/queries/keys';
import { useUiStore } from '@web/stores/ui-store';

export function usePropertiesList(
  filters: Record<string, string | undefined>,
  initialData?: PropertyListItem[],
) {
  const token = useUiStore((s) => s.accessToken);
  return useQuery({
    queryKey: queryKeys.properties.list(filters),
    queryFn: async () => {
      const page = await api.properties.list(filters, token ?? undefined);
      const enriched = await Promise.all(
        page.items.map(async (p) => {
          try {
            const detail = await api.properties.get(p.id, token ?? undefined);
            const { unitsCount, vacantUnits } = detail.summary;
            const occupancyPercent =
              unitsCount > 0
                ? Math.round(((unitsCount - vacantUnits) / unitsCount) * 100)
                : 0;
            return { ...p, unitsCount, occupancyPercent } as PropertyListItem;
          } catch {
            return { ...p, unitsCount: 0, occupancyPercent: 0 };
          }
        }),
      );
      return enriched;
    },
    enabled: !!token,
    initialData,
  });
}

export function useProperty(id: string, initialData?: PropertyDetail) {
  const token = useUiStore((s) => s.accessToken);
  return useQuery({
    queryKey: queryKeys.properties.detail(id),
    queryFn: () => api.properties.get(id, token ?? undefined),
    enabled: !!token && !!id,
    initialData,
  });
}

export function usePropertyUnits(propertyId: string, initialData?: Unit[]) {
  const token = useUiStore((s) => s.accessToken);
  return useQuery({
    queryKey: queryKeys.properties.units(propertyId),
    queryFn: async () => {
      const page = await api.properties.units(propertyId, token ?? undefined);
      return page.items;
    },
    enabled: !!token && !!propertyId,
    initialData,
  });
}

export function useCreateProperty() {
  const token = useUiStore((s) => s.accessToken);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api.properties.create(body, token ?? undefined),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.properties.all });
    },
  });
}
