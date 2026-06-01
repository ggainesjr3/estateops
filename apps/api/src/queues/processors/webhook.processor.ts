import { Processor } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { WEBHOOK_QUEUE } from '../constants/queue-names';
import { QUEUE_WORKER_SETTINGS } from '../constants/job-options';
import { FailedJobService } from '../services/failed-job.service';
import { QueueMetricsService } from '../services/queue-metrics.service';
import { BaseQueueProcessor } from './base-queue.processor';

export interface WebhookJobData {
  url: string;
  method?: 'POST' | 'PUT';
  headers?: Record<string, string>;
  body: unknown;
  idempotencyKey: string;
}

@Processor(WEBHOOK_QUEUE, { settings: QUEUE_WORKER_SETTINGS })
export class WebhookProcessor extends BaseQueueProcessor {
  protected readonly queueName = WEBHOOK_QUEUE;

  constructor(
    failedJobService: FailedJobService,
    metricsService: QueueMetricsService,
  ) {
    super(failedJobService, metricsService);
  }

  async process(job: Job<WebhookJobData>): Promise<{ status: number }> {
    const log = this.loggerFor(job);
    const response = await fetch(job.data.url, {
      method: job.data.method ?? 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': job.data.idempotencyKey,
        ...job.data.headers,
      },
      body: JSON.stringify(job.data.body),
    });
    if (!response.ok) {
      throw new Error(`Webhook delivery failed (${response.status})`);
    }
    log.log(`Webhook delivered to ${job.data.url} status=${response.status}`);
    return { status: response.status };
  }
}
