'use client';

import { format } from 'date-fns';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@web/components/ui/accordion';
import { Skeleton } from '@web/components/ui/skeleton';
import { EmptyState } from '@web/components/shared/empty-state';
import { LeaseStatusBadge } from '@web/components/leases/lease-status-badge';
import type { LeaseStatus, LeaseVersion } from '@web/lib/api/types';

function versionSummary(snapshot: Record<string, unknown>) {
  const status = typeof snapshot.status === 'string' ? snapshot.status : null;
  const reason =
    typeof snapshot.changeReason === 'string' ? snapshot.changeReason : null;
  return { status: status as LeaseStatus | null, reason };
}

export function LeaseVersionsAccordion({
  versions,
  isLoading,
}: {
  versions?: LeaseVersion[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return <Skeleton className="h-32 w-full" />;
  }

  if (!versions?.length) {
    return (
      <EmptyState
        title="No version history"
        description="Snapshots are recorded on every status change."
      />
    );
  }

  return (
    <Accordion type="single" collapsible className="w-full">
      {[...versions].reverse().map((v) => {
        const { status, reason } = versionSummary(v.snapshot);
        return (
          <AccordionItem key={v.id} value={v.id}>
            <AccordionTrigger className="hover:no-underline">
              <div className="flex flex-wrap items-center gap-2 text-left">
                <span className="font-medium">Version {v.version}</span>
                {status && <LeaseStatusBadge status={status} />}
                <span className="text-xs text-muted-foreground">
                  {format(new Date(v.createdAt), 'MMM d, yyyy h:mm a')}
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-2 text-sm">
              {reason && (
                <p>
                  <span className="text-muted-foreground">Change:</span>{' '}
                  <span className="capitalize">{reason.replace(/_/g, ' ')}</span>
                </p>
              )}
              {status && (
                <p>
                  <span className="text-muted-foreground">Status:</span> {status}
                </p>
              )}
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
