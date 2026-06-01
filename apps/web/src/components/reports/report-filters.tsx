'use client';

import { Label } from '@web/components/ui/label';
import { Input } from '@web/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@web/components/ui/select';
import type { Property } from '@web/lib/api/types';

export function ReportFilters({
  from,
  to,
  propertyId,
  onFromChange,
  onToChange,
  onPropertyChange,
  properties,
  showProperty = true,
}: {
  from: string;
  to: string;
  propertyId: string;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
  onPropertyChange: (v: string) => void;
  properties: Property[];
  showProperty?: boolean;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="space-y-1">
        <Label htmlFor="report-from">From</Label>
        <Input
          id="report-from"
          type="date"
          value={from}
          onChange={(e) => onFromChange(e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="report-to">To</Label>
        <Input
          id="report-to"
          type="date"
          value={to}
          onChange={(e) => onToChange(e.target.value)}
        />
      </div>
      {showProperty && (
        <div className="space-y-1 sm:col-span-2 lg:col-span-1">
          <Label htmlFor="report-property">Property</Label>
          <Select
            value={propertyId || 'all'}
            onValueChange={(v) => onPropertyChange(v === 'all' ? '' : v)}
          >
            <SelectTrigger id="report-property">
              <SelectValue placeholder="All properties" />
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
      )}
    </div>
  );
}
