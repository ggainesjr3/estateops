import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import {
  ACCOUNTING_QUEUE,
  AI_PROCESSING_QUEUE,
  ALL_QUEUE_NAMES,
  EMAIL_QUEUE,
  LEASE_PROCESSING_QUEUE,
  MAINTENANCE_TRIAGE_QUEUE,
  SMS_QUEUE,
  WEBHOOK_QUEUE,
  ZOOM_PROCESSING_QUEUE,
} from '../constants/queue-names';

@Injectable()
export class QueueShutdownService implements OnApplicationShutdown {
  private readonly logger = new Logger(QueueShutdownService.name);

  constructor(
    @InjectQueue(EMAIL_QUEUE) private readonly emailQueue: Queue,
    @InjectQueue(SMS_QUEUE) private readonly smsQueue: Queue,
    @InjectQueue(AI_PROCESSING_QUEUE) private readonly aiQueue: Queue,
    @InjectQueue(LEASE_PROCESSING_QUEUE) private readonly leaseQueue: Queue,
    @InjectQueue(MAINTENANCE_TRIAGE_QUEUE) private readonly maintenanceQueue: Queue,
    @InjectQueue(ACCOUNTING_QUEUE) private readonly accountingQueue: Queue,
    @InjectQueue(WEBHOOK_QUEUE) private readonly webhookQueue: Queue,
    @InjectQueue(ZOOM_PROCESSING_QUEUE) private readonly zoomQueue: Queue,
  ) {}

  async onApplicationShutdown(signal?: string): Promise<void> {
    this.logger.log(`Draining queues (signal=${signal ?? 'unknown'})`);
    const queues: Queue[] = [
      this.emailQueue,
      this.smsQueue,
      this.aiQueue,
      this.leaseQueue,
      this.maintenanceQueue,
      this.accountingQueue,
      this.webhookQueue,
      this.zoomQueue,
    ];

    await Promise.all(
      queues.map(async (queue) => {
        const name = queue.name;
        if (!ALL_QUEUE_NAMES.includes(name as (typeof ALL_QUEUE_NAMES)[number])) {
          return;
        }
        await queue.pause();
        this.logger.log(`Paused queue ${name}`);
      }),
    );

    await Promise.all(queues.map((q) => q.close()));
    this.logger.log('All queues closed');
  }
}
