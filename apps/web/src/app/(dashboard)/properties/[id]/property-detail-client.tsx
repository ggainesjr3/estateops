'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@web/components/ui/card';
import { PropertyDetailTabs } from '@web/components/properties/property-detail-tabs';
import type { PropertyDetail, Unit } from '@web/lib/api/types';

export function PropertyDetailView({
  property,
  initialUnits,
}: {
  property: PropertyDetail;
  initialUnits: Unit[];
}) {
  const { summary } = property;
  const occupied = summary.unitsCount - summary.vacantUnits;
  const occupancy =
    summary.unitsCount > 0
      ? Math.round((occupied / summary.unitsCount) * 100)
      : 0;

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Units
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{summary.unitsCount}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Vacant
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{summary.vacantUnits}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Occupancy
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{occupancy}%</CardContent>
        </Card>
      </div>

      <PropertyDetailTabs property={property} initialUnits={initialUnits} />
    </>
  );
}
