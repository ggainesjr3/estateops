'use client';

import { Clock } from 'lucide-react';
import type { MaintenanceTicketStatus } from '@web/lib/api/types';
import { useSlaCountdown } from '@web/lib/hooks/use-sla-countdown';
import { SLA_TONE_CLASS, slaTone } from '@web/lib/maintenance-styles';
import { cn } from '@web/lib/utils';

export function SlaIndicator({
  slaDueAt,
  status,
  compact,
}: {
  slaDueAt: string | null;
  status: MaintenanceTicketStatus;
  compact?: boolean;
}) {
  const label = useSlaCountdown(slaDueAt);
  const tone = slaTone(slaDueAt, status);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs font-medium',
        SLA_TONE_CLASS[tone],
        compact && 'text-[10px]',
      )}
    >
      <Clock className={cn('h-3 w-3', compact && 'h-2.5 w-2.5')} />
      {label}
    </span>
  );
}
