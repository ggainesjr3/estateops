import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantContext } from '../../../tenant/tenant.context';
import { TicketAttachment } from '../entities/ticket-attachment.entity';

@Injectable()
export class TicketAttachmentRepository {
  constructor(
    @InjectRepository(TicketAttachment)
    private readonly repository: Repository<TicketAttachment>,
  ) {}

  async createForTicket(
    ticketId: string,
    data: Omit<TicketAttachment, 'id' | 'orgId' | 'ticketId' | 'createdAt' | 'ticket' | 'organization' | 'uploader'>,
  ): Promise<TicketAttachment> {
    const row = this.repository.create({
      ...data,
      orgId: TenantContext.getOrgId(),
      ticketId,
      uploadedBy: data.uploadedBy ?? TenantContext.getUserId(),
    });
    return this.repository.save(row);
  }

  async findByTicketId(ticketId: string): Promise<TicketAttachment[]> {
    return this.repository.find({
      where: { ticketId, orgId: TenantContext.getOrgId() },
      order: { createdAt: 'DESC' },
    });
  }
}
