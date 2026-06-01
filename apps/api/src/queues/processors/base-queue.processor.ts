import { Logger } from '@nestjs/common';
import { OnWorkerEvent, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { FailedJobService } from '../services/failed-job.service';
import { QueueMetricsService } from '../services/queue-metrics.service';

export abstract class BaseQueueProcessor extends WorkerHost {
  protected abstract readonly queueName: string;
  private readonly jobStarts = new Map<string, number>();

  constructor(
    protected readonly failedJobService: FailedJobService,
    protected readonly metricsService: QueueMetricsService,
  ) {
    super();
  }

  protected loggerFor(job: Job): Logger {
    return new Logger(`${this.constructor.name}:${job.name}`);
  }

  @OnWorkerEvent('active')
  onActive(job: Job): void {
    this.jobStarts.set(job.id ?? job.name, Date.now());
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job): void {
    const startedAt = this.jobStarts.get(job.id ?? job.name) ?? Date.now();
    this.jobStarts.delete(job.id ?? job.name);
    this.metricsService.recordCompleted(this.queueName, job, startedAt);
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job | undefined, error: Error): Promise<void> {
    if (job) {
      const startedAt = this.jobStarts.get(job.id ?? job.name) ?? Date.now();
      this.jobStarts.delete(job.id ?? job.name);
      this.metricsService.recordFailed(this.queueName, job, startedAt);
    }
    await this.failedJobService.recordFailure(this.queueName, job, error);
  }
}
