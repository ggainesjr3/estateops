import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import type { JobsOptions, Queue } from 'bullmq';
import { DEFAULT_QUEUE_JOB_OPTIONS } from '../constants/job-options';
import {
  ACCOUNTING_QUEUE,
  AI_PROCESSING_QUEUE,
  EMAIL_QUEUE,
  LEASE_PROCESSING_QUEUE,
  MAINTENANCE_TRIAGE_QUEUE,
  SMS_QUEUE,
  NOTIFICATION_DELIVERY_QUEUE,
  WEBHOOK_QUEUE,
  ZOOM_PROCESSING_QUEUE,
} from '../constants/queue-names';
import type { NotificationDeliveryJobData } from '../types/notification-jobs';
import type { AccountingJobPayload } from './accounting-job.handler';
import type { EmailJobData } from '../processors/email.processor';
import type { SmsJobData } from '../processors/sms.processor';
import type { LeaseJobScope } from './lease-processing.handler';
import type {
  MaintenanceSlaAlertJobData,
  MaintenanceTriageInput,
} from '../types/maintenance-jobs';
import type { WebhookJobData } from '../processors/webhook.processor';
import type { AiProcessingJobData } from '../types/ai-jobs';
import { AI_TASK_CLASSIFY_MAINTENANCE } from '../types/ai-jobs';
import type { ClassifyMaintenanceJobInput } from '../types/ai-jobs';
import type { ZoomProcessingJobData } from '../processors/zoom-processing.processor';

@Injectable()
export class QueueProducerService {
  constructor(
    @InjectQueue(EMAIL_QUEUE) private readonly emailQueue: Queue<EmailJobData>,
    @InjectQueue(SMS_QUEUE) private readonly smsQueue: Queue<SmsJobData>,
    @InjectQueue(AI_PROCESSING_QUEUE) private readonly aiQueue: Queue<AiProcessingJobData>,
    @InjectQueue(LEASE_PROCESSING_QUEUE) private readonly leaseQueue: Queue<LeaseJobScope>,
    @InjectQueue(MAINTENANCE_TRIAGE_QUEUE)
    private readonly maintenanceQueue: Queue<
      MaintenanceTriageInput | MaintenanceSlaAlertJobData
    >,
    @InjectQueue(ACCOUNTING_QUEUE) private readonly accountingQueue: Queue<AccountingJobPayload>,
    @InjectQueue(WEBHOOK_QUEUE) private readonly webhookQueue: Queue<WebhookJobData>,
    @InjectQueue(ZOOM_PROCESSING_QUEUE) private readonly zoomQueue: Queue<ZoomProcessingJobData>,
    @InjectQueue(NOTIFICATION_DELIVERY_QUEUE)
    private readonly notificationQueue: Queue<NotificationDeliveryJobData>,
  ) {}

  async enqueueEmail(data: EmailJobData, options?: JobsOptions) {
    return this.emailQueue.add('send', data, this.mergeOptions(options));
  }

  async enqueueSms(data: SmsJobData, options?: JobsOptions) {
    return this.smsQueue.add('send', data, this.mergeOptions(options));
  }

  async enqueueAi(data: AiProcessingJobData, options?: JobsOptions) {
    return this.aiQueue.add(data.task, data, this.mergeOptions(options));
  }

  async enqueueClassifyMaintenance(
    orgId: string,
    input: ClassifyMaintenanceJobInput,
    options?: JobsOptions,
  ) {
    return this.enqueueAi(
      {
        orgId,
        task: AI_TASK_CLASSIFY_MAINTENANCE,
        input,
      },
      options,
    );
  }

  async enqueueLeaseJob(
    name: string,
    data: LeaseJobScope,
    options?: JobsOptions,
  ) {
    return this.leaseQueue.add(name, data, this.mergeOptions(options));
  }

  async scheduleLeaseExpiration(
    leaseId: string,
    orgId: string,
    endDate: string,
    actorUserId?: string,
  ): Promise<void> {
    const runAt = new Date(`${endDate}T23:59:59.999Z`);
    const delay = Math.max(0, runAt.getTime() - Date.now());
    const jobId = `lease-expire-${leaseId}`;
    const existing = await this.leaseQueue.getJob(jobId);
    if (existing) await existing.remove();
    await this.enqueueLeaseJob(
      'expire',
      { orgId, leaseId, actorUserId },
      { jobId, delay, removeOnComplete: true },
    );
  }

  async cancelLeaseExpiration(leaseId: string): Promise<void> {
    const job = await this.leaseQueue.getJob(`lease-expire-${leaseId}`);
    if (job) await job.remove();
  }

  async enqueueMaintenanceTriage(data: MaintenanceTriageInput, options?: JobsOptions) {
    return this.maintenanceQueue.add('triage', data, this.mergeOptions(options));
  }

  async enqueueMaintenanceSlaAlert(
    data: MaintenanceSlaAlertJobData,
    options?: JobsOptions,
  ) {
    return this.maintenanceQueue.add('sla-breach', data, this.mergeOptions(options));
  }

  async cancelMaintenanceSlaAlert(ticketId: string): Promise<void> {
    const job = await this.maintenanceQueue.getJob(`maintenance-sla-${ticketId}`);
    if (job) {
      await job.remove();
    }
  }

  async enqueueAccounting(data: AccountingJobPayload, options?: JobsOptions) {
    return this.accountingQueue.add(data.type, data, this.mergeOptions(options));
  }

  async enqueueAutopay(invoiceId: string, orgId: string, actorUserId: string) {
    const day = new Date().toISOString().slice(0, 10);
    return this.enqueueAccounting(
      {
        type: 'process_autopay',
        orgId,
        actorUserId,
        invoiceId,
        idempotencyKey: `autopay:${invoiceId}:${day}`,
      },
      { jobId: `autopay-${invoiceId}-${day}`, removeOnComplete: true },
    );
  }

  async enqueueWebhook(data: WebhookJobData, options?: JobsOptions) {
    return this.webhookQueue.add('deliver', data, this.mergeOptions(options));
  }

  async enqueueZoom(data: ZoomProcessingJobData, options?: JobsOptions) {
    return this.zoomQueue.add('process', data, this.mergeOptions(options));
  }

  async enqueueNotificationDelivery(
    data: NotificationDeliveryJobData,
    options?: JobsOptions,
  ) {
    return this.notificationQueue.add('deliver', data, {
      ...this.mergeOptions(options),
      jobId: `notification-${data.notificationId}`,
    });
  }

  private mergeOptions(options?: JobsOptions): JobsOptions {
    return { ...DEFAULT_QUEUE_JOB_OPTIONS, ...options };
  }
}
