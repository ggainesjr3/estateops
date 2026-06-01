'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@web/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@web/components/ui/dialog';
import { formatUsd } from '@web/lib/format-currency';
import type { InvoiceSummary } from '@web/lib/api/types';
import { usePayInvoice } from '@web/lib/queries/use-accounting';
import {
  loadStripeJs,
  type StripeCardElement,
  type StripeInstance,
} from '@web/lib/stripe/load-stripe';

function PayInvoiceForm({
  invoice,
  onClose,
  onPaid,
}: {
  invoice: InvoiceSummary;
  onClose: () => void;
  onPaid: () => void;
}) {
  const cardMountRef = useRef<HTMLDivElement>(null);
  const cardElementRef = useRef<StripeCardElement | null>(null);
  const stripeRef = useRef<StripeInstance | null>(null);
  const payInvoice = usePayInvoice();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [ready, setReady] = useState(false);

  const remaining = (
    parseFloat(invoice.amountDue) - parseFloat(invoice.amountPaid)
  ).toFixed(2);

  useEffect(() => {
    let cancelled = false;

    void loadStripeJs().then((stripe) => {
      if (cancelled || !stripe || !cardMountRef.current) return;
      stripeRef.current = stripe;
      const card = stripe.elements().create('card', {
        style: {
          base: {
            fontSize: '16px',
            color: '#0f172a',
            '::placeholder': { color: '#94a3b8' },
          },
          invalid: { color: '#dc2626' },
        },
      });
      card.mount(cardMountRef.current);
      cardElementRef.current = card;
      setReady(true);
    });

    return () => {
      cancelled = true;
      cardElementRef.current?.destroy();
      cardElementRef.current = null;
    };
  }, []);

  async function handlePay() {
    const stripe = stripeRef.current;
    const card = cardElementRef.current;
    if (!stripe || !card) return;

    setSubmitting(true);
    setError(null);

    try {
      const { error: pmError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card,
      });

      if (pmError || !paymentMethod) {
        throw new Error(pmError?.message ?? 'Could not create payment method');
      }

      const result = await payInvoice.mutateAsync({
        invoiceId: invoice.id,
        paymentMethodId: paymentMethod.id,
      });

      if (result.clientSecret) {
        const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(
          result.clientSecret,
        );
        if (confirmError) {
          throw new Error(confirmError.message ?? 'Payment confirmation failed');
        }
        if (paymentIntent?.status !== 'succeeded' && paymentIntent?.status !== 'processing') {
          throw new Error(`Payment status: ${paymentIntent?.status ?? 'unknown'}`);
        }
      }

      onPaid();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Payment failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Amount due: <span className="font-medium text-foreground">{formatUsd(remaining)}</span>
      </p>

      <div ref={cardMountRef} className="rounded-md border bg-background p-3 min-h-[44px]" />

      <p className="text-xs text-muted-foreground">
        Test card: 4242 4242 4242 4242 · any future expiry · any CVC
      </p>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button type="button" onClick={handlePay} disabled={!ready || submitting}>
          {submitting ? 'Processing…' : 'Pay with card'}
        </Button>
      </div>
    </div>
  );
}

export function PayInvoiceDialog({
  invoice,
  open,
  onOpenChange,
  onPaid,
}: {
  invoice: InvoiceSummary | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPaid?: () => void;
}) {
  if (!invoice) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pay invoice {invoice.invoiceNumber}</DialogTitle>
          <DialogDescription>
            {invoice.tenantName}
            {invoice.unitLabel ? ` · ${invoice.unitLabel}` : ''}
          </DialogDescription>
        </DialogHeader>
        <PayInvoiceForm
          invoice={invoice}
          onClose={() => onOpenChange(false)}
          onPaid={() => onPaid?.()}
        />
      </DialogContent>
    </Dialog>
  );
}
