import { LedgerAccountType } from '@estateops/shared';

export interface SystemAccountDefinition {
  code: string;
  name: string;
  type: LedgerAccountType;
  subtype?: string;
}

export const SYSTEM_LEDGER_ACCOUNTS: readonly SystemAccountDefinition[] = [
  { code: '1000', name: 'Cash', type: LedgerAccountType.ASSET },
  { code: '1100', name: 'Accounts Receivable', type: LedgerAccountType.ASSET },
  {
    code: '2000',
    name: 'Security Deposits Held',
    type: LedgerAccountType.LIABILITY,
  },
  { code: '3000', name: 'Rental Revenue', type: LedgerAccountType.REVENUE },
  { code: '4000', name: 'Late Fee Revenue', type: LedgerAccountType.REVENUE },
  { code: '5000', name: 'Maintenance Expense', type: LedgerAccountType.EXPENSE },
  { code: '5100', name: 'Vendor Expense', type: LedgerAccountType.EXPENSE },
] as const;
