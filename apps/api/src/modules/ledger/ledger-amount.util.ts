import { BadRequestException } from '@nestjs/common';
import { LedgerEntryType } from '@estateops/shared';

/** Parse NUMERIC(15,2) string to integer cents — never use floats. */
export function parseMoneyToCents(amount: string): bigint {
  const normalized = amount.trim();
  if (!/^-?\d+(\.\d{1,2})?$/.test(normalized)) {
    throw new BadRequestException(`Invalid amount format: ${amount}`);
  }
  const negative = normalized.startsWith('-');
  const unsigned = negative ? normalized.slice(1) : normalized;
  const parts = unsigned.split('.');
  const whole = parts[0] && parts[0].length > 0 ? parts[0] : '0';
  const frac = parts[1] ?? '';
  const cents = BigInt(whole) * 100n + BigInt(frac.padEnd(2, '0').slice(0, 2));
  return negative ? -cents : cents;
}

/** Posting lines must be strictly positive. */
export function amountToCents(amount: string): bigint {
  const cents = parseMoneyToCents(amount);
  if (cents <= 0n) {
    throw new BadRequestException('Entry amounts must be positive');
  }
  return cents;
}

export function centsToAmount(cents: bigint): string {
  const negative = cents < 0n;
  const abs = negative ? -cents : cents;
  const whole = abs / 100n;
  const frac = (abs % 100n).toString().padStart(2, '0');
  return `${negative ? '-' : ''}${whole}.${frac}`;
}

export interface PostingLineInput {
  amount: string;
  type: LedgerEntryType;
}

export function assertBalancedEntries(entries: PostingLineInput[]): void {
  if (entries.length < 2) {
    throw new BadRequestException('At least two ledger entries are required');
  }

  let debitTotal = 0n;
  let creditTotal = 0n;

  for (const entry of entries) {
    const cents = amountToCents(entry.amount);
    if (entry.type === LedgerEntryType.DEBIT) {
      debitTotal += cents;
    } else {
      creditTotal += cents;
    }
  }

  if (debitTotal !== creditTotal) {
    throw new BadRequestException(
      `Unbalanced transaction: debits=${centsToAmount(debitTotal)} credits=${centsToAmount(creditTotal)}`,
    );
  }
}
