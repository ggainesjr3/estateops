import { Processor } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { AI_PROCESSING_QUEUE } from '../constants/queue-names';
import { QUEUE_WORKER_SETTINGS } from '../constants/job-options';
import { AiJobHandler } from '../../modules/ai/ai-job.handler';
import { FailedJobService } from '../services/failed-job.service';
import { OrgJobContextService } from '../services/org-job-context.service';
import { QueueMetricsService } from '../services/queue-metrics.service';
import type { AiProcessingJobData } from '../types/ai-jobs';
import { BaseQueueProcessor } from './base-queue.processor';

@Processor(AI_PROCESSING_QUEUE, { settings: QUEUE_WORKER_SETTINGS })
export class AiProcessingProcessor extends BaseQueueProcessor {
  protected readonly queueName = AI_PROCESSING_QUEUE;

  constructor(
    failedJobService: FailedJobService,
    metricsService: QueueMetricsService,
    private readonly aiJobHandler: AiJobHandler,
    private readonly orgJobContext: OrgJobContextService,
  ) {
    super(failedJobService, metricsService);
  }

  async process(job: Job<AiProcessingJobData>): Promise<unknown> {
    const log = this.loggerFor(job);
    const result = await this.orgJobContext.runAsOrg(job.data.orgId, () =>
      this.aiJobHandler.handle(job.data),
    );
    log.log(`AI task ${job.data.task} completed for org ${job.data.orgId}`);
    return result;
  }
}
