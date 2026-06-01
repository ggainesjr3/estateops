import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Job } from 'bullmq';
import { Repository } from 'typeorm';
import { FailedJob } from '../entities/failed-job.entity';

@Injectable()
export class FailedJobService {
  private readonly logger = new Logger(FailedJobService.name);

  constructor(
    @InjectRepository(FailedJob)
    private readonly repository: Repository<FailedJob>,
  ) {}

  async recordFailure(queueName: string, job: Job | undefined, error: Error): Promise<void> {
    const row = this.repository.create({
      queueName,
      jobId: job?.id ?? null,
      jobName: job?.name ?? null,
      payload: (job?.data as Record<string, unknown>) ?? {},
      errorMessage: error.message,
      stackTrace: error.stack ?? null,
      attempts: job?.attemptsMade ?? 0,
      failedAt: new Date(),
    });
    await this.repository.save(row);
    this.logger.error(
      `Dead-letter: queue=${queueName} job=${job?.id} name=${job?.name} error=${error.message}`,
    );
  }
}
