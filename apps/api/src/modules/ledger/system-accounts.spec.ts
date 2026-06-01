import { LedgerAccountType } from '@estateops/shared';
import { SYSTEM_LEDGER_ACCOUNTS } from './system-accounts';

describe('SYSTEM_LEDGER_ACCOUNTS', () => {
  it('defines seven system accounts with unique codes', () => {
    const codes = SYSTEM_LEDGER_ACCOUNTS.map((a) => a.code);
    expect(codes).toEqual(['1000', '1100', '2000', '3000', '4000', '5000', '5100']);
    expect(new Set(codes).size).toBe(7);
  });

  it('maps accounts to expected types', () => {
    const byCode = Object.fromEntries(
      SYSTEM_LEDGER_ACCOUNTS.map((a) => [a.code, a.type]),
    );
    expect(byCode['1000']).toBe(LedgerAccountType.ASSET);
    expect(byCode['2000']).toBe(LedgerAccountType.LIABILITY);
    expect(byCode['3000']).toBe(LedgerAccountType.REVENUE);
    expect(byCode['5000']).toBe(LedgerAccountType.EXPENSE);
  });
});
