'use client';

import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Download } from 'lucide-react';
import { PageHeader } from '@web/components/shared/page-header';
import { TableSkeleton } from '@web/components/shared/table-skeleton';
import { Button } from '@web/components/ui/button';
import { Input } from '@web/components/ui/input';
import { Label } from '@web/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@web/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@web/components/ui/table';
import { api } from '@web/lib/api/endpoints';
import { downloadAuthenticatedCsv } from '@web/lib/api/download-csv';
import type { LedgerAccountOption } from '@web/lib/api/types';
import { formatUsd } from '@web/lib/format-currency';
import { useGeneralLedger } from '@web/lib/queries/use-accounting';

export function LedgerPageClient({
  accounts,
  serverError,
}: {
  accounts: LedgerAccountOption[];
  serverError: string | null;
}) {
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [cursor, setCursor] = useState<string | undefined>();

  const params = useMemo(
    () => ({
      accountId,
      from: from || undefined,
      to: to || undefined,
      limit: '50',
      cursor,
    }),
    [accountId, from, to, cursor],
  );

  const { data, isLoading, isFetching, error } = useGeneralLedger(
    params,
    Boolean(accountId),
  );

  const items = data?.items ?? [];

  async function exportCsv() {
    if (!accountId) return;
    const path = api.accounting.exportGeneralLedger({
      accountId,
      from: from || undefined,
      to: to || undefined,
    });
    await downloadAuthenticatedCsv(path, 'general-ledger.csv');
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="General ledger"
        description="Account activity with running balance."
        actions={
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={!accountId}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        }
      />

      <div className="flex flex-wrap gap-4 items-end">
        <div className="space-y-1">
          <Label>Account</Label>
          <Select value={accountId} onValueChange={(v) => { setAccountId(v); setCursor(undefined); }}>
            <SelectTrigger className="w-[280px]">
              <SelectValue placeholder="Select account" />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.code} — {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>From</Label>
          <Input type="date" className="w-[150px]" value={from} onChange={(e) => { setFrom(e.target.value); setCursor(undefined); }} />
        </div>
        <div className="space-y-1">
          <Label>To</Label>
          <Input type="date" className="w-[150px]" value={to} onChange={(e) => { setTo(e.target.value); setCursor(undefined); }} />
        </div>
      </div>

      {(error || serverError) && (
        <p className="text-sm text-destructive">{error?.message ?? serverError}</p>
      )}

      {isLoading && !items.length ? (
        <TableSkeleton cols={5} />
      ) : (
        <>
          {isFetching && <p className="text-xs text-muted-foreground">Loading…</p>}
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Posted</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((line) => (
                  <TableRow key={line.entryId}>
                    <TableCell className="whitespace-nowrap">
                      {format(new Date(line.postedAt), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>{line.description}</TableCell>
                    <TableCell className="capitalize">{line.type}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatUsd(line.amount)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {formatUsd(line.runningBalance)}
                    </TableCell>
                  </TableRow>
                ))}
                {!items.length && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground h-24">
                      No entries in range
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
        </>
      )}
    </div>
  );
}
