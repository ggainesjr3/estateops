type TenantRecordStatus = 'prospect' | 'active' | 'past' | 'blacklisted';
type LeaseStatus =
  | 'draft'
  | 'pending'
  | 'active'
  | 'expired'
  | 'renewed'
  | 'terminated';
type UnitStatus = 'vacant' | 'occupied' | 'maintenance' | 'off_market';
type PropertyStatus = 'active' | 'inactive' | 'sold';

export const tenantStatusStyles: Record<
  TenantRecordStatus,
  { label: string; className: string }
> = {
  active: {
    label: 'Active',
    className: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  },
  prospect: {
    label: 'Prospect',
    className: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  past: {
    label: 'Past',
    className: 'bg-slate-100 text-slate-700 border-slate-200',
  },
  blacklisted: {
    label: 'Blacklisted',
    className: 'bg-red-100 text-red-800 border-red-200',
  },
};

export const leaseStatusStyles: Record<
  LeaseStatus,
  { label: string; className: string }
> = {
  draft: {
    label: 'Draft',
    className: 'bg-slate-100 text-slate-700 border-slate-200',
  },
  pending: {
    label: 'Pending',
    className: 'bg-amber-100 text-amber-900 border-amber-200',
  },
  active: {
    label: 'Active',
    className: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  },
  expired: {
    label: 'Expired',
    className: 'bg-slate-100 text-slate-600 border-slate-200',
  },
  renewed: {
    label: 'Renewed',
    className: 'bg-violet-100 text-violet-800 border-violet-200',
  },
  terminated: {
    label: 'Terminated',
    className: 'bg-red-100 text-red-800 border-red-200',
  },
};

export const unitStatusStyles: Record<
  UnitStatus,
  { label: string; cardClass: string; dotClass: string }
> = {
  occupied: {
    label: 'Occupied',
    cardClass: 'border-emerald-200 bg-emerald-50/50',
    dotClass: 'bg-emerald-500',
  },
  vacant: {
    label: 'Vacant',
    cardClass: 'border-slate-200 bg-slate-50',
    dotClass: 'bg-slate-400',
  },
  maintenance: {
    label: 'Maintenance',
    cardClass: 'border-amber-200 bg-amber-50/50',
    dotClass: 'bg-amber-500',
  },
  off_market: {
    label: 'Off market',
    cardClass: 'border-slate-200 bg-muted/30',
    dotClass: 'bg-slate-300',
  },
};

export const propertyStatusStyles: Record<PropertyStatus, string> = {
  active: 'bg-emerald-100 text-emerald-800',
  inactive: 'bg-slate-100 text-slate-700',
  sold: 'bg-violet-100 text-violet-800',
};
