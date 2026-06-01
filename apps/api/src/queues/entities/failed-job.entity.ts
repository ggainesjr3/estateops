import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('failed_jobs')
@Index('idx_failed_jobs_queue_name', ['queueName'])
@Index('idx_failed_jobs_failed_at', ['failedAt'])
export class FailedJob {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'queue_name', type: 'varchar', length: 128 })
  queueName!: string;

  @Column({ name: 'job_id', type: 'varchar', length: 255, nullable: true })
  jobId!: string | null;

  @Column({ name: 'job_name', type: 'varchar', length: 255, nullable: true })
  jobName!: string | null;

  @Column({ type: 'jsonb', default: {} })
  payload!: Record<string, unknown>;

  @Column({ name: 'error_message', type: 'text' })
  errorMessage!: string;

  @Column({ name: 'stack_trace', type: 'text', nullable: true })
  stackTrace!: string | null;

  @Column({ type: 'int', default: 0 })
  attempts!: number;

  @Column({ name: 'failed_at', type: 'timestamptz', default: () => 'now()' })
  failedAt!: Date;
}
