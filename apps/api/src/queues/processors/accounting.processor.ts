import { Processor } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { ACCOUNTING_QUEUE } from '../constants/queue-names';
import { QUEUE_WORKER_SETTINGS } from '../constants/job-options';
import {
  AccountingJobHandler,
  type AccountingJobPayload,
} from '../services/accounting-job.handler';
import { SCHEDULER_ORG_SENTINEL, SchedulerService } from '../services/scheduler.service';
import { FailedJobService } from '../services/failed-job.service';
import { QueueMetricsService } from '../services/queue-metrics.service';
import { BaseQueueProcessor } from './base-queue.processor';

@Processor(ACCOUNTING_QUEUE, { settings: QUEUE_WORKER_SETTINGS })
export class AccountingProcessor extends BaseQueueProcessor {
  protected readonly queueName = ACCOUNTING_QUEUE;

  constructor(
    failedJobService: FailedJobService,
    metricsService: QueueMetricsService,
    private readonly handler: AccountingJobHandler,
    private readonly scheduler: SchedulerService,
  ) {
    super(failedJobService, metricsService);
  }

  async process(job: Job<AccountingJobPayload>): Promise<void> {
    if (job.data.orgId === SCHEDULER_ORG_SENTINEL && job.data.type === 'process_autopay') {
      await this.scheduler.dispatchAutopay();
      return;
    }

    const log = this.loggerFor(job);
    const idempotencyKey = job.data.idempotencyKey ?? `accounting:${job.id}`;
    await this.handler.handle({ ...job.data, idempotencyKey });
    log.log(`Accounting job ${job.data.type} completed for org ${job.data.orgId}`);
  }
}
