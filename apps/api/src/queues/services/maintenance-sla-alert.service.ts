import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { MaintenanceTicketStatus } from '@estateops/shared';
import { MaintenanceTicket } from '../../modules/maintenance/entities/maintenance-ticket.entity';
import { QueueProducerService } from './queue-producer.service';
import type { MaintenanceSlaAlertJobData } from '../types/maintenance-jobs';

const PROGRESS_STATUSES = new Set<MaintenanceTicketStatus>([
  MaintenanceTicketStatus.IN_PROGRESS,
  MaintenanceTicketStatus.COMPLETED,
  MaintenanceTicketStatus.INVOICED,
  MaintenanceTicketStatus.CLOSED,
]);

@Injectable()
export class MaintenanceSlaAlertService {
  private readonly logger = new Logger(MaintenanceSlaAlertService.name);

  constructor(
    @InjectRepository(MaintenanceTicket)
    private readonly tickets: Repository<MaintenanceTicket>,
    private readonly queueProducer: QueueProducerService,
  ) {}

  async processAlert(data: MaintenanceSlaAlertJobData): Promise<{ sent: boolean; reason?: string }> {
    const ticket = await this.tickets.findOne({
      where: { id: data.ticketId, orgId: data.orgId, deletedAt: IsNull() },
    });
    if (!ticket) {
      return { sent: false, reason: 'ticket_not_found' };
    }
    if (PROGRESS_STATUSES.has(ticket.status)) {
      return { sent: false, reason: 'already_in_progress' };
    }
    if (ticket.slaDueAt && new Date() < ticket.slaDueAt) {
      return { sent: false, reason: 'sla_not_due' };
    }

    const to = data.notifyEmail ?? process.env.MAINTENANCE_ALERT_EMAIL ?? 'ops@estateops.local';
    await this.queueProducer.enqueueEmail({
      to,
      subject: `SLA breach: ${data.ticketTitle ?? ticket.title}`,
      templateId: 'maintenance-sla-breach',
      variables: {
        ticketId: ticket.id,
        title: ticket.title,
        status: ticket.status,
        priority: ticket.priority,
        slaDueAt: ticket.slaDueAt?.toISOString() ?? data.slaDueAt,
      },
    });

    this.logger.warn(`SLA breach alert sent for ticket ${ticket.id} (org ${data.orgId})`);
    return { sent: true };
  }
}
