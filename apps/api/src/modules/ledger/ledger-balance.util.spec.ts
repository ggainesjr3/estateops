import { LedgerAccountType, LedgerEntryType } from '@estateops/shared';
import {
  applyEntryToBalanceCents,
  computeSignedBalanceCents,
  formatBalance,
} from './ledger-balance.util';

describe('ledger-balance.util', () => {
  it('computes asset balance as debits minus credits', () => {
    const balance = computeSignedBalanceCents(LedgerAccountType.ASSET, {
      debitsCents: 50000n,
      creditsCents: 12500n,
    });
    expect(balance).toBe(37500n);
    expect(formatBalance(LedgerAccountType.ASSET, {
      debitsCents: 50000n,
      creditsCents: 12500n,
    })).toBe('375.00');
  });

  it('computes liability balance as credits minus debits', () => {
    expect(
      formatBalance(LedgerAccountType.LIABILITY, {
        debitsCents: 10000n,
        creditsCents: 25000n,
      }),
    ).toBe('150.00');
  });

  it('computes revenue balance as credits minus debits', () => {
    expect(
      formatBalance(LedgerAccountType.REVENUE, {
        debitsCents: 0n,
        creditsCents: 99999n,
      }),
    ).toBe('999.99');
  });

  it('applies entries to running balance for expenses', () => {
    let running = 0n;
    running = applyEntryToBalanceCents(
      LedgerAccountType.EXPENSE,
      running,
      LedgerEntryType.DEBIT,
      '75.25',
    );
    running = applyEntryToBalanceCents(
      LedgerAccountType.EXPENSE,
      running,
      LedgerEntryType.CREDIT,
      '25.25',
    );
    expect(running).toBe(5000n);
  });
});
