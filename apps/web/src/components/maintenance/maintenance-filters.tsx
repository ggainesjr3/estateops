'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@web/components/ui/select';
import type { PropertyListItem } from '@web/lib/api/types';
import { STATUS_LABELS } from '@web/lib/maintenance-state-machine';

const MAINTENANCE_STATUSES = [
  'created',
  'triaged',
  'assigned',
  'dispatched',
  'in_progress',
  'completed',
  'invoiced',
  'closed',
] as const;
const MAINTENANCE_PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;
const MAINTENANCE_TRADES = [
  'plumbing',
  'electrical',
  'hvac',
  'appliance',
  'structural',
  'cleaning',
  'landscaping',
  'general',
  'pest_control',
] as const;

export function MaintenanceFilters({
  status,
  priority,
  trade,
  propertyId,
  onStatus,
  onPriority,
  onTrade,
  onProperty,
  properties,
}: {
  status?: string;
  priority?: string;
  trade?: string;
  propertyId?: string;
  onStatus: (v?: string) => void;
  onPriority: (v?: string) => void;
  onTrade: (v?: string) => void;
  onProperty: (v?: string) => void;
  properties: PropertyListItem[];
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Select value={status ?? 'all'} onValueChange={(v) => onStatus(v === 'all' ? undefined : v)}>
        <SelectTrigger>
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          {MAINTENANCE_STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {STATUS_LABELS[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={priority ?? 'all'}
        onValueChange={(v) => onPriority(v === 'all' ? undefined : v)}
      >
        <SelectTrigger>
          <SelectValue placeholder="Priority" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All priorities</SelectItem>
          {MAINTENANCE_PRIORITIES.map((p) => (
            <SelectItem key={p} value={p}>
              {p}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={trade ?? 'all'} onValueChange={(v) => onTrade(v === 'all' ? undefined : v)}>
        <SelectTrigger>
          <SelectValue placeholder="Trade" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All trades</SelectItem>
          {MAINTENANCE_TRADES.map((t) => (
            <SelectItem key={t} value={t}>
              {t.replace('_', ' ')}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={propertyId ?? 'all'}
        onValueChange={(v) => onProperty(v === 'all' ? undefined : v)}
      >
        <SelectTrigger>
          <SelectValue placeholder="Property" />
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
  );
}
