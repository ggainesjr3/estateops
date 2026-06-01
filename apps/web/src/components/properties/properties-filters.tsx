'use client';

import { Input } from '@web/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@web/components/ui/select';

const PROPERTY_TYPES = ['residential', 'commercial', 'mixed_use'] as const;
const PROPERTY_STATUSES = ['active', 'inactive', 'sold'] as const;

export interface PropertyFilters {
  type?: string;
  status?: string;
  city?: string;
}

interface PropertiesFiltersProps {
  filters: PropertyFilters;
  onChange: (filters: PropertyFilters) => void;
}

export function PropertiesFilters({ filters, onChange }: PropertiesFiltersProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Select
        value={filters.type ?? 'all'}
        onValueChange={(v) =>
          onChange({ ...filters, type: v === 'all' ? undefined : v })
        }
      >
        <SelectTrigger>
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All types</SelectItem>
          {PROPERTY_TYPES.map((t) => (
            <SelectItem key={t} value={t}>
              {t.replace('_', ' ')}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={filters.status ?? 'all'}
        onValueChange={(v) =>
          onChange({ ...filters, status: v === 'all' ? undefined : v })
        }
      >
        <SelectTrigger>
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          {PROPERTY_STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        placeholder="Filter by city"
        value={filters.city ?? ''}
        onChange={(e) =>
          onChange({ ...filters, city: e.target.value || undefined })
        }
      />
    </div>
  );
}
