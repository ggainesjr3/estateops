import { BadRequestException } from '@nestjs/common';
import { parseMoneyToCents, centsToAmount } from '../ledger/ledger-amount.util';

export function addMoney(a: string, b: string): string {
  const sum = parseMoneyToCents(a) + parseMoneyToCents(b);
  return centsToAmount(sum);
}

export function subtractMoney(a: string, b: string): string {
  const diff = parseMoneyToCents(a) - parseMoneyToCents(b);
  return centsToAmount(diff);
}

export function compareMoney(a: string, b: string): number {
  const ac = parseMoneyToCents(a);
  const bc = parseMoneyToCents(b);
  if (ac < bc) return -1;
  if (ac > bc) return 1;
  return 0;
}

export function isPositiveMoney(amount: string): boolean {
  return parseMoneyToCents(amount) > 0n;
}

export function assertPayableAmount(amount: string, amountDue: string, amountPaid: string): void {
  const remaining = subtractMoney(amountDue, amountPaid);
  if (!isPositiveMoney(amount)) {
    throw new BadRequestException('Payment amount must be positive');
  }
  if (compareMoney(amount, remaining) > 0) {
    throw new BadRequestException('Payment exceeds invoice balance');
  }
}
