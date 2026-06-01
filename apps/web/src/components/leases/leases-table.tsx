'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@web/components/ui/table';
import type { LeaseListItem } from '@web/lib/api/types';
import { LeaseStatusBadge } from './lease-status-badge';

export function LeasesTable({ items }: { items: LeaseListItem[] }) {
  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tenant</TableHead>
            <TableHead className="hidden sm:table-cell">Unit</TableHead>
            <TableHead className="text-right">Rent</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden md:table-cell">Dates</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((l) => (
            <TableRow key={l.id}>
              <TableCell>
                <Link href={`/leases/${l.id}`} className="font-medium hover:underline">
                  {l.tenantLabel ?? '—'}
                </Link>
              </TableCell>
              <TableCell className="hidden sm:table-cell text-muted-foreground font-mono text-xs">
                {l.unitLabel}
              </TableCell>
              <TableCell className="text-right">${l.monthlyRent}</TableCell>
              <TableCell>
                <LeaseStatusBadge status={l.status} />
              </TableCell>
              <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                {format(new Date(l.startDate), 'MMM d, yyyy')}
                {l.endDate ? ` – ${format(new Date(l.endDate), 'MMM d, yyyy')}` : ''}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
