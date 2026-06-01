type InvoiceStatus = 'draft' | 'sent' | 'partial' | 'paid' | 'void' | 'overdue';
type InvoiceType =
  | 'rent'
  | 'late_fee'
  | 'security_deposit'
  | 'maintenance'
  | 'other';

export const invoiceStatusStyles: Record<
  InvoiceStatus,
  { label: string; className: string }
> = {
  paid: {
    label: 'Paid',
    className: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  },
  overdue: {
    label: 'Overdue',
    className: 'bg-red-100 text-red-800 border-red-200',
  },
  partial: {
    label: 'Partial',
    className: 'bg-amber-100 text-amber-900 border-amber-200',
  },
  sent: {
    label: 'Sent',
    className: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  draft: {
    label: 'Draft',
    className: 'bg-slate-100 text-slate-700 border-slate-200',
  },
  void: {
    label: 'Void',
    className: 'bg-slate-100 text-slate-500 border-slate-200',
  },
};

export const invoiceTypeLabels: Record<InvoiceType, string> = {
  rent: 'Rent',
  late_fee: 'Late fee',
  security_deposit: 'Security deposit',
  maintenance: 'Maintenance',
  other: 'Other',
};
