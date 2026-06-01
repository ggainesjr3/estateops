import { Inject, forwardRef } from '@nestjs/common';
import { Processor } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { NOTIFICATION_DELIVERY_QUEUE } from '../constants/queue-names';
import { QUEUE_WORKER_SETTINGS } from '../constants/job-options';
import { FailedJobService } from '../services/failed-job.service';
import { QueueMetricsService } from '../services/queue-metrics.service';
import { OrgJobContextService } from '../services/org-job-context.service';
import { NotificationChannelDispatcherService } from '../../modules/notifications/services/notification-channel-dispatcher.service';
import { BaseQueueProcessor } from './base-queue.processor';
import type { NotificationDeliveryJobData } from '../types/notification-jobs';

@Processor(NOTIFICATION_DELIVERY_QUEUE, { settings: QUEUE_WORKER_SETTINGS })
export class NotificationDeliveryProcessor extends BaseQueueProcessor {
  protected readonly queueName = NOTIFICATION_DELIVERY_QUEUE;

  constructor(
    failedJobService: FailedJobService,
    metricsService: QueueMetricsService,
    private readonly orgJobContext: OrgJobContextService,
    @Inject(forwardRef(() => NotificationChannelDispatcherService))
    private readonly dispatcher: NotificationChannelDispatcherService,
  ) {
    super(failedJobService, metricsService);
  }

  async process(job: Job<NotificationDeliveryJobData>): Promise<{ ok: boolean }> {
    const log = this.loggerFor(job);
    await this.orgJobContext.runAsOrg(job.data.orgId, async () => {
      await this.dispatcher.deliver(job.data.notificationId, job.data.channel);
    });
    log.log(`Notification ${job.data.notificationId} delivered via ${job.data.channel}`);
    return { ok: true };
  }
}
