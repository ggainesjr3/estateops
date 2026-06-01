import { clientFetch } from './client';
import type {
  AccountingDashboard,
  CommunicationRecord,
  CursorPage,
  DocumentRecord,
  GeneralLedgerLine,
  InvoiceDetail,
  InvoiceSummary,
  Lease,
  LeaseDetail,
  LeaseVersion,
  LedgerAccountOption,
  Property,
  PropertyDetail,
  RentRollRow,
  Tenant,
  TenantDetail,
  TrialBalanceResponse,
  TicketAttachment,
  Unit,
  DocumentDownloadUrl,
  DocumentUploadUrl,
  MaintenanceTicket,
  MaintenanceTicketDetail,
  Vendor,
  VendorInvoice,
} from './types';

function qs(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      search.set(key, String(value));
    }
  }
  const s = search.toString();
  return s ? `?${s}` : '';
}

export const api = {
  properties: {
    list: (params: Record<string, string | undefined>, token?: string) =>
      clientFetch<CursorPage<Property>>(`/properties${qs(params)}`, { token }),
    get: (id: string, token?: string) =>
      clientFetch<PropertyDetail>(`/properties/${id}`, { token }),
    create: (body: Record<string, unknown>, token?: string) =>
      clientFetch<Property>('/properties', {
        method: 'POST',
        body: JSON.stringify(body),
        token,
      }),
    units: (propertyId: string, token?: string) =>
      clientFetch<CursorPage<Unit>>(
        `/properties/${propertyId}/units${qs({ limit: 100 })}`,
        { token },
      ),
  },
  tenants: {
    list: (params: Record<string, string | undefined>, token?: string) =>
      clientFetch<CursorPage<Tenant>>(`/tenants${qs(params)}`, { token }),
    get: (id: string, token?: string) =>
      clientFetch<TenantDetail>(`/tenants/${id}`, { token }),
    communicationHistory: (id: string, token?: string) =>
      clientFetch<CursorPage<CommunicationRecord>>(
        `/tenants/${id}/communication-history${qs({ limit: 50 })}`,
        { token },
      ),
    update: (id: string, body: Record<string, unknown>, token?: string) =>
      clientFetch<Tenant>(`/tenants/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
        token,
      }),
    sendMessage: (id: string, body: Record<string, unknown>, token?: string) =>
      clientFetch<{ communicationId: string; status: string }>(
        `/tenants/${id}/send-message`,
        {
          method: 'POST',
          body: JSON.stringify(body),
          token,
        },
      ),
    documents: (id: string, token?: string) =>
      clientFetch<DocumentRecord[]>(`/tenants/${id}/documents`, { token }),
  },
  leases: {
    list: (params: Record<string, string | undefined>, token?: string) =>
      clientFetch<{ items: Lease[]; nextCursor: string | null }>(
        `/leases${qs(params)}`,
        { token },
      ),
    get: (id: string, token?: string) =>
      clientFetch<LeaseDetail>(`/leases/${id}`, { token }),
    versions: (id: string, token?: string) =>
      clientFetch<LeaseVersion[]>(`/leases/${id}/versions`, { token }),
    send: (id: string, token?: string) =>
      clientFetch<Lease>(`/leases/${id}/send`, { method: 'POST', token }),
    recall: (id: string, token?: string) =>
      clientFetch<Lease>(`/leases/${id}/recall`, { method: 'POST', token }),
    sign: (id: string, role: 'tenant' | 'manager', token?: string) =>
      clientFetch<Lease>(`/leases/${id}/sign`, {
        method: 'POST',
        body: JSON.stringify({ role }),
        token,
      }),
    renew: (id: string, token?: string) =>
      clientFetch<Lease>(`/leases/${id}/renew`, { method: 'POST', token }),
    terminate: (id: string, reason: string, token?: string) =>
      clientFetch<Lease>(`/leases/${id}/terminate`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
        token,
      }),
    create: (body: Record<string, unknown>, token?: string) =>
      clientFetch<Lease>('/leases', {
        method: 'POST',
        body: JSON.stringify(body),
        token,
      }),
  },
  accounting: {
    dashboard: (token?: string) =>
      clientFetch<AccountingDashboard>('/accounting/dashboard', { token }),
    invoices: {
      list: (params: Record<string, string | undefined>, token?: string) =>
        clientFetch<CursorPage<InvoiceSummary>>(
          `/accounting/invoices${qs(params)}`,
          { token },
        ),
      get: (id: string, token?: string) =>
        clientFetch<InvoiceDetail>(`/accounting/invoices/${id}`, { token }),
      create: (body: Record<string, unknown>, token?: string) =>
        clientFetch<InvoiceSummary>('/accounting/invoices', {
          method: 'POST',
          body: JSON.stringify(body),
          token,
        }),
    },
    ledgerAccounts: (token?: string) =>
      clientFetch<LedgerAccountOption[]>('/accounting/ledger/accounts', { token }),
    generalLedger: (params: Record<string, string | undefined>, token?: string) =>
      clientFetch<CursorPage<GeneralLedgerLine>>(
        `/accounting/ledger/general${qs(params)}`,
        { token },
      ),
    trialBalance: (asOf: string | undefined, token?: string) =>
      clientFetch<TrialBalanceResponse>(
        `/accounting/trial-balance${qs({ asOf })}`,
        { token },
      ),
    rentRoll: (token?: string) =>
      clientFetch<RentRollRow[]>('/accounting/rent-roll', { token }),
    exportGeneralLedger: (params: Record<string, string | undefined>) =>
      `/accounting/ledger/general/export${qs(params)}`,
    exportRentRoll: () => '/accounting/rent-roll/export',
  },
  maintenance: {
    tickets: {
      list: (params: Record<string, string | undefined>, token?: string) =>
        clientFetch<CursorPage<MaintenanceTicket>>(
          `/maintenance/tickets${qs(params)}`,
          { token },
        ),
      get: (id: string, token?: string) =>
        clientFetch<MaintenanceTicketDetail>(`/maintenance/tickets/${id}`, { token }),
      create: (body: Record<string, unknown>, token?: string) =>
        clientFetch<MaintenanceTicket>('/maintenance/tickets', {
          method: 'POST',
          body: JSON.stringify(body),
          token,
        }),
      update: (id: string, body: Record<string, unknown>, token?: string) =>
        clientFetch<MaintenanceTicket>(`/maintenance/tickets/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
          token,
        }),
      transition: (id: string, body: Record<string, unknown>, token?: string) =>
        clientFetch<MaintenanceTicket>(`/maintenance/tickets/${id}/status`, {
          method: 'POST',
          body: JSON.stringify(body),
          token,
        }),
      assign: (id: string, body: Record<string, unknown>, token?: string) =>
        clientFetch<MaintenanceTicket>(`/maintenance/tickets/${id}/assign`, {
          method: 'POST',
          body: JSON.stringify(body),
          token,
        }),
      addAttachment: (id: string, body: Record<string, unknown>, token?: string) =>
        clientFetch<TicketAttachment>(`/maintenance/tickets/${id}/attachments`, {
          method: 'POST',
          body: JSON.stringify(body),
          token,
        }),
      approveInvoice: (ticketId: string, invoiceId: string, token?: string) =>
        clientFetch<VendorInvoice>(
          `/maintenance/tickets/${ticketId}/vendor-invoices/${invoiceId}/approve`,
          { method: 'POST', token },
        ),
      payInvoice: (ticketId: string, invoiceId: string, token?: string) =>
        clientFetch<VendorInvoice>(
          `/maintenance/tickets/${ticketId}/vendor-invoices/${invoiceId}/pay`,
          { method: 'POST', token },
        ),
    },
  },
  vendors: {
    list: (params: Record<string, string | undefined>, token?: string) =>
      clientFetch<CursorPage<Vendor>>(`/vendors${qs(params)}`, { token }),
    get: (id: string, token?: string) =>
      clientFetch<Vendor>(`/vendors/${id}`, { token }),
    create: (body: Record<string, unknown>, token?: string) =>
      clientFetch<Vendor>('/vendors', {
        method: 'POST',
        body: JSON.stringify(body),
        token,
      }),
    tickets: (id: string, params: Record<string, string | undefined>, token?: string) =>
      clientFetch<CursorPage<MaintenanceTicket>>(
        `/vendors/${id}/tickets${qs(params)}`,
        { token },
      ),
  },
  documents: {
    uploadUrl: (body: Record<string, unknown>, token?: string) =>
      clientFetch<DocumentUploadUrl>('/documents/upload-url', {
        method: 'POST',
        body: JSON.stringify(body),
        token,
      }),
    register: (body: Record<string, unknown>, token?: string) =>
      clientFetch<{ id: string }>('/documents', {
        method: 'POST',
        body: JSON.stringify(body),
        token,
      }),
    download: (id: string, token?: string) =>
      clientFetch<DocumentDownloadUrl>(`/documents/${id}/download`, { token }),
  },
  payments: {
    createIntent: (body: Record<string, unknown>, token?: string) =>
      clientFetch<{ payment: { id: string }; clientSecret: string | null }>(
        '/payments/intents',
        { method: 'POST', body: JSON.stringify(body), token },
      ),
    scheduleAutopay: (invoiceId: string, token?: string) =>
      clientFetch<{ scheduled: boolean }>(
        `/payments/invoices/${invoiceId}/autopay`,
        { method: 'POST', token },
      ),
    refund: (paymentId: string, body?: Record<string, unknown>, token?: string) =>
      clientFetch<{ id: string; status: string }>(
        `/billing/payments/${paymentId}/refund`,
        { method: 'POST', body: JSON.stringify(body ?? {}), token },
      ),
  },
  billing: {
    addPaymentMethod: (body: Record<string, unknown>, token?: string) =>
      clientFetch<{ id: string }>('/billing/payment-methods', {
        method: 'POST',
        body: JSON.stringify(body),
        token,
      }),
    invoices: {
      list: (params: Record<string, string | undefined>, token?: string) =>
        clientFetch<CursorPage<InvoiceSummary>>(
          `/billing/invoices${qs(params)}`,
          { token },
        ),
      get: (id: string, token?: string) =>
        clientFetch<InvoiceDetail>(`/billing/invoices/${id}`, { token }),
      create: (body: Record<string, unknown>, token?: string) =>
        clientFetch<InvoiceSummary>('/billing/invoices', {
          method: 'POST',
          body: JSON.stringify(body),
          token,
        }),
      pay: (
        id: string,
        body: { paymentMethodId: string },
        token?: string,
      ) =>
        clientFetch<{ payment: { id: string; status: string }; clientSecret: string | null }>(
          `/billing/invoices/${id}/pay`,
          { method: 'POST', body: JSON.stringify(body), token },
        ),
    },
  },
};
