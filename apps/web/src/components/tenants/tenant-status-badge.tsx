import { Badge } from '@web/components/ui/badge';
import { tenantStatusStyles } from '@web/lib/status-styles';

type TenantRecordStatus = 'prospect' | 'active' | 'past' | 'blacklisted';

export function TenantStatusBadge({ status }: { status: TenantRecordStatus }) {
  const style = tenantStatusStyles[status];
  return (
    <Badge variant="outline" className={style.className}>
      {style.label}
    </Badge>
  );
}
