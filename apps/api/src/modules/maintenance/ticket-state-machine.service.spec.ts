import { UnprocessableEntityException } from '@nestjs/common';
import { MaintenanceTicketStatus } from '@estateops/shared';
import { TicketStateMachineService } from './ticket-state-machine.service';

describe('TicketStateMachineService', () => {
  let machine: TicketStateMachineService;

  beforeEach(() => {
    machine = new TicketStateMachineService();
  });

  const validPairs: [MaintenanceTicketStatus, MaintenanceTicketStatus][] = [
    [MaintenanceTicketStatus.CREATED, MaintenanceTicketStatus.TRIAGED],
    [MaintenanceTicketStatus.TRIAGED, MaintenanceTicketStatus.ASSIGNED],
    [MaintenanceTicketStatus.ASSIGNED, MaintenanceTicketStatus.DISPATCHED],
    [MaintenanceTicketStatus.DISPATCHED, MaintenanceTicketStatus.IN_PROGRESS],
    [MaintenanceTicketStatus.IN_PROGRESS, MaintenanceTicketStatus.COMPLETED],
    [MaintenanceTicketStatus.COMPLETED, MaintenanceTicketStatus.INVOICED],
    [MaintenanceTicketStatus.INVOICED, MaintenanceTicketStatus.CLOSED],
    [MaintenanceTicketStatus.TRIAGED, MaintenanceTicketStatus.CREATED],
    [MaintenanceTicketStatus.ASSIGNED, MaintenanceTicketStatus.CREATED],
    [MaintenanceTicketStatus.DISPATCHED, MaintenanceTicketStatus.CREATED],
    [MaintenanceTicketStatus.IN_PROGRESS, MaintenanceTicketStatus.CREATED],
    [MaintenanceTicketStatus.COMPLETED, MaintenanceTicketStatus.CREATED],
    [MaintenanceTicketStatus.INVOICED, MaintenanceTicketStatus.CREATED],
    [MaintenanceTicketStatus.CLOSED, MaintenanceTicketStatus.CREATED],
  ];

  it.each(validPairs)('allows %s → %s', (from, to) => {
    expect(machine.canTransition(from, to)).toBe(true);
    expect(() => machine.assertTransition(from, to)).not.toThrow();
  });

  const allStatuses = Object.values(MaintenanceTicketStatus);
  const validSet = new Set(validPairs.map(([a, b]) => `${a}->${b}`));

  const invalidPairs: [MaintenanceTicketStatus, MaintenanceTicketStatus][] = [];
  for (const from of allStatuses) {
    for (const to of allStatuses) {
      if (from === to) {
        invalidPairs.push([from, to]);
        continue;
      }
      if (!validSet.has(`${from}->${to}`)) {
        invalidPairs.push([from, to]);
      }
    }
  }

  it.each(invalidPairs)('rejects %s → %s with 422', (from, to) => {
    expect(machine.canTransition(from, to)).toBe(false);
    expect(() => machine.assertTransition(from, to)).toThrow(UnprocessableEntityException);
    try {
      machine.assertTransition(from, to);
    } catch (e) {
      const err = e as UnprocessableEntityException;
      expect(err.getStatus()).toBe(422);
      expect(err.message).toContain(`'${from}'`);
      expect(err.message).toContain(`'${to}'`);
    }
  });

  it('requires reopen note flag for non-created → created', () => {
    expect(
      machine.requiresReopenNote(
        MaintenanceTicketStatus.CLOSED,
        MaintenanceTicketStatus.CREATED,
      ),
    ).toBe(true);
    expect(
      machine.requiresReopenNote(
        MaintenanceTicketStatus.CREATED,
        MaintenanceTicketStatus.TRIAGED,
      ),
    ).toBe(false);
  });
});
