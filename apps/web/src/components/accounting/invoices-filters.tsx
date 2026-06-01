'use client';

import { Input } from '@web/components/ui/input';
import { Label } from '@web/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@web/components/ui/select';
import { invoiceStatusStyles, invoiceTypeLabels } from '@web/lib/invoice-status-styles';
import type { PropertyListItem } from '@web/lib/api/types';

const INVOICE_STATUSES = [
  'draft',
  'sent',
  'partial',
  'paid',
  'void',
  'overdue',
] as const;
const INVOICE_TYPES = [
  'rent',
  'late_fee',
  'security_deposit',
  'maintenance',
  'other',
] as const;

export interface InvoiceFilters {
  status?: string;
  type?: string;
  propertyId?: string;
  dueFrom?: string;
  dueTo?: string;
}

export function InvoicesFilters({
  filters,
  onChange,
  properties,
}: {
  filters: InvoiceFilters;
  onChange: (f: InvoiceFilters) => void;
  properties: PropertyListItem[];
}) {
  return (
    <div className="flex flex-wrap gap-4 items-end">
      <div className="space-y-1">
        <Label className="text-xs">Status</Label>
        <Select
          value={filters.status ?? 'all'}
          onValueChange={(v) =>
            onChange({ ...filters, status: v === 'all' ? undefined : v })
          }
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {INVOICE_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {invoiceStatusStyles[s].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Type</Label>
        <Select
          value={filters.type ?? 'all'}
          onValueChange={(v) => onChange({ ...filters, type: v === 'all' ? undefined : v })}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {INVOICE_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {invoiceTypeLabels[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Property</Label>
        <Select
          value={filters.propertyId ?? 'all'}
          onValueChange={(v) =>
            onChange({ ...filters, propertyId: v === 'all' ? undefined : v })
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All properties</SelectItem>
            {properties.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Due from</Label>
        <Input
          type="date"
          className="w-[150px]"
          value={filters.dueFrom ?? ''}
          onChange={(e) => onChange({ ...filters, dueFrom: e.target.value || undefined })}
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Due to</Label>
        <Input
          type="date"
          className="w-[150px]"
          value={filters.dueTo ?? ''}
          onChange={(e) => onChange({ ...filters, dueTo: e.target.value || undefined })}
        />
      </div>
    </div>
  );
}
