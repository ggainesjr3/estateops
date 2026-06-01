import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { serverApi } from '@web/lib/api/endpoints-server';
import { PropertyDetailView } from './property-detail-client';
import { Badge } from '@web/components/ui/badge';
import { propertyStatusStyles } from '@web/lib/status-styles';

type PropertyStatus = 'active' | 'inactive' | 'sold';

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  try {
    const property = await serverApi.properties.get(id);
    const unitsPage = await serverApi.properties.units(id);

    return (
      <div className="space-y-6">
        <Link
          href="/properties"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Properties
        </Link>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {property.name}
            </h1>
            <p className="mt-1 text-muted-foreground">
              {property.addressLine1}, {property.city}, {property.state}{' '}
              {property.postalCode}
            </p>
          </div>
          <Badge
            variant="outline"
            className={propertyStatusStyles[property.status as PropertyStatus]}
          >
            {property.status}
          </Badge>
        </div>

        <PropertyDetailView
          property={property}
          initialUnits={unitsPage.items}
        />
      </div>
    );
  } catch {
    notFound();
  }
}
