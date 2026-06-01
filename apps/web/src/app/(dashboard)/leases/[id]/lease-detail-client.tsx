'use client';

import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@web/components/ui/card';
import { LeaseActions } from '@web/components/leases/lease-actions';
import { LeaseStatusBadge } from '@web/components/leases/lease-status-badge';
import { LeaseVersionsAccordion } from '@web/components/leases/lease-versions-accordion';
import type { LeaseDetail, LeaseVersion } from '@web/lib/api/types';
import { useLease, useLeaseVersions } from '@web/lib/queries/use-leases';

export function LeaseDetailClient({
  lease: initialLease,
  initialVersions,
  propertyName,
  unitLabel,
}: {
  lease: LeaseDetail;
  initialVersions: LeaseVersion[];
  propertyName: string;
  unitLabel: string;
}) {
  const { data: lease = initialLease } = useLease(initialLease.id, initialLease);
  const { data: versions, isLoading } = useLeaseVersions(initialLease.id);

  const primary = lease.tenants.find((t) => t.isPrimary) ?? lease.tenants[0];
  const tenantName = primary?.tenantName ?? '—';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <CardTitle className="text-base">Lease summary</CardTitle>
          <LeaseStatusBadge status={lease.status} />
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 text-sm">
          <div>
            <p className="text-muted-foreground">Property</p>
            <p className="font-medium">{propertyName}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Unit</p>
            <p className="font-medium">{unitLabel}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Tenant</p>
            <p className="font-medium">{tenantName}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Monthly rent</p>
            <p className="text-lg font-semibold">${lease.monthlyRent}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Term</p>
            <p className="font-medium">
              {format(new Date(lease.startDate), 'MMM d, yyyy')}
              {lease.endDate
                ? ` – ${format(new Date(lease.endDate), 'MMM d, yyyy')}`
                : ' – ongoing'}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Security deposit</p>
            <p>{lease.securityDeposit ? `$${lease.securityDeposit}` : '—'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Late fee</p>
            <p>
              ${lease.lateFeeAmount ?? '0'} · {lease.lateFeeGraceDays} day grace
            </p>
          </div>
          {lease.terminationReason && (
            <div className="sm:col-span-2">
              <p className="text-muted-foreground">Termination reason</p>
              <p>{lease.terminationReason}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <LeaseActions lease={lease} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Version history</CardTitle>
        </CardHeader>
        <CardContent>
          <LeaseVersionsAccordion
            versions={versions ?? initialVersions}
            isLoading={isLoading && !initialVersions.length}
          />
        </CardContent>
      </Card>
    </div>
  );
}
