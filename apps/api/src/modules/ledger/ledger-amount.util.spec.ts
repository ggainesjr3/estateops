import { BadRequestException } from '@nestjs/common';
import { LedgerEntryType } from '@estateops/shared';
import {
  amountToCents,
  assertBalancedEntries,
  centsToAmount,
  parseMoneyToCents,
} from './ledger-amount.util';

describe('ledger-amount.util', () => {
  describe('assertBalancedEntries', () => {
    it('accepts balanced debits and credits', () => {
      expect(() =>
        assertBalancedEntries([
          { amount: '100.00', type: LedgerEntryType.DEBIT },
          { amount: '60.00', type: LedgerEntryType.DEBIT },
          { amount: '160.00', type: LedgerEntryType.CREDIT },
        ]),
      ).not.toThrow();
    });

    it('rejects unbalanced entries', () => {
      expect(() =>
        assertBalancedEntries([
          { amount: '100.00', type: LedgerEntryType.DEBIT },
          { amount: '50.00', type: LedgerEntryType.CREDIT },
        ]),
      ).toThrow(BadRequestException);
    });

    it('rejects fewer than two lines', () => {
      expect(() =>
        assertBalancedEntries([{ amount: '10.00', type: LedgerEntryType.DEBIT }]),
      ).toThrow(BadRequestException);
    });

    it('rejects zero or negative posting amounts', () => {
      expect(() =>
        assertBalancedEntries([
          { amount: '0.00', type: LedgerEntryType.DEBIT },
          { amount: '0.00', type: LedgerEntryType.CREDIT },
        ]),
      ).toThrow(BadRequestException);
    });
  });

  describe('amount parsing', () => {
    it('round-trips cents without floats', () => {
      expect(amountToCents('1234.56')).toBe(123456n);
      expect(centsToAmount(123456n)).toBe('1234.56');
    });

    it('parses aggregated zero sums', () => {
      expect(parseMoneyToCents('0')).toBe(0n);
      expect(parseMoneyToCents('0.00')).toBe(0n);
    });
  });
});
