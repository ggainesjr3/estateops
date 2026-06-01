import { RentEscalationFrequency } from '@estateops/shared';
import { calculateEscalatedRent } from './lease-rent-escalation.util';

describe('calculateEscalatedRent', () => {
  it('returns unchanged rent when frequency is none', () => {
    expect(
      calculateEscalatedRent('1000.00', '5', RentEscalationFrequency.NONE),
    ).toBe('1000.00');
  });

  it('applies annual escalation percent', () => {
    expect(
      calculateEscalatedRent('1000.00', '5', RentEscalationFrequency.ANNUAL),
    ).toBe('1050.00');
  });

  it('applies biannual escalation percent', () => {
    expect(
      calculateEscalatedRent('2000.00', '10', RentEscalationFrequency.BIANNUAL),
    ).toBe('2200.00');
  });
});
