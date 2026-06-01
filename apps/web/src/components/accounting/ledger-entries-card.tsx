import { Card, CardContent, CardHeader, CardTitle } from '@web/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@web/components/ui/table';
import type { LedgerEntryLine } from '@web/lib/api/types';
import { formatUsd } from '@web/lib/format-currency';

export function LedgerEntriesCard({ entries }: { entries: LedgerEntryLine[] }) {
  const debits = entries.filter((e) => e.type === 'debit');
  const credits = entries.filter((e) => e.type === 'credit');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Ledger entries (double-entry)</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6 md:grid-cols-2">
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-2">Debits</p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {debits.length ? (
                debits.map((e, i) => (
                  <TableRow key={`d-${i}`}>
                    <TableCell>
                      <span className="font-mono text-xs">{e.accountCode}</span> {e.accountName}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatUsd(e.amount)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={2} className="text-muted-foreground">
                    No debits
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-2">Credits</p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {credits.length ? (
                credits.map((e, i) => (
                  <TableRow key={`c-${i}`}>
                    <TableCell>
                      <span className="font-mono text-xs">{e.accountCode}</span> {e.accountName}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatUsd(e.amount)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={2} className="text-muted-foreground">
                    No credits
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
