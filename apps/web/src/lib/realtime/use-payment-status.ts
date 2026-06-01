'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  WsServerEvents,
  type PaymentFailedPayload,
  type PaymentReceivedPayload,
} from '@web/lib/realtime/ws-events';
import { subscribeWsEvent, useWebSocket } from '@web/lib/realtime/use-websocket';
import { queryKeys } from '@web/lib/queries/keys';

export function usePaymentStatus(invoiceId?: string): void {
  const qc = useQueryClient();
  useWebSocket();

  useEffect(() => {
    const invalidate = (eventInvoiceId: string) => {
      if (invoiceId && eventInvoiceId !== invoiceId) return;
      qc.invalidateQueries({ queryKey: queryKeys.accounting.all });
      if (eventInvoiceId) {
        qc.invalidateQueries({
          queryKey: queryKeys.accounting.invoices.detail(eventInvoiceId),
        });
      }
    };

    const unsubReceived = subscribeWsEvent(
      WsServerEvents.PAYMENT_RECEIVED,
      (payload: unknown) => {
        const data = payload as PaymentReceivedPayload;
        invalidate(data.invoiceId);
      },
    );
    const unsubFailed = subscribeWsEvent(
      WsServerEvents.PAYMENT_FAILED,
      (payload: unknown) => {
        const data = payload as PaymentFailedPayload;
        invalidate(data.invoiceId);
      },
    );

    return () => {
      unsubReceived();
      unsubFailed();
    };
  }, [qc, invoiceId]);
}
