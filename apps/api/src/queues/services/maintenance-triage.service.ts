import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  MaintenanceTicketPriority,
  MaintenanceTicketStatus,
  MaintenanceTrade,
} from '@estateops/shared';
import { MaintenanceTicket } from '../../modules/maintenance/entities/maintenance-ticket.entity';
import { TicketUpdate } from '../../modules/maintenance/entities/ticket-update.entity';
import { TicketStateMachineService } from '../../modules/maintenance/ticket-state-machine.service';
import type { MaintenanceTriageInput } from '../types/maintenance-jobs';

export interface MaintenanceTriageResult {
  priority: MaintenanceTicketPriority;
  trade: MaintenanceTrade;
  aiClassification: Record<string, unknown>;
  status: MaintenanceTicketStatus;
}

@Injectable()
export class MaintenanceTriageService {
  private readonly logger = new Logger(MaintenanceTriageService.name);

  constructor(
    @InjectRepository(MaintenanceTicket)
    private readonly tickets: Repository<MaintenanceTicket>,
    @InjectRepository(TicketUpdate)
    private readonly updates: Repository<TicketUpdate>,
    private readonly stateMachine: TicketStateMachineService,
  ) {}

  async classify(input: MaintenanceTriageInput): Promise<MaintenanceTriageResult> {
    const text = `${input.title} ${input.description ?? ''}`.toLowerCase();
    const result = this.ruleBasedClassification(text);
    const aiClassification = {
      source: 'rule_based',
      priority: result.priority,
      trade: result.trade,
      classifiedAt: new Date().toISOString(),
    };

    const ticket = await this.tickets.findOne({
      where: { id: input.ticketId, orgId: input.orgId },
    });
    if (!ticket) {
      throw new Error(`Ticket ${input.ticketId} not found for org ${input.orgId}`);
    }

    await this.tickets.update(
      { id: input.ticketId, orgId: input.orgId },
      {
        priority: result.priority,
        trade: result.trade,
        aiClassification,
      },
    );

    let status = ticket.status;
    if (ticket.status === MaintenanceTicketStatus.CREATED) {
      this.stateMachine.assertTransition(
        MaintenanceTicketStatus.CREATED,
        MaintenanceTicketStatus.TRIAGED,
      );
      await this.tickets.update(
        { id: input.ticketId, orgId: input.orgId },
        { status: MaintenanceTicketStatus.TRIAGED },
      );
      await this.updates.save(
        this.updates.create({
          orgId: input.orgId,
          ticketId: input.ticketId,
          statusFrom: MaintenanceTicketStatus.CREATED,
          statusTo: MaintenanceTicketStatus.TRIAGED,
          note: 'AI triage completed',
          updatedByUserId: input.actorUserId ?? null,
        }),
      );
      status = MaintenanceTicketStatus.TRIAGED;
    }

    this.logger.log(
      `Triage ticket ${input.ticketId}: priority=${result.priority} trade=${result.trade} status=${status}`,
    );
    return { ...result, aiClassification, status };
  }

  private ruleBasedClassification(text: string): {
    priority: MaintenanceTicketPriority;
    trade: MaintenanceTrade;
  } {
    if (/flood|fire|gas leak|no heat|emergency/.test(text)) {
      return { priority: MaintenanceTicketPriority.CRITICAL, trade: MaintenanceTrade.GENERAL };
    }
    if (/pest|roach|rodent|bedbug/.test(text)) {
      return { priority: MaintenanceTicketPriority.MEDIUM, trade: MaintenanceTrade.PEST_CONTROL };
    }
    if (/clean|trash|janitor/.test(text)) {
      return { priority: MaintenanceTicketPriority.LOW, trade: MaintenanceTrade.CLEANING };
    }
    if (/electrical|outlet|breaker|power/.test(text)) {
      return {
        priority: MaintenanceTicketPriority.HIGH,
        trade: MaintenanceTrade.ELECTRICAL,
      };
    }
    if (/plumb|leak|toilet|sink|pipe|water heater/.test(text)) {
      return { priority: MaintenanceTicketPriority.HIGH, trade: MaintenanceTrade.PLUMBING };
    }
    if (/hvac|ac |air condition|furnace|heat/.test(text)) {
      return { priority: MaintenanceTicketPriority.MEDIUM, trade: MaintenanceTrade.HVAC };
    }
    if (/appliance|dishwasher|oven|fridge|dryer|washer/.test(text)) {
      return { priority: MaintenanceTicketPriority.MEDIUM, trade: MaintenanceTrade.APPLIANCE };
    }
    return { priority: MaintenanceTicketPriority.MEDIUM, trade: MaintenanceTrade.GENERAL };
  }
}
