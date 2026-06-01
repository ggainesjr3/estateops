import { RentEscalationFrequency } from '@estateops/shared';

export function calculateEscalatedRent(
  monthlyRent: string,
  escalationPercent: string,
  frequency: RentEscalationFrequency,
): string {
  const base = parseFloat(monthlyRent);
  const percent = parseFloat(escalationPercent);
  if (frequency === RentEscalationFrequency.NONE || percent <= 0) {
    return monthlyRent;
  }
  const multiplier = 1 + percent / 100;
  return (Math.round(base * multiplier * 100) / 100).toFixed(2);
}
