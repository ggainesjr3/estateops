'use client';

import { Fragment, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { AdminNav } from '@web/components/admin/admin-nav';
import { PageHeader } from '@web/components/shared/page-header';
import { Button } from '@web/components/ui/button';
import { Input } from '@web/components/ui/input';
import { Label } from '@web/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@web/components/ui/table';
import type { AdminAuditLogEntry, CursorPage } from '@web/lib/api/types';
import { useAdminAuditLogs } from '@web/lib/queries/use-admin';

function JsonBlock({ value }: { value: Record<string, unknown> | null }) {
  if (!value || !Object.keys(value).length) {
    return <span className="text-muted-foreground">—</span>;
  }
  return (
    <pre className="max-h-40 overflow-auto rounded bg-muted p-2 text-xs">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

export function AdminAuditLogsClient({
  initialData,
  serverError,
}: {
  initialData: CursorPage<AdminAuditLogEntry> | null;
  serverError: string | null;
}) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [action, setAction] = useState('');
  const [userId, setUserId] = useState('');
  const [cursor, setCursor] = useState<string | undefined>();
  const [expanded, setExpanded] = useState<string | null>(null);

  const filters = useMemo(
    () => ({
      from: from || undefined,
      to: to || undefined,
      action: action || undefined,
      userId: userId || undefined,
      limit: '20',
      cursor,
    }),
    [from, to, action, userId, cursor],
  );

  const { data, isLoading, error, isFetching } = useAdminAuditLogs(
    filters,
    cursor ? undefined : (initialData ?? undefined),
  );

  const items = data?.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="Audit logs" description="Full activity history for your organization." />
      <AdminNav />

      {(error || serverError) && (
        <p className="text-sm text-destructive">{error?.message ?? serverError}</p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1">
          <Label htmlFor="from">From</Label>
          <Input id="from" type="date" value={from} onChange={(e) => { setFrom(e.target.value); setCursor(undefined); }} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="to">To</Label>
          <Input id="to" type="date" value={to} onChange={(e) => { setTo(e.target.value); setCursor(undefined); }} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="action">Action</Label>
          <Input id="action" value={action} onChange={(e) => { setAction(e.target.value); setCursor(undefined); }} placeholder="e.g. user.role_updated" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="userId">User ID</Label>
          <Input id="userId" value={userId} onChange={(e) => { setUserId(e.target.value); setCursor(undefined); }} placeholder="UUID" />
        </div>
      </div>

      {isFetching && items.length > 0 && (
        <p className="text-xs text-muted-foreground">Refreshing…</p>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead>Timestamp</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entity</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && !items.length ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            ) : (
              items.map((entry) => {
                const isOpen = expanded === entry.id;
                return (
                  <Fragment key={entry.id}>
                    <TableRow>
                      <TableCell>
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-foreground"
                          onClick={() => setExpanded(isOpen ? null : entry.id)}
                          aria-label={isOpen ? 'Collapse' : 'Expand'}
                        >
                          {isOpen ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </button>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {format(new Date(entry.createdAt), 'MMM d, yyyy h:mm a')}
                      </TableCell>
                      <TableCell>{entry.userName ?? entry.userEmail ?? 'System'}</TableCell>
                      <TableCell>{entry.action}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {entry.entityType} · {entry.entityId}
                      </TableCell>
                    </TableRow>
                    {isOpen && (
                      <TableRow>
                        <TableCell colSpan={5} className="bg-muted/30">
                          <div className="grid gap-4 md:grid-cols-2">
                            <div>
                              <p className="mb-1 text-xs font-medium text-muted-foreground">Old value</p>
                              <JsonBlock value={entry.oldValue} />
                            </div>
                            <div>
                              <p className="mb-1 text-xs font-medium text-muted-foreground">New value</p>
                              <JsonBlock value={entry.newValue} />
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })
            )}
            {!isLoading && !items.length && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No audit log entries match your filters
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-end gap-2">
        {cursor && (
          <Button variant="outline" size="sm" onClick={() => setCursor(undefined)}>
            First page
          </Button>
        )}
        {data?.nextCursor && (
          <Button variant="outline" size="sm" onClick={() => setCursor(data.nextCursor ?? undefined)}>
            Next page
          </Button>
        )}
      </div>
    </div>
  );
}
