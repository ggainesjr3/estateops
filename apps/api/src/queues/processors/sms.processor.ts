import { Processor } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { SMS_QUEUE } from '../constants/queue-names';
import { QUEUE_WORKER_SETTINGS } from '../constants/job-options';
import { FailedJobService } from '../services/failed-job.service';
import { OrgJobContextService } from '../services/org-job-context.service';
import { QueueMetricsService } from '../services/queue-metrics.service';
import { SmsDeliveryService } from '../services/sms-delivery.service';
import { BaseQueueProcessor } from './base-queue.processor';

export interface SmsJobData {
  to: string;
  message: string;
  tenantId: string;
  orgId: string;
  actorUserId?: string;
}

@Processor(SMS_QUEUE, { settings: QUEUE_WORKER_SETTINGS })
export class SmsProcessor extends BaseQueueProcessor {
  protected readonly queueName = SMS_QUEUE;

  constructor(
    failedJobService: FailedJobService,
    metricsService: QueueMetricsService,
    private readonly smsDelivery: SmsDeliveryService,
    private readonly orgJobContext: OrgJobContextService,
  ) {
    super(failedJobService, metricsService);
  }

  async process(job: Job<SmsJobData>): Promise<{ sid: string; communicationId: string }> {
    const log = this.loggerFor(job);
    return this.orgJobContext.runAsOrg(
      job.data.orgId,
      async () => {
        const actor = await this.orgJobContext.resolveActor(job.data.orgId, job.data.actorUserId);
        const result = await this.smsDelivery.send({
          to: job.data.to,
          message: job.data.message,
          tenantId: job.data.tenantId,
          orgId: job.data.orgId,
          sentByUserId: actor.userId,
        });
        log.log(`SMS sent to ${job.data.to} communicationId=${result.communicationId}`);
        return result;
      },
      job.data.actorUserId,
    );
  }
}
