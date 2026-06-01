import type { InvoiceStatus } from '@web/lib/api/types';

export function isInvoicePayable(status: InvoiceStatus): boolean {
  return status !== 'paid' && status !== 'void';
}
