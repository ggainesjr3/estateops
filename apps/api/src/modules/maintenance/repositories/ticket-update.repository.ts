import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MaintenanceTicketStatus } from '@estateops/shared';
import { TenantContext } from '../../../tenant/tenant.context';
import { TicketUpdate } from '../entities/ticket-update.entity';

@Injectable()
export class TicketUpdateRepository {
  constructor(
    @InjectRepository(TicketUpdate)
    private readonly repository: Repository<TicketUpdate>,
  ) {}

  async logStatusChange(params: {
    ticketId: string;
    statusFrom: MaintenanceTicketStatus | null;
    statusTo: MaintenanceTicketStatus;
    note?: string | null;
  }): Promise<TicketUpdate> {
    const row = this.repository.create({
      orgId: TenantContext.getOrgId(),
      ticketId: params.ticketId,
      statusFrom: params.statusFrom,
      statusTo: params.statusTo,
      note: params.note ?? null,
      updatedByUserId: TenantContext.getUserId(),
    });
    return this.repository.save(row);
  }

  async findByTicketId(ticketId: string): Promise<TicketUpdate[]> {
    return this.repository.find({
      where: { ticketId, orgId: TenantContext.getOrgId() },
      order: { createdAt: 'DESC' },
    });
  }
}
