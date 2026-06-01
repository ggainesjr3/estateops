import { LedgerAccountType, LedgerEntryType } from '@estateops/shared';
import { amountToCents, centsToAmount } from './ledger-amount.util';

export interface EntryTotals {
  debitsCents: bigint;
  creditsCents: bigint;
}

/** Signed balance from debit/credit totals based on normal account balance. */
export function computeSignedBalanceCents(
  accountType: LedgerAccountType,
  totals: EntryTotals,
): bigint {
  const { debitsCents, creditsCents } = totals;
  switch (accountType) {
    case LedgerAccountType.ASSET:
    case LedgerAccountType.EXPENSE:
      return debitsCents - creditsCents;
    case LedgerAccountType.LIABILITY:
    case LedgerAccountType.EQUITY:
    case LedgerAccountType.REVENUE:
      return creditsCents - debitsCents;
    default:
      return debitsCents - creditsCents;
  }
}

export function formatBalance(
  accountType: LedgerAccountType,
  totals: EntryTotals,
): string {
  return centsToAmount(computeSignedBalanceCents(accountType, totals));
}

/** Apply a single entry to a running signed balance in cents. */
export function applyEntryToBalanceCents(
  accountType: LedgerAccountType,
  runningCents: bigint,
  entryType: LedgerEntryType,
  amount: string,
): bigint {
  const cents = amountToCents(amount);
  const isDebit = entryType === LedgerEntryType.DEBIT;
  switch (accountType) {
    case LedgerAccountType.ASSET:
    case LedgerAccountType.EXPENSE:
      return runningCents + (isDebit ? cents : -cents);
    case LedgerAccountType.LIABILITY:
    case LedgerAccountType.EQUITY:
    case LedgerAccountType.REVENUE:
      return runningCents + (isDebit ? -cents : cents);
    default:
      return runningCents;
  }
}
