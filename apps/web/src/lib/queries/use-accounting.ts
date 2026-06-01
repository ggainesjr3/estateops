'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@web/lib/api/endpoints';
import { queryKeys } from './keys';

export function useAccountingDashboard(initial?: Awaited<ReturnType<typeof api.accounting.dashboard>>) {
  return useQuery({
    queryKey: queryKeys.accounting.dashboard(),
    queryFn: () => api.accounting.dashboard(),
    initialData: initial,
  });
}

export function useInvoicesList(
  filters: Record<string, string | undefined>,
  initial?: Awaited<ReturnType<typeof api.accounting.invoices.list>>,
) {
  return useQuery({
    queryKey: queryKeys.accounting.invoices.list(filters),
    queryFn: () => api.accounting.invoices.list(filters),
    initialData: initial,
  });
}

export function useInvoiceDetail(
  id: string,
  initial?: Awaited<ReturnType<typeof api.accounting.invoices.get>>,
) {
  return useQuery({
    queryKey: queryKeys.accounting.invoices.detail(id),
    queryFn: () => api.accounting.invoices.get(id),
    initialData: initial,
    enabled: Boolean(id),
  });
}

export function useCreateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => api.accounting.invoices.create(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.accounting.all });
    },
  });
}

export function useLedgerAccounts() {
  return useQuery({
    queryKey: queryKeys.accounting.ledgerAccounts(),
    queryFn: () => api.accounting.ledgerAccounts(),
  });
}

export function useGeneralLedger(
  params: Record<string, string | undefined>,
  enabled: boolean,
) {
  return useQuery({
    queryKey: queryKeys.accounting.generalLedger(params),
    queryFn: () => api.accounting.generalLedger(params),
    enabled,
  });
}

export function useTrialBalance(asOf?: string) {
  return useQuery({
    queryKey: queryKeys.accounting.trialBalance(asOf),
    queryFn: () => api.accounting.trialBalance(asOf),
  });
}

export function useRentRoll(initial?: Awaited<ReturnType<typeof api.accounting.rentRoll>>) {
  return useQuery({
    queryKey: queryKeys.accounting.rentRoll(),
    queryFn: () => api.accounting.rentRoll(),
    initialData: initial,
  });
}

export function useScheduleAutopay() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (invoiceId: string) => api.payments.scheduleAutopay(invoiceId),
    onSuccess: (_data, invoiceId) => {
      void qc.invalidateQueries({
        queryKey: queryKeys.accounting.invoices.detail(invoiceId),
      });
    },
  });
}

export function usePayInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      invoiceId,
      paymentMethodId,
    }: {
      invoiceId: string;
      paymentMethodId: string;
    }) => api.billing.invoices.pay(invoiceId, { paymentMethodId }),
    onSuccess: (_data, { invoiceId }) => {
      void qc.invalidateQueries({ queryKey: queryKeys.accounting.all });
      void qc.invalidateQueries({
        queryKey: queryKeys.accounting.invoices.detail(invoiceId),
      });
    },
  });
}

export function useRefundPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      paymentId,
      invoiceId,
      amount,
    }: {
      paymentId: string;
      invoiceId: string;
      amount?: string;
    }) => api.payments.refund(paymentId, amount ? { amount } : {}),
    onSuccess: (_data, { invoiceId }) => {
      void qc.invalidateQueries({ queryKey: queryKeys.accounting.all });
      void qc.invalidateQueries({
        queryKey: queryKeys.accounting.invoices.detail(invoiceId),
      });
    },
  });
}

export function useTenantInvoices(tenantId: string) {
  return useQuery({
    queryKey: queryKeys.accounting.invoices.list({ tenantId, limit: '100' }),
    queryFn: () => api.billing.invoices.list({ tenantId, limit: '100' }),
    enabled: Boolean(tenantId),
  });
}
