'use client';

import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@web/components/ui/table';
import type { TenantListItem } from '@web/lib/api/types';
import { TenantStatusBadge } from './tenant-status-badge';

export function TenantsTable({ items }: { items: TenantListItem[] }) {
  const router = useRouter();

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead className="hidden md:table-cell">Email</TableHead>
            <TableHead className="hidden sm:table-cell">Phone</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden lg:table-cell">Active unit</TableHead>
            <TableHead className="hidden lg:table-cell">Lease end</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((t) => (
            <TableRow
              key={t.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => router.push(`/tenants/${t.id}`)}
            >
              <TableCell className="font-medium">
                {t.firstName} {t.lastName}
              </TableCell>
              <TableCell className="hidden md:table-cell text-muted-foreground">
                {t.email}
              </TableCell>
              <TableCell className="hidden sm:table-cell">{t.phone ?? '—'}</TableCell>
              <TableCell>
                <TenantStatusBadge status={t.status} />
              </TableCell>
              <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">
                {t.activeUnitLabel ?? '—'}
              </TableCell>
              <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">
                {t.leaseEndDate
                  ? format(new Date(t.leaseEndDate), 'MMM d, yyyy')
                  : '—'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
