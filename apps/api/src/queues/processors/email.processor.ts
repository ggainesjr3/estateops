import { Processor } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { EMAIL_QUEUE } from '../constants/queue-names';
import { QUEUE_WORKER_SETTINGS } from '../constants/job-options';
import { EmailDeliveryService } from '../services/email-delivery.service';
import { FailedJobService } from '../services/failed-job.service';
import { QueueMetricsService } from '../services/queue-metrics.service';
import { BaseQueueProcessor } from './base-queue.processor';

export interface EmailJobData {
  to: string;
  subject: string;
  templateId: string;
  variables: Record<string, string>;
}

@Processor(EMAIL_QUEUE, { settings: QUEUE_WORKER_SETTINGS })
export class EmailProcessor extends BaseQueueProcessor {
  protected readonly queueName = EMAIL_QUEUE;

  constructor(
    failedJobService: FailedJobService,
    metricsService: QueueMetricsService,
    private readonly emailDelivery: EmailDeliveryService,
  ) {
    super(failedJobService, metricsService);
  }

  async process(job: Job<EmailJobData>): Promise<EmailJobData & { delivery: unknown }> {
    const log = this.loggerFor(job);
    const delivery = await this.emailDelivery.send(job.data);
    log.log(`Delivered email to ${job.data.to} via ${delivery.provider} id=${delivery.messageId}`);
    return { ...job.data, delivery };
  }
}
