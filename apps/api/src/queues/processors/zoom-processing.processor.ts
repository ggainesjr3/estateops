import { Inject, forwardRef } from '@nestjs/common';
import { Processor } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { ZOOM_PROCESSING_QUEUE } from '../constants/queue-names';
import { QUEUE_WORKER_SETTINGS } from '../constants/job-options';
import { ZoomProcessingHandler } from '../../modules/zoom/services/zoom-processing.handler';
import { FailedJobService } from '../services/failed-job.service';
import { OrgJobContextService } from '../services/org-job-context.service';
import { QueueMetricsService } from '../services/queue-metrics.service';
import { BaseQueueProcessor } from './base-queue.processor';

export interface ZoomProcessingJobData {
  orgId: string;
  archiveId: string;
  /** @deprecated use archiveId */
  meetingId?: string;
}

@Processor(ZOOM_PROCESSING_QUEUE, { settings: QUEUE_WORKER_SETTINGS })
export class ZoomProcessingProcessor extends BaseQueueProcessor {
  protected readonly queueName = ZOOM_PROCESSING_QUEUE;

  constructor(
    failedJobService: FailedJobService,
    metricsService: QueueMetricsService,
    private readonly orgJobContext: OrgJobContextService,
    @Inject(forwardRef(() => ZoomProcessingHandler))
    private readonly handler: ZoomProcessingHandler,
  ) {
    super(failedJobService, metricsService);
  }

  async process(job: Job<ZoomProcessingJobData>): Promise<{ status: string }> {
    const log = this.loggerFor(job);
    const archiveId = job.data.archiveId ?? job.data.meetingId;
    if (!archiveId) {
      throw new Error('Zoom job missing archiveId');
    }

    await this.orgJobContext.runAsOrg(job.data.orgId, async () => {
      await this.handler.process(job.data.orgId, archiveId);
    });

    log.log(`Zoom archive ${archiveId} processed for org ${job.data.orgId}`);
    return { status: 'processed' };
  }
}
