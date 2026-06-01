import { Badge } from '@web/components/ui/badge';
import { invoiceStatusStyles } from '@web/lib/invoice-status-styles';

type InvoiceStatus = 'draft' | 'sent' | 'partial' | 'paid' | 'void' | 'overdue';

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  const style = invoiceStatusStyles[status];
  return (
    <Badge variant="outline" className={style.className}>
      {style.label}
    </Badge>
  );
}
