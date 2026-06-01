import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MeetingArchiveStatus, NotificationChannel, NotificationPriority } from '@estateops/shared';
import { StorageService } from '../../storage/storage.service';
import { AiService } from '../../ai/ai.service';
import { NotificationService } from '../../notifications/services/notification.service';
import { ZoomApiService } from './zoom-api.service';
import { MeetingArchiveRepository } from '../repositories/meeting-archive.repository';
import type { ZoomRecordingFileRef } from '../entities/meeting-archive.entity';
import { parseVttToPlainText } from '../utils/vtt-parser.util';
import { User } from '../../users/entities/user.entity';

@Injectable()
export class ZoomProcessingHandler {
  private readonly logger = new Logger(ZoomProcessingHandler.name);

  constructor(
    private readonly archives: MeetingArchiveRepository,
    private readonly zoomApi: ZoomApiService,
    private readonly storage: StorageService,
    private readonly ai: AiService,
    private readonly notifications: NotificationService,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async process(orgId: string, archiveId: string): Promise<void> {
    const archive = await this.archives.findByIdOrFail(archiveId);
    if (archive.orgId !== orgId) {
      throw new Error('Archive org mismatch');
    }

    try {
      await this.archives.updateStatus(archiveId, MeetingArchiveStatus.PROCESSING);

      const folderPath = this.meetingFolderPath(
        orgId,
        archive.zoomMeetingId,
        archive.startedAt ?? archive.createdAt,
      );

      const recordingFile = this.pickRecordingFile(archive.recordingFiles);
      const transcriptFile = this.pickTranscriptFile(archive.recordingFiles);

      let recordingResult: {
        id: string;
        webUrl: string;
      } | null = null;

      if (recordingFile?.download_url) {
        const { stream, contentLength, mimeType } = await this.zoomApi.downloadAsStream(
          recordingFile.download_url,
        );
        const fileName = `recording.${this.extensionForMime(mimeType, 'mp4')}`;
        const stored = await this.storage.uploadStream(
          orgId,
          folderPath,
          fileName,
          mimeType,
          contentLength || recordingFile.file_size || 0,
          stream,
        );
        recordingResult = { id: stored.id, webUrl: stored.webUrl };
      }

      let transcriptResult: { id: string; webUrl: string } | null = null;
      let plainTranscript = '';

      if (transcriptFile?.download_url) {
        const vtt = await this.zoomApi.downloadAsText(transcriptFile.download_url);
        plainTranscript = parseVttToPlainText(vtt);
        const stored = await this.storage.uploadFile(
          orgId,
          folderPath,
          'transcript.vtt',
          Buffer.from(vtt, 'utf8'),
          'text/vtt',
        );
        transcriptResult = { id: stored.id, webUrl: stored.webUrl };
      }

      await this.archives.update(archiveId, {
        status: MeetingArchiveStatus.UPLOADED,
        sharepointRecordingUrl: recordingResult?.webUrl ?? null,
        sharepointTranscriptUrl: transcriptResult?.webUrl ?? null,
        sharepointRecordingItemId: recordingResult?.id ?? null,
        sharepointTranscriptItemId: transcriptResult?.id ?? null,
      } as never);

      let aiSummary: Record<string, unknown> | null = null;
      if (plainTranscript.trim()) {
        const summary = await this.ai.summarizeTranscript(orgId, plainTranscript);
        aiSummary = summary as Record<string, unknown>;
      } else {
        aiSummary = {
          summary: 'No transcript available for this meeting.',
          action_items: [],
          key_decisions: [],
          topics_discussed: [],
        };
      }

      const updated = await this.archives.update(archiveId, {
        status: MeetingArchiveStatus.SUMMARIZED,
        aiSummary,
      } as never);

      await this.notifyHost(orgId, updated);
      this.logger.log(`Meeting archive ${archiveId} summarized`);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Processing failed';
      await this.archives.updateStatus(archiveId, MeetingArchiveStatus.FAILED, {
        failureReason: message,
      } as never);
      throw e;
    }
  }

  private async notifyHost(
    orgId: string,
    archive: { id: string; hostUserId: string | null; topic: string },
  ): Promise<void> {
    if (!archive.hostUserId) return;
    try {
      await this.notifications.send({
        userId: archive.hostUserId,
        channel: NotificationChannel.IN_APP,
        priority: NotificationPriority.NORMAL,
        subject: 'Meeting archived',
        body: `Meeting "${archive.topic}" archived and summarized`,
        referenceType: 'meeting_archive',
        referenceId: archive.id,
      });
    } catch (e) {
      this.logger.warn(
        `In-app notify failed for host ${archive.hostUserId}: ${e instanceof Error ? e.message : e}`,
      );
    }
  }

  private meetingFolderPath(orgId: string, zoomMeetingId: string, date: Date): string {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    return `${orgId}/Meetings/${year}/${month}/${zoomMeetingId}`;
  }

  private pickRecordingFile(files: ZoomRecordingFileRef[]): ZoomRecordingFileRef | undefined {
    return (
      files.find((f) => f.file_type === 'MP4' || f.recording_type === 'shared_screen_with_speaker_view') ??
      files.find((f) => f.file_type === 'M4A') ??
      files.find((f) => f.file_type !== 'TRANSCRIPT' && f.file_type !== 'CC' && f.file_type !== 'TIMELINE')
    );
  }

  private pickTranscriptFile(files: ZoomRecordingFileRef[]): ZoomRecordingFileRef | undefined {
    return files.find((f) => f.file_type === 'TRANSCRIPT' || f.file_type === 'CC');
  }

  private extensionForMime(mime: string, fallback: string): string {
    if (mime.includes('mp4')) return 'mp4';
    if (mime.includes('webm')) return 'webm';
    if (mime.includes('m4a')) return 'm4a';
    return fallback;
  }
}
