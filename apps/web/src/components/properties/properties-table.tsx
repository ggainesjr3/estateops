'use client';

import Link from 'next/link';
import { Badge } from '@web/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@web/components/ui/table';
import type { PropertyListItem } from '@web/lib/api/types';
import { propertyStatusStyles } from '@web/lib/status-styles';

type PropertyStatus = 'active' | 'inactive' | 'sold';

interface PropertiesTableProps {
  items: PropertyListItem[];
}

export function PropertiesTable({ items }: PropertiesTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead className="hidden sm:table-cell">Type</TableHead>
            <TableHead>City</TableHead>
            <TableHead className="text-right hidden md:table-cell">Units</TableHead>
            <TableHead className="text-right">Occupancy</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((p) => (
            <TableRow key={p.id}>
              <TableCell>
                <Link
                  href={`/properties/${p.id}`}
                  className="font-medium hover:underline"
                >
                  {p.name}
                </Link>
              </TableCell>
              <TableCell className="hidden sm:table-cell capitalize text-muted-foreground">
                {p.type.replace('_', ' ')}
              </TableCell>
              <TableCell>{p.city}</TableCell>
              <TableCell className="text-right hidden md:table-cell">
                {p.unitsCount ?? '—'}
              </TableCell>
              <TableCell className="text-right">
                {p.occupancyPercent != null ? `${p.occupancyPercent}%` : '—'}
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={propertyStatusStyles[p.status as PropertyStatus]}
                >
                  {p.status}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
