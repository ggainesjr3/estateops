import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Queue } from 'bullmq';
import { Repository } from 'typeorm';
import { DEFAULT_QUEUE_JOB_OPTIONS } from '../constants/job-options';
import { ACCOUNTING_QUEUE, LEASE_PROCESSING_QUEUE } from '../constants/queue-names';
import { Organization } from '../../modules/organizations/entities/organization.entity';
import type { AccountingJobPayload } from './accounting-job.handler';
import type { LeaseJobScope } from './lease-processing.handler';
import { OrgJobContextService } from './org-job-context.service';
import { QueueProducerService } from './queue-producer.service';

export const SCHEDULER_ORG_SENTINEL = '__scheduler__';

export type ScheduledLeaseJob =
  | 'lease-expiry-check'
  | 'rent-invoice-generation'
  | 'late-fee-check';

@Injectable()
export class SchedulerService implements OnModuleInit {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private readonly queueProducer: QueueProducerService,
    private readonly orgJobContext: OrgJobContextService,
    @InjectRepository(Organization)
    private readonly organizations: Repository<Organization>,
    @InjectQueue(LEASE_PROCESSING_QUEUE)
    private readonly leaseQueue: Queue<LeaseJobScope>,
    @InjectQueue(ACCOUNTING_QUEUE)
    private readonly accountingQueue: Queue<AccountingJobPayload>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.registerRecurringJobs();
  }

  async registerRecurringJobs(): Promise<void> {
    const repeatOpts = { ...DEFAULT_QUEUE_JOB_OPTIONS, removeOnComplete: true };

    await this.leaseQueue.add(
      'lease-expiry-check',
      { orgId: SCHEDULER_ORG_SENTINEL },
      { ...repeatOpts, repeat: { pattern: '0 1 * * *' }, jobId: 'repeat-lease-expiry-check' },
    );

    await this.leaseQueue.add(
      'rent-invoice-generation',
      { orgId: SCHEDULER_ORG_SENTINEL },
      { ...repeatOpts, repeat: { pattern: '0 0 25 * *' }, jobId: 'repeat-rent-invoice-generation' },
    );

    await this.leaseQueue.add(
      'late-fee-check',
      { orgId: SCHEDULER_ORG_SENTINEL },
      { ...repeatOpts, repeat: { pattern: '0 9 * * *' }, jobId: 'repeat-late-fee-check' },
    );

    await this.accountingQueue.add(
      'process-autopay',
      {
        type: 'process_autopay',
        orgId: SCHEDULER_ORG_SENTINEL,
        idempotencyKey: 'repeat-process-autopay',
      },
      { ...repeatOpts, repeat: { pattern: '0 9 * * *' }, jobId: 'repeat-process-autopay' },
    );

    this.logger.log('Registered recurring queue jobs');
  }

  async dispatchLeaseJob(jobName: ScheduledLeaseJob): Promise<void> {
    const orgs = await this.organizations.find({ where: { isActive: true } });
    for (const org of orgs) {
      const actor = await this.orgJobContext.resolveActor(org.id);
      await this.queueProducer.enqueueLeaseJob(jobName, {
        orgId: org.id,
        actorUserId: actor.userId,
      });
    }
    this.logger.log(`Dispatched ${jobName} for ${orgs.length} organizations`);
  }

  async dispatchAutopay(): Promise<void> {
    const orgs = await this.organizations.find({ where: { isActive: true } });
    const day = new Date().toISOString().slice(0, 10);
    for (const org of orgs) {
      const actor = await this.orgJobContext.resolveActor(org.id);
      await this.queueProducer.enqueueAccounting({
        type: 'process_autopay',
        orgId: org.id,
        actorUserId: actor.userId,
        idempotencyKey: `scheduled-autopay:${org.id}:${day}`,
      });
    }
    this.logger.log(`Dispatched autopay for ${orgs.length} organizations`);
  }
}
