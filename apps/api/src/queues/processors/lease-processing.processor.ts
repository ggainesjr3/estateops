import { Processor } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { LEASE_PROCESSING_QUEUE } from '../constants/queue-names';
import { QUEUE_WORKER_SETTINGS } from '../constants/job-options';
import {
  LeaseProcessingHandler,
  type LeaseJobScope,
} from '../services/lease-processing.handler';
import { SCHEDULER_ORG_SENTINEL, SchedulerService } from '../services/scheduler.service';
import { FailedJobService } from '../services/failed-job.service';
import { QueueMetricsService } from '../services/queue-metrics.service';
import { BaseQueueProcessor } from './base-queue.processor';

export type LeaseProcessingJobName =
  | 'lease-expiry-check'
  | 'rent-invoice-generation'
  | 'late-fee-check'
  | 'renewal-reminders'
  | 'expire';

@Processor(LEASE_PROCESSING_QUEUE, { settings: QUEUE_WORKER_SETTINGS })
export class LeaseProcessingProcessor extends BaseQueueProcessor {
  protected readonly queueName = LEASE_PROCESSING_QUEUE;

  constructor(
    failedJobService: FailedJobService,
    metricsService: QueueMetricsService,
    private readonly handler: LeaseProcessingHandler,
    private readonly scheduler: SchedulerService,
  ) {
    super(failedJobService, metricsService);
  }

  async process(job: Job<LeaseJobScope>): Promise<number> {
    const log = this.loggerFor(job);
    const name = job.name as LeaseProcessingJobName;

    if (job.data.orgId === SCHEDULER_ORG_SENTINEL) {
      if (name === 'lease-expiry-check' || name === 'rent-invoice-generation' || name === 'late-fee-check') {
        await this.scheduler.dispatchLeaseJob(name);
      }
      return 0;
    }

    let result = 0;
    switch (name) {
      case 'lease-expiry-check':
      case 'expire':
        result = await this.handler.runExpiryCheck(job.data);
        break;
      case 'rent-invoice-generation':
        result = await this.handler.runRentInvoiceGeneration(job.data);
        break;
      case 'late-fee-check':
        result = await this.handler.runLateFeeCheck(job.data);
        break;
      case 'renewal-reminders':
        result = await this.handler.runRenewalReminders(job.data);
        break;
      default:
        throw new Error(`Unknown lease job: ${name}`);
    }
    log.log(`Lease job ${name} processed count=${result}`);
    return result;
  }
}
