import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Job, Queue } from 'bullmq';
import {
  Counter,
  Gauge,
  Histogram,
  Registry,
  collectDefaultMetrics,
} from 'prom-client';
import {
  ACCOUNTING_QUEUE,
  AI_PROCESSING_QUEUE,
  ALL_QUEUE_NAMES,
  EMAIL_QUEUE,
  LEASE_PROCESSING_QUEUE,
  MAINTENANCE_TRIAGE_QUEUE,
  SMS_QUEUE,
  WEBHOOK_QUEUE,
  ZOOM_PROCESSING_QUEUE,
} from '../constants/queue-names';

@Injectable()
export class QueueMetricsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueueMetricsService.name);
  readonly registry = new Registry();
  private readonly depthGauge: Gauge;
  private readonly durationHistogram: Histogram;
  private readonly failedCounter: Counter;
  private readonly completedCounter: Counter;
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    @InjectQueue(EMAIL_QUEUE) private readonly emailQueue: Queue,
    @InjectQueue(SMS_QUEUE) private readonly smsQueue: Queue,
    @InjectQueue(AI_PROCESSING_QUEUE) private readonly aiQueue: Queue,
    @InjectQueue(LEASE_PROCESSING_QUEUE) private readonly leaseQueue: Queue,
    @InjectQueue(MAINTENANCE_TRIAGE_QUEUE) private readonly maintenanceQueue: Queue,
    @InjectQueue(ACCOUNTING_QUEUE) private readonly accountingQueue: Queue,
    @InjectQueue(WEBHOOK_QUEUE) private readonly webhookQueue: Queue,
    @InjectQueue(ZOOM_PROCESSING_QUEUE) private readonly zoomQueue: Queue,
  ) {
    collectDefaultMetrics({ register: this.registry });

    this.durationHistogram = new Histogram({
      name: 'queue_job_duration_seconds',
      help: 'Job processing duration in seconds',
      labelNames: ['queue', 'job_name', 'status'] as const,
      buckets: [0.05, 0.1, 0.5, 1, 2, 5, 15, 30, 60],
      registers: [this.registry],
    });

    this.failedCounter = new Counter({
      name: 'queue_jobs_failed_total',
      help: 'Total failed jobs',
      labelNames: ['queue', 'job_name'] as const,
      registers: [this.registry],
    });

    this.completedCounter = new Counter({
      name: 'queue_jobs_completed_total',
      help: 'Total completed jobs',
      labelNames: ['queue', 'job_name'] as const,
      registers: [this.registry],
    });

    this.depthGauge = new Gauge({
      name: 'queue_depth',
      help: 'Job counts by queue and state',
      labelNames: ['queue', 'state'] as const,
      registers: [this.registry],
    });
  }

  onModuleInit(): void {
    this.pollTimer = setInterval(() => void this.pollDepths(), 15_000);
    void this.pollDepths();
  }

  onModuleDestroy(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
    }
  }

  recordCompleted(queueName: string, job: Job, startedAt: number): void {
    const durationSec = (Date.now() - startedAt) / 1000;
    this.durationHistogram.observe(
      { queue: queueName, job_name: job.name, status: 'completed' },
      durationSec,
    );
    this.completedCounter.inc({ queue: queueName, job_name: job.name });
  }

  recordFailed(queueName: string, job: Job, startedAt: number): void {
    const durationSec = (Date.now() - startedAt) / 1000;
    this.durationHistogram.observe(
      { queue: queueName, job_name: job.name, status: 'failed' },
      durationSec,
    );
    this.failedCounter.inc({ queue: queueName, job_name: job.name });
  }

  async getMetricsText(): Promise<string> {
    await this.pollDepths();
    return this.registry.metrics();
  }

  private getQueues(): Array<{ name: string; queue: Queue }> {
    return [
      { name: EMAIL_QUEUE, queue: this.emailQueue },
      { name: SMS_QUEUE, queue: this.smsQueue },
      { name: AI_PROCESSING_QUEUE, queue: this.aiQueue },
      { name: LEASE_PROCESSING_QUEUE, queue: this.leaseQueue },
      { name: MAINTENANCE_TRIAGE_QUEUE, queue: this.maintenanceQueue },
      { name: ACCOUNTING_QUEUE, queue: this.accountingQueue },
      { name: WEBHOOK_QUEUE, queue: this.webhookQueue },
      { name: ZOOM_PROCESSING_QUEUE, queue: this.zoomQueue },
    ];
  }

  private async pollDepths(): Promise<void> {
    try {
      for (const { name, queue } of this.getQueues()) {
        const counts = await queue.getJobCounts('waiting', 'active', 'delayed', 'failed');
        this.depthGauge.set({ queue: name, state: 'waiting' }, counts.waiting ?? 0);
        this.depthGauge.set({ queue: name, state: 'active' }, counts.active ?? 0);
        this.depthGauge.set({ queue: name, state: 'delayed' }, counts.delayed ?? 0);
        this.depthGauge.set({ queue: name, state: 'failed' }, counts.failed ?? 0);
      }
    } catch (err) {
      this.logger.warn(`Queue depth poll failed: ${err instanceof Error ? err.message : err}`);
    }
  }
}
