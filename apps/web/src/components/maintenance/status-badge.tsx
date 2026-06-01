import type { MaintenanceTicketStatus } from '@web/lib/api/types';
import { STATUS_LABELS } from '@web/lib/maintenance-state-machine';
import { STATUS_STYLES } from '@web/lib/maintenance-styles';
import { cn } from '@web/lib/utils';

export function StatusBadge({
  status,
  className,
}: {
  status: MaintenanceTicketStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex rounded-md px-2 py-0.5 text-xs font-medium',
        STATUS_STYLES[status],
        className,
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
