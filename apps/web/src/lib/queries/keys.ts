export const queryKeys = {
  properties: {
    all: ['properties'] as const,
    list: (filters: Record<string, string | undefined>) =>
      ['properties', 'list', filters] as const,
    detail: (id: string) => ['properties', id] as const,
    units: (propertyId: string) => ['properties', propertyId, 'units'] as const,
  },
  tenants: {
    all: ['tenants'] as const,
    list: (filters: Record<string, string | undefined>) =>
      ['tenants', 'list', filters] as const,
    detail: (id: string) => ['tenants', id] as const,
    comms: (id: string) => ['tenants', id, 'communication'] as const,
    documents: (id: string) => ['tenants', id, 'documents'] as const,
  },
  leases: {
    all: ['leases'] as const,
    list: (filters: Record<string, string | undefined>) =>
      ['leases', 'list', filters] as const,
    detail: (id: string) => ['leases', id] as const,
    versions: (id: string) => ['leases', id, 'versions'] as const,
  },
  maintenance: {
    all: ['maintenance'] as const,
    list: (filters: Record<string, string | undefined>) =>
      ['maintenance', 'list', filters] as const,
    detail: (id: string) => ['maintenance', id] as const,
  },
  vendors: {
    all: ['vendors'] as const,
    list: (filters: Record<string, string | undefined>) =>
      ['vendors', 'list', filters] as const,
    detail: (id: string) => ['vendors', id] as const,
    tickets: (id: string) => ['vendors', id, 'tickets'] as const,
  },
  notifications: {
    all: ['notifications'] as const,
    list: (filters: Record<string, string | undefined>) =>
      ['notifications', 'list', filters] as const,
  },
  accounting: {
    all: ['accounting'] as const,
    dashboard: () => ['accounting', 'dashboard'] as const,
    invoices: {
      list: (filters: Record<string, string | undefined>) =>
        ['accounting', 'invoices', filters] as const,
      detail: (id: string) => ['accounting', 'invoices', id] as const,
    },
    ledgerAccounts: () => ['accounting', 'ledger', 'accounts'] as const,
    generalLedger: (params: Record<string, string | undefined>) =>
      ['accounting', 'ledger', 'general', params] as const,
    trialBalance: (asOf?: string) => ['accounting', 'trial-balance', asOf] as const,
    rentRoll: () => ['accounting', 'rent-roll'] as const,
  },
};
