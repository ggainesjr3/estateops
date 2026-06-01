import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { serverApi } from '@web/lib/api/endpoints-server';
import { LeaseDetailClient } from './lease-detail-client';
import { LeaseStatusBadge } from '@web/components/leases/lease-status-badge';

export default async function LeaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  try {
    const lease = await serverApi.leases.get(id);
    const [versions, property, units] = await Promise.all([
      serverApi.leases.versions(id),
      serverApi.properties.get(lease.propertyId),
      serverApi.properties.units(lease.propertyId),
    ]);
    const unit = units.items.find((u) => u.id === lease.unitId);
    const primary = lease.tenants.find((t) => t.isPrimary) ?? lease.tenants[0];

    return (
      <div className="space-y-6">
        <Link
          href="/leases"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Leases
        </Link>

        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {primary?.tenantName ?? 'Lease'}
          </h1>
          <LeaseStatusBadge status={lease.status} />
        </div>

        <LeaseDetailClient
          lease={lease}
          initialVersions={versions}
          propertyName={property.name}
          unitLabel={unit ? `Unit ${unit.unitNumber}` : lease.unitId.slice(0, 8)}
        />
      </div>
    );
  } catch {
    notFound();
  }
}
