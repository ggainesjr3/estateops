import { UnprocessableEntityException } from '@nestjs/common';
import { LeaseStatus } from '@estateops/shared';
import { LeaseStateMachineService } from './lease-state-machine.service';

describe('LeaseStateMachineService', () => {
  let machine: LeaseStateMachineService;

  beforeEach(() => {
    machine = new LeaseStateMachineService();
  });

  const validPairs: [LeaseStatus, LeaseStatus][] = [
    [LeaseStatus.DRAFT, LeaseStatus.PENDING],
    [LeaseStatus.PENDING, LeaseStatus.ACTIVE],
    [LeaseStatus.PENDING, LeaseStatus.DRAFT],
    [LeaseStatus.ACTIVE, LeaseStatus.RENEWED],
    [LeaseStatus.ACTIVE, LeaseStatus.TERMINATED],
    [LeaseStatus.ACTIVE, LeaseStatus.EXPIRED],
  ];

  it.each(validPairs)('allows %s → %s', (from, to) => {
    expect(machine.canTransition(from, to)).toBe(true);
    expect(() => machine.assertTransition(from, to)).not.toThrow();
  });

  const invalidPairs: [LeaseStatus, LeaseStatus][] = [
    [LeaseStatus.DRAFT, LeaseStatus.ACTIVE],
    [LeaseStatus.DRAFT, LeaseStatus.TERMINATED],
    [LeaseStatus.DRAFT, LeaseStatus.EXPIRED],
    [LeaseStatus.DRAFT, LeaseStatus.RENEWED],
    [LeaseStatus.PENDING, LeaseStatus.TERMINATED],
    [LeaseStatus.PENDING, LeaseStatus.EXPIRED],
    [LeaseStatus.PENDING, LeaseStatus.RENEWED],
    [LeaseStatus.ACTIVE, LeaseStatus.DRAFT],
    [LeaseStatus.ACTIVE, LeaseStatus.PENDING],
    [LeaseStatus.EXPIRED, LeaseStatus.ACTIVE],
    [LeaseStatus.EXPIRED, LeaseStatus.DRAFT],
    [LeaseStatus.RENEWED, LeaseStatus.ACTIVE],
    [LeaseStatus.RENEWED, LeaseStatus.DRAFT],
    [LeaseStatus.TERMINATED, LeaseStatus.ACTIVE],
    [LeaseStatus.TERMINATED, LeaseStatus.DRAFT],
    [LeaseStatus.TERMINATED, LeaseStatus.PENDING],
  ];

  it.each(invalidPairs)('rejects %s → %s with 422 message', (from, to) => {
    expect(machine.canTransition(from, to)).toBe(false);
    expect(() => machine.assertTransition(from, to)).toThrow(
      UnprocessableEntityException,
    );
    try {
      machine.assertTransition(from, to);
    } catch (e) {
      const err = e as UnprocessableEntityException;
      expect(err.getStatus()).toBe(422);
      expect(err.message).toContain(`'${from}'`);
      expect(err.message).toContain(`'${to}'`);
    }
  });
});
