import { Injectable } from '@nestjs/common';
import { MaintenanceTicketStatus } from '@estateops/shared';
import { QueueProducerService } from '../../../queues/services/queue-producer.service';
import type { MaintenanceSlaAlertJobData } from '../../../queues/types/maintenance-jobs';
import { slaDelayMs } from '../utils/maintenance-sla.util';

const PROGRESS_STATUSES: MaintenanceTicketStatus[] = [
  MaintenanceTicketStatus.IN_PROGRESS,
  MaintenanceTicketStatus.COMPLETED,
  MaintenanceTicketStatus.INVOICED,
  MaintenanceTicketStatus.CLOSED,
];

@Injectable()
export class MaintenanceSlaSchedulerService {
  constructor(private readonly queueProducer: QueueProducerService) {}

  slaJobId(ticketId: string): string {
    return `maintenance-sla-${ticketId}`;
  }

  async scheduleSlaAlert(params: {
    orgId: string;
    ticketId: string;
    slaDueAt: Date;
    notifyEmail?: string;
    ticketTitle?: string;
  }): Promise<void> {
    await this.cancelSlaAlert(params.ticketId);
    const delay = slaDelayMs(params.slaDueAt);
    await this.queueProducer.enqueueMaintenanceSlaAlert(
      {
        orgId: params.orgId,
        ticketId: params.ticketId,
        slaDueAt: params.slaDueAt.toISOString(),
        notifyEmail: params.notifyEmail,
        ticketTitle: params.ticketTitle,
      },
      {
        jobId: this.slaJobId(params.ticketId),
        delay,
        removeOnComplete: true,
      },
    );
  }

  async cancelSlaAlert(ticketId: string): Promise<void> {
    await this.queueProducer.cancelMaintenanceSlaAlert(ticketId);
  }

  isProgressStatus(status: MaintenanceTicketStatus): boolean {
    return PROGRESS_STATUSES.includes(status);
  }
}
