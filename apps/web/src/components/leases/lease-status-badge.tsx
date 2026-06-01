import { Badge } from '@web/components/ui/badge';
import { leaseStatusStyles } from '@web/lib/status-styles';

type LeaseStatus =
  | 'draft'
  | 'pending'
  | 'active'
  | 'expired'
  | 'renewed'
  | 'terminated';

export function LeaseStatusBadge({ status }: { status: LeaseStatus }) {
  const style = leaseStatusStyles[status];
  return (
    <Badge variant="outline" className={style.className}>
      {style.label}
    </Badge>
  );
}
