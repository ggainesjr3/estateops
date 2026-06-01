'use client';

import { format } from 'date-fns';
import Link from 'next/link';
import { useState } from 'react';
import { LedgerEntriesCard } from '@web/components/accounting/ledger-entries-card';
import { InvoiceStatusBadge } from '@web/components/accounting/invoice-status-badge';
import { PayInvoiceDialog } from '@web/components/accounting/pay-invoice-dialog';
import { PageHeader } from '@web/components/shared/page-header';
import { TableSkeleton } from '@web/components/shared/table-skeleton';
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
import type { InvoiceDetail } from '@web/lib/api/types';
import { formatUsd } from '@web/lib/format-currency';
import { isInvoicePayable } from '@web/lib/invoice-utils';
import { useIsAdminRole } from '@web/lib/hooks/use-is-admin-role';
import {
  useInvoiceDetail,
  useRefundPayment,
  useScheduleAutopay,
} from '@web/lib/queries/use-accounting';
import { usePaymentStatus } from '@web/lib/realtime/use-payment-status';

export function InvoiceDetailClient({
  invoiceId,
  initialData,
  serverError,
}: {
  invoiceId: string;
  initialData: InvoiceDetail | null;
  serverError: string | null;
}) {
  const { data: invoice, isLoading, error, refetch } = useInvoiceDetail(
    invoiceId,
    initialData ?? undefined,
  );
  const scheduleAutopay = useScheduleAutopay();
  const refundPayment = useRefundPayment();
  const isAdmin = useIsAdminRole();
  const [payOpen, setPayOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  usePaymentStatus(invoiceId);

  const remaining =
    invoice &&
    (parseFloat(invoice.amountDue) - parseFloat(invoice.amountPaid)).toFixed(2);

  async function handleAutopay() {
    if (!invoice) return;
    setActionError(null);
    try {
      await scheduleAutopay.mutateAsync(invoice.id);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Failed to schedule autopay');
    }
  }

  async function handleRefund(paymentId: string, amount: string) {
    if (!invoice) return;
    setActionError(null);
    try {
      await refundPayment.mutateAsync({ paymentId, invoiceId: invoice.id, amount });
      await refetch();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Refund failed');
    }
  }

  if (isLoading && !invoice) {
    return <TableSkeleton cols={4} />;
  }

  if (!invoice) {
    return <p className="text-destructive">{error?.message ?? serverError ?? 'Not found'}</p>;
  }

  const canPay = isInvoicePayable(invoice.status);

  return (
    <div className="space-y-6">
      <PageHeader
        title={invoice.invoiceNumber}
        description={`${invoice.tenantName} · ${invoice.propertyName ?? ''} ${invoice.unitLabel ?? ''}`}
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Invoice</CardTitle>
          <InvoiceStatusBadge status={invoice.status} />
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 text-sm">
          <p>
            <span className="text-muted-foreground">Type:</span>{' '}
            {invoiceTypeLabels[invoice.type]}
          </p>
          <p>
            <span className="text-muted-foreground">Due:</span>{' '}
            {format(new Date(invoice.dueDate), 'MMM d, yyyy')}
          </p>
          <p>
            <span className="text-muted-foreground">Amount due:</span>{' '}
            {formatUsd(invoice.amountDue)}
          </p>
          <p>
            <span className="text-muted-foreground">Amount paid:</span>{' '}
            {formatUsd(invoice.amountPaid)}
          </p>
          {remaining && canPay && (
            <p>
              <span className="text-muted-foreground">Balance:</span>{' '}
              {formatUsd(remaining)}
            </p>
          )}
          {invoice.paidAt && (
            <p>
              <span className="text-muted-foreground">Paid at:</span>{' '}
              {format(new Date(invoice.paidAt), 'MMM d, yyyy')}
            </p>
          )}
          <p>
            <Link href={`/leases/${invoice.leaseId}`} className="text-primary hover:underline">
              View lease
            </Link>
          </p>
          {invoice.notes && (
            <p className="sm:col-span-2">
              <span className="text-muted-foreground">Notes:</span> {invoice.notes}
            </p>
          )}
        </CardContent>
      </Card>

      {(canPay || invoice.status === 'paid') && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payment actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4 items-center">
            {canPay && (
              <>
                <Button type="button" onClick={() => setPayOpen(true)}>
                  Pay now
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleAutopay}
                  disabled={scheduleAutopay.isPending}
                >
                  Schedule autopay
                </Button>
              </>
            )}
            {actionError && <p className="text-sm text-destructive w-full">{actionError}</p>}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payment history</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                {isAdmin && <TableHead />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.payments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    {p.processedAt
                      ? format(new Date(p.processedAt), 'MMM d, yyyy')
                      : format(new Date(p.createdAt), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell className="capitalize">{p.method}</TableCell>
                  <TableCell className="capitalize">{p.status}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatUsd(p.amount)}</TableCell>
                  {isAdmin && (
                    <TableCell className="text-right">
                      {p.status === 'succeeded' && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={refundPayment.isPending}
                          onClick={() => void handleRefund(p.id, p.amount)}
                        >
                          Refund
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {!invoice.payments.length && (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 5 : 4} className="text-center text-muted-foreground">
                    No payments yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <LedgerEntriesCard entries={invoice.ledgerEntries} />

      <PayInvoiceDialog
        invoice={invoice}
        open={payOpen}
        onOpenChange={setPayOpen}
        onPaid={() => void refetch()}
      />
    </div>
  );
}
