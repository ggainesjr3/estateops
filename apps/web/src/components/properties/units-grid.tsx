'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@web/components/ui/card';
import { Skeleton } from '@web/components/ui/skeleton';
import { EmptyState } from '@web/components/shared/empty-state';
import type { Unit } from '@web/lib/api/types';
import { unitStatusStyles } from '@web/lib/status-styles';
import { cn } from '@web/lib/utils';

type UnitStatus = 'vacant' | 'occupied' | 'maintenance' | 'off_market';

interface UnitsGridProps {
  units?: Unit[];
  isLoading: boolean;
}

export function UnitsGrid({ units, isLoading }: UnitsGridProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  if (!units?.length) {
    return (
      <EmptyState
        title="No units yet"
        description="Add units to this property from the API or property setup flow."
        actionLabel="Back to properties"
        href="/properties"
      />
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {units.map((unit) => {
        const style = unitStatusStyles[unit.status as UnitStatus];
        return (
          <Card key={unit.id} className={cn('border-2', style.cardClass)}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Unit {unit.unitNumber}</CardTitle>
                <span className={cn('h-2.5 w-2.5 rounded-full', style.dotClass)} />
              </div>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-1">
              <p className="capitalize">{style.label}</p>
              <p className="capitalize">{unit.type.replace('_', ' ')}</p>
              {unit.monthlyRent != null && (
                <p className="font-medium text-foreground">
                  ${unit.monthlyRent.toLocaleString()}/mo
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
