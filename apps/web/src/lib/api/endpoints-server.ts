import { serverFetch } from './server';
import type {
  AccountingDashboard,
  AdminAuditLogEntry,
  AdminOrgStats,
  AdminQueueStats,
  AdminSystemHealth,
  AdminUser,
  DelinquencyReport,
  MaintenanceReport,
  OccupancyReport,
  RentRollReportRow,
  RevenueReport,
  CommunicationRecord,
  CursorPage,
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
  Unit,
  MaintenanceTicket,
  MaintenanceTicketDetail,
  Vendor,
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

export async function enrichProperties(
  items: Property[],
): Promise<
  (Property & { unitsCount?: number; occupancyPercent?: number })[]
> {
  return Promise.all(
    items.map(async (property) => {
      try {
        const detail = await serverFetch<PropertyDetail>(`/properties/${property.id}`);
        const { unitsCount, vacantUnits } = detail.summary;
        const occupancyPercent =
          unitsCount > 0
            ? Math.round(((unitsCount - vacantUnits) / unitsCount) * 100)
            : 0;
        return { ...property, unitsCount, occupancyPercent };
      } catch {
        return { ...property, unitsCount: 0, occupancyPercent: 0 };
      }
    }),
  );
}

export async function enrichTenants(
  items: Tenant[],
): Promise<
  (Tenant & {
    activeUnitLabel?: string | null;
    activeLeaseId?: string | null;
    leaseEndDate?: string | null;
  })[]
> {
  return Promise.all(
    items.map(async (tenant) => {
      try {
        const detail = await serverFetch<TenantDetail>(`/tenants/${tenant.id}`);
        const lease = detail.activeLease;
        return {
          ...tenant,
          activeUnitLabel: lease
            ? `${lease.propertyName} · ${lease.unitNumber}`
            : null,
          activeLeaseId: lease?.id ?? null,
          leaseEndDate: lease?.endDate ?? null,
        };
      } catch {
        return { ...tenant, activeUnitLabel: null, activeLeaseId: null, leaseEndDate: null };
      }
    }),
  );
}

export const serverApi = {
  properties: {
    list: (params: Record<string, string | undefined>) =>
      serverFetch<CursorPage<Property>>(`/properties${qs(params)}`),
    get: (id: string) => serverFetch<PropertyDetail>(`/properties/${id}`),
    units: (propertyId: string) =>
      serverFetch<CursorPage<Unit>>(
        `/properties/${propertyId}/units${qs({ limit: 100 })}`,
      ),
  },
  tenants: {
    list: (params: Record<string, string | undefined>) =>
      serverFetch<CursorPage<Tenant>>(`/tenants${qs(params)}`),
    get: (id: string) => serverFetch<TenantDetail>(`/tenants/${id}`),
    communicationHistory: (id: string) =>
      serverFetch<CursorPage<CommunicationRecord>>(
        `/tenants/${id}/communication-history${qs({ limit: 50 })}`,
      ),
  },
  leases: {
    list: (params: Record<string, string | undefined>) =>
      serverFetch<{ items: Lease[]; nextCursor: string | null }>(
        `/leases${qs(params)}`,
      ),
    get: (id: string) => serverFetch<LeaseDetail>(`/leases/${id}`),
    versions: (id: string) => serverFetch<LeaseVersion[]>(`/leases/${id}/versions`),
  },
  accounting: {
    dashboard: () => serverFetch<AccountingDashboard>('/accounting/dashboard'),
    invoices: {
      list: (params: Record<string, string | undefined>) =>
        serverFetch<CursorPage<InvoiceSummary>>(
          `/accounting/invoices${qs(params)}`,
        ),
      get: (id: string) =>
        serverFetch<InvoiceDetail>(`/accounting/invoices/${id}`),
    },
    ledgerAccounts: () =>
      serverFetch<LedgerAccountOption[]>('/accounting/ledger/accounts'),
    generalLedger: (params: Record<string, string | undefined>) =>
      serverFetch<CursorPage<GeneralLedgerLine>>(
        `/accounting/ledger/general${qs(params)}`,
      ),
    trialBalance: (asOf?: string) =>
      serverFetch<TrialBalanceResponse>(
        `/accounting/trial-balance${qs({ asOf })}`,
      ),
    rentRoll: () => serverFetch<RentRollRow[]>('/accounting/rent-roll'),
  },
  maintenance: {
    tickets: {
      list: (params: Record<string, string | undefined>) =>
        serverFetch<CursorPage<MaintenanceTicket>>(
          `/maintenance/tickets${qs(params)}`,
        ),
      get: (id: string) =>
        serverFetch<MaintenanceTicketDetail>(`/maintenance/tickets/${id}`),
    },
  },
  vendors: {
    list: (params: Record<string, string | undefined>) =>
      serverFetch<CursorPage<Vendor>>(`/vendors${qs(params)}`),
    get: (id: string) => serverFetch<Vendor>(`/vendors/${id}`),
    tickets: (id: string, params: Record<string, string | undefined>) =>
      serverFetch<CursorPage<MaintenanceTicket>>(
        `/vendors/${id}/tickets${qs(params)}`,
      ),
  },
  admin: {
    stats: () => serverFetch<AdminOrgStats>('/admin/stats'),
    users: () => serverFetch<AdminUser[]>('/admin/users'),
    auditLogs: (params: Record<string, string | undefined>) =>
      serverFetch<CursorPage<AdminAuditLogEntry>>(
        `/admin/audit-logs${qs(params)}`,
      ),
    systemHealth: () => serverFetch<AdminSystemHealth>('/admin/system-health'),
    queues: () => serverFetch<AdminQueueStats[]>('/admin/queues'),
  },
  reports: {
    occupancy: (params: Record<string, string | undefined>) =>
      serverFetch<OccupancyReport>(`/reports/occupancy${qs(params)}`),
    revenue: (params: Record<string, string | undefined>) =>
      serverFetch<RevenueReport>(`/reports/revenue${qs(params)}`),
    maintenance: (params: Record<string, string | undefined>) =>
      serverFetch<MaintenanceReport>(`/reports/maintenance${qs(params)}`),
    rentRoll: (asOf?: string) =>
      serverFetch<RentRollReportRow[]>(`/reports/rent-roll${qs({ asOf })}`),
    delinquency: () => serverFetch<DelinquencyReport>('/reports/delinquency'),
  },
};
