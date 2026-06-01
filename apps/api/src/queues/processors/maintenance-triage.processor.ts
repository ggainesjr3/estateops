import { Processor } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { MAINTENANCE_TRIAGE_QUEUE } from '../constants/queue-names';
import { QUEUE_WORKER_SETTINGS } from '../constants/job-options';
import { FailedJobService } from '../services/failed-job.service';
import {
  MaintenanceTriageService,
} from '../services/maintenance-triage.service';
import { MaintenanceSlaAlertService } from '../services/maintenance-sla-alert.service';
import { OrgJobContextService } from '../services/org-job-context.service';
import { QueueMetricsService } from '../services/queue-metrics.service';
import type {
  MaintenanceSlaAlertJobData,
  MaintenanceTriageInput,
} from '../types/maintenance-jobs';
import { BaseQueueProcessor } from './base-queue.processor';

@Processor(MAINTENANCE_TRIAGE_QUEUE, { settings: QUEUE_WORKER_SETTINGS })
export class MaintenanceTriageProcessor extends BaseQueueProcessor {
  protected readonly queueName = MAINTENANCE_TRIAGE_QUEUE;

  constructor(
    failedJobService: FailedJobService,
    metricsService: QueueMetricsService,
    private readonly triageService: MaintenanceTriageService,
    private readonly slaAlertService: MaintenanceSlaAlertService,
    private readonly orgJobContext: OrgJobContextService,
  ) {
    super(failedJobService, metricsService);
  }

  async process(
    job: Job<MaintenanceTriageInput | MaintenanceSlaAlertJobData>,
  ): Promise<unknown> {
    const log = this.loggerFor(job);

    if (job.name === 'sla-breach') {
      const data = job.data as MaintenanceSlaAlertJobData;
      const result = await this.orgJobContext.runAsOrg(data.orgId, () =>
        this.slaAlertService.processAlert(data),
      );
      log.log(`SLA alert ticket ${data.ticketId}: sent=${result.sent}`);
      return result;
    }

    const data = job.data as MaintenanceTriageInput;
    const result = await this.orgJobContext.runAsOrg(
      data.orgId,
      () => this.triageService.classify(data),
      data.actorUserId,
    );
    log.log(`Triaged ticket ${data.ticketId}`);
    return result;
  }
}
