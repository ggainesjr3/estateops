'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { InvoiceStatusBadge } from '@web/components/accounting/invoice-status-badge';
import { PayInvoiceDialog } from '@web/components/accounting/pay-invoice-dialog';
import { Button } from '@web/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@web/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@web/components/ui/table';
import { invoiceTypeLabels } from '@web/lib/invoice-status-styles';
import type { InvoiceSummary } from '@web/lib/api/types';
import { formatUsd } from '@web/lib/format-currency';
import { isInvoicePayable } from '@web/lib/invoice-utils';
import { useTenantInvoices } from '@web/lib/queries/use-accounting';
import { useState } from 'react';

export function TenantInvoicesTab({ tenantId }: { tenantId: string }) {
  const { data, isLoading, refetch } = useTenantInvoices(tenantId);
  const [payInvoice, setPayInvoice] = useState<InvoiceSummary | null>(null);

  const invoices = data?.items ?? [];
  const outstanding = invoices
    .filter((inv) => isInvoicePayable(inv.status))
    .reduce(
      (sum, inv) => sum + parseFloat(inv.amountDue) - parseFloat(inv.amountPaid),
      0,
    );

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading invoices…</p>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Outstanding balance</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold tabular-nums">{formatUsd(outstanding.toFixed(2))}</p>
          <p className="text-sm text-muted-foreground">
            Across {invoices.filter((i) => isInvoicePayable(i.status)).length} unpaid invoice(s)
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((inv) => {
                const balance = (
                  parseFloat(inv.amountDue) - parseFloat(inv.amountPaid)
                ).toFixed(2);
                return (
                  <TableRow key={inv.id}>
                    <TableCell>
                      <Link
                        href={`/accounting/invoices/${inv.id}`}
                        className="font-mono text-sm hover:underline"
                      >
                        {inv.invoiceNumber}
                      </Link>
                    </TableCell>
                    <TableCell>{invoiceTypeLabels[inv.type]}</TableCell>
                    <TableCell>{format(new Date(inv.dueDate), 'MMM d, yyyy')}</TableCell>
                    <TableCell>
                      <InvoiceStatusBadge status={inv.status} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatUsd(balance)}</TableCell>
                    <TableCell className="text-right">
                      {isInvoicePayable(inv.status) && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setPayInvoice(inv)}
                        >
                          Pay
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {!invoices.length && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No invoices for this tenant
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <PayInvoiceDialog
        invoice={payInvoice}
        open={Boolean(payInvoice)}
        onOpenChange={(open) => !open && setPayInvoice(null)}
        onPaid={() => void refetch()}
      />
    </div>
  );
}
