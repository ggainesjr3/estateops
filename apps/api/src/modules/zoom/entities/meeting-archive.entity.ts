import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { MeetingArchiveStatus } from '@estateops/shared';
import { Organization } from '../../organizations/entities/organization.entity';
import { Property } from '../../properties/entities/property.entity';
import { User } from '../../users/entities/user.entity';

export interface MeetingParticipant {
  id?: string;
  name?: string;
  user_email?: string;
}

export interface ZoomRecordingFileRef {
  id?: string;
  file_type?: string;
  download_url?: string;
  file_size?: number;
  recording_type?: string;
}

@Entity('meeting_archives')
@Index('idx_meeting_archives_org_created', ['orgId', 'createdAt'])
export class MeetingArchive {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'org_id', type: 'uuid' })
  orgId!: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'org_id' })
  organization!: Organization;

  @Column({ name: 'zoom_meeting_id', type: 'varchar', length: 64 })
  zoomMeetingId!: string;

  @Column({ name: 'zoom_uuid', type: 'varchar', length: 128 })
  zoomUuid!: string;

  @Column({ type: 'varchar', length: 500 })
  topic!: string;

  @Column({ name: 'host_user_id', type: 'uuid', nullable: true })
  hostUserId!: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'host_user_id' })
  hostUser!: User | null;

  @Column({ name: 'host_zoom_user_id', type: 'varchar', length: 64, nullable: true })
  hostZoomUserId!: string | null;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt!: Date | null;

  @Column({ name: 'ended_at', type: 'timestamptz', nullable: true })
  endedAt!: Date | null;

  @Column({ name: 'duration_seconds', type: 'int', nullable: true })
  durationSeconds!: number | null;

  @Column({ name: 'property_id', type: 'uuid', nullable: true })
  propertyId!: string | null;

  @ManyToOne(() => Property, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'property_id' })
  property!: Property | null;

  @Column({ name: 'sharepoint_recording_url', type: 'varchar', length: 2048, nullable: true })
  sharepointRecordingUrl!: string | null;

  @Column({ name: 'sharepoint_transcript_url', type: 'varchar', length: 2048, nullable: true })
  sharepointTranscriptUrl!: string | null;

  @Column({ name: 'sharepoint_recording_item_id', type: 'varchar', length: 255, nullable: true })
  sharepointRecordingItemId!: string | null;

  @Column({ name: 'sharepoint_transcript_item_id', type: 'varchar', length: 255, nullable: true })
  sharepointTranscriptItemId!: string | null;

  @Column({ name: 'ai_summary', type: 'jsonb', nullable: true })
  aiSummary!: Record<string, unknown> | null;

  @Column({
    type: 'enum',
    enum: MeetingArchiveStatus,
    enumName: 'meeting_archive_status',
    default: MeetingArchiveStatus.RECEIVED,
  })
  status!: MeetingArchiveStatus;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  participants!: MeetingParticipant[];

  @Column({ name: 'recording_files', type: 'jsonb', default: () => "'[]'" })
  recordingFiles!: ZoomRecordingFileRef[];

  @Column({ name: 'failure_reason', type: 'text', nullable: true })
  failureReason!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
