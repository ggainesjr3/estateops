'use client';

import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@web/components/ui/tabs';
import { UnitsGrid } from '@web/components/properties/units-grid';
import { usePropertyUnits } from '@web/lib/queries/use-properties';
import { useLeasesList } from '@web/lib/queries/use-leases';
import { useTenantsList } from '@web/lib/queries/use-tenants';
import type { PropertyDetail, Unit } from '@web/lib/api/types';
import { EmptyState } from '@web/components/shared/empty-state';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@web/components/ui/table';
import { LeaseStatusBadge } from '@web/components/leases/lease-status-badge';
import { TenantStatusBadge } from '@web/components/tenants/tenant-status-badge';
import { format } from 'date-fns';

export function PropertyDetailTabs({
  property,
  initialUnits,
}: {
  property: PropertyDetail;
  initialUnits?: Unit[];
}) {
  const { data: units, isLoading: unitsLoading } = usePropertyUnits(
    property.id,
    initialUnits,
  );
  const { data: leases } = useLeasesList({ propertyId: property.id });
  const { data: tenants } = useTenantsList({});

  const propertyTenants =
    tenants?.filter((t) =>
      t.activeUnitLabel?.toLowerCase().includes(property.name.toLowerCase()),
    ) ?? [];

  return (
    <Tabs defaultValue="units" className="w-full">
      <TabsList>
        <TabsTrigger value="units">Units</TabsTrigger>
        <TabsTrigger value="tenants">Tenants</TabsTrigger>
        <TabsTrigger value="leases">Leases</TabsTrigger>
        <TabsTrigger value="financials">Financials</TabsTrigger>
        <TabsTrigger value="documents">Documents</TabsTrigger>
      </TabsList>

      <TabsContent value="units">
        <UnitsGrid units={units} isLoading={unitsLoading} />
      </TabsContent>

      <TabsContent value="tenants">
        {propertyTenants.length === 0 ? (
          <EmptyState
            title="No linked tenants"
            description="Tenants with active leases at this property appear here."
            actionLabel="View all tenants"
            href="/tenants"
          />
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Unit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {propertyTenants.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>
                      <Link href={`/tenants/${t.id}`} className="font-medium hover:underline">
                        {t.firstName} {t.lastName}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <TenantStatusBadge status={t.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {t.activeUnitLabel ?? '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </TabsContent>

      <TabsContent value="leases">
        {!leases?.length ? (
          <EmptyState
            title="No leases"
            description="Leases for this property will show here."
            actionLabel="View leases"
            href="/leases"
          />
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Rent</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Dates</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leases.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell>
                      <Link href={`/leases/${l.id}`} className="hover:underline">
                        {l.tenantLabel}
                      </Link>
                    </TableCell>
                    <TableCell>${l.monthlyRent}</TableCell>
                    <TableCell>
                      <LeaseStatusBadge status={l.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(l.startDate), 'MMM d, yyyy')}
                      {l.endDate
                        ? ` – ${format(new Date(l.endDate), 'MMM d, yyyy')}`
                        : ''}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </TabsContent>

      <TabsContent value="financials">
        <EmptyState
          title="Financials coming soon"
          description="Rent rolls, expenses, and NOI will be available in a future release."
        />
      </TabsContent>

      <TabsContent value="documents">
        <EmptyState
          title="No documents"
          description="Upload leases, inspections, and insurance documents here."
          actionLabel="Upload document"
          onAction={() => undefined}
        />
      </TabsContent>
    </Tabs>
  );
}
