import type { MaintenanceTicketPriority } from '@web/lib/api/types';
import { PRIORITY_STYLES } from '@web/lib/maintenance-styles';
import { cn } from '@web/lib/utils';

export function PriorityBadge({
  priority,
  className,
}: {
  priority: MaintenanceTicketPriority;
  className?: string;
}) {
  const s = PRIORITY_STYLES[priority];
  return (
    <span
      className={cn(
        'inline-flex rounded-md border px-2 py-0.5 text-xs font-semibold',
        s.className,
        className,
      )}
    >
      {s.label}
    </span>
  );
}
