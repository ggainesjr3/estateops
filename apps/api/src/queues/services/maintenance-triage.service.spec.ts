jest.mock('typeorm', () => ({ Repository: class Repository {} }));
jest.mock('@nestjs/typeorm', () => ({ InjectRepository: () => () => undefined }));
jest.mock('../../modules/maintenance/entities/maintenance-ticket.entity', () => ({
  MaintenanceTicket: class MaintenanceTicket {},
}));
jest.mock('../../modules/maintenance/entities/ticket-update.entity', () => ({
  TicketUpdate: class TicketUpdate {},
}));
jest.mock('../../modules/maintenance/ticket-state-machine.service', () => ({
  TicketStateMachineService: class TicketStateMachineService {
    assertTransition = jest.fn();
  },
}));

import { MaintenanceTicketPriority, MaintenanceTrade } from '@estateops/shared';
import { MaintenanceTriageService } from './maintenance-triage.service';
import { TicketStateMachineService } from '../../modules/maintenance/ticket-state-machine.service';

describe('MaintenanceTriageService (maintenance-triage processor)', () => {
  it('classifies plumbing leak as high priority', async () => {
    const tickets = {
      findOne: jest.fn().mockResolvedValue({ status: 'created' }),
      update: jest.fn().mockResolvedValue(undefined),
    };
    const updates = {
      create: jest.fn((x) => x),
      save: jest.fn().mockResolvedValue(undefined),
    };
    const service = new MaintenanceTriageService(
      tickets as never,
      updates as never,
      new TicketStateMachineService(),
    );

    const result = await service.classify({
      orgId: 'org-1',
      ticketId: 'ticket-1',
      title: 'Leaking pipe under sink',
      description: 'Water pooling in cabinet',
    });

    expect(result.trade).toBe(MaintenanceTrade.PLUMBING);
    expect(result.priority).toBe(MaintenanceTicketPriority.HIGH);
    expect(tickets.update).toHaveBeenCalled();
  });
});
