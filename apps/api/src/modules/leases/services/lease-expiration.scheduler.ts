import { Injectable } from '@nestjs/common';
import { QueueProducerService } from '../../../queues/services/queue-producer.service';

@Injectable()
export class LeaseExpirationScheduler {
  constructor(private readonly queueProducer: QueueProducerService) {}

  async scheduleExpiration(
    leaseId: string,
    orgId: string,
    endDate: string,
  ): Promise<void> {
    await this.queueProducer.scheduleLeaseExpiration(leaseId, orgId, endDate);
  }

  async cancelExpiration(leaseId: string): Promise<void> {
    await this.queueProducer.cancelLeaseExpiration(leaseId);
  }
}
