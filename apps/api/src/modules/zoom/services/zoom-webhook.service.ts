import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MeetingArchiveStatus } from '@estateops/shared';
import { QueueProducerService } from '../../../queues/services/queue-producer.service';
import { OrgJobContextService } from '../../../queues/services/org-job-context.service';
import { MeetingArchive } from '../entities/meeting-archive.entity';
import type { MeetingParticipant, ZoomRecordingFileRef } from '../entities/meeting-archive.entity';
import { MeetingArchiveRepository } from '../repositories/meeting-archive.repository';
import {
  verifyZoomWebhookSignature,
  zoomUrlValidationResponse,
} from '../utils/zoom-webhook.util';
import { User } from '../../users/entities/user.entity';

interface ZoomWebhookPayload {
  event?: string;
  payload?: {
    account_id?: string;
    plainToken?: string;
    object?: ZoomRecordingObject;
  };
  download_token?: string;
}

interface ZoomRecordingObject {
  uuid?: string;
  id?: number | string;
  host_id?: string;
  topic?: string;
  start_time?: string;
  end_time?: string;
  duration?: number;
  participant_audio_files?: unknown[];
  participant_video_files?: unknown[];
  recording_files?: ZoomRecordingFileRef[];
  participant_list?: MeetingParticipant[];
}

@Injectable()
export class ZoomWebhookService {
  private readonly logger = new Logger(ZoomWebhookService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly archives: MeetingArchiveRepository,
    private readonly queueProducer: QueueProducerService,
    private readonly orgJobContext: OrgJobContextService,
    @InjectRepository(MeetingArchive)
    private readonly meetingRepo: Repository<MeetingArchive>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  verifyAndParse(
    timestamp: string | undefined,
    signature: string | undefined,
    rawBody: string,
  ): ZoomWebhookPayload {
    const secret = this.config.get<string>('zoom.webhookSecret') ?? '';
    if (!verifyZoomWebhookSignature(secret, timestamp ?? '', rawBody, signature ?? '')) {
      throw new UnauthorizedException('Invalid Zoom webhook signature');
    }
    return JSON.parse(rawBody) as ZoomWebhookPayload;
  }

  handleValidation(plainToken: string): { plainToken: string; encryptedToken: string } {
    const secret = this.config.get<string>('zoom.webhookSecret') ?? '';
    return zoomUrlValidationResponse(secret, plainToken);
  }

  async handleEvent(body: ZoomWebhookPayload): Promise<void> {
    if (body.event === 'endpoint.url_validation') {
      return;
    }

    if (body.event !== 'recording.completed') {
      this.logger.debug(`Ignoring Zoom event ${body.event}`);
      return;
    }

    const object = body.payload?.object;
    if (!object?.uuid || !object.id) {
      this.logger.warn('recording.completed missing uuid/id');
      return;
    }

    const orgId = this.resolveOrgId(body.payload?.account_id);
    const hostUser = object.host_id
      ? await this.userRepo.findOne({ where: { zoomUserId: object.host_id } })
      : null;

    const recordingFiles = (object.recording_files ?? []).map((f) => ({
      ...f,
      download_url: this.appendDownloadToken(f.download_url, body.download_token),
    }));

    const existing = await this.meetingRepo.findOne({
      where: { orgId, zoomUuid: object.uuid },
    });
    if (existing) {
      this.logger.log(`Archive already exists for zoom uuid ${object.uuid}`);
      await this.queueProducer.enqueueZoom({ orgId, archiveId: existing.id });
      return;
    }

    const archive = await this.orgJobContext.runAsOrg(orgId, async () =>
      this.archives.create({
        zoomMeetingId: String(object.id),
        zoomUuid: object.uuid,
        topic: object.topic ?? 'Zoom meeting',
        hostUserId: hostUser?.id ?? null,
        hostZoomUserId: object.host_id ?? null,
        startedAt: object.start_time ? new Date(object.start_time) : null,
        endedAt: object.end_time ? new Date(object.end_time) : null,
        durationSeconds: object.duration ?? null,
        status: MeetingArchiveStatus.RECEIVED,
        participants: object.participant_list ?? [],
        recordingFiles,
      } as never),
    );

    await this.queueProducer.enqueueZoom({ orgId, archiveId: archive.id });
    this.logger.log(`Enqueued zoom processing for archive ${archive.id}`);
  }

  private resolveOrgId(accountId?: string): string {
    const mapJson = this.config.get<string>('zoom.accountOrgMapJson') ?? '{}';
    let map: Record<string, string> = {};
    try {
      map = JSON.parse(mapJson) as Record<string, string>;
    } catch {
      map = {};
    }
    if (accountId && map[accountId]) {
      return map[accountId]!;
    }
    const defaultOrg = this.config.get<string>('zoom.defaultOrgId');
    if (!defaultOrg) {
      throw new Error('ZOOM_DEFAULT_ORG_ID or ZOOM_ACCOUNT_ORG_MAP required');
    }
    return defaultOrg;
  }

  private appendDownloadToken(url?: string, token?: string): string | undefined {
    if (!url || !token) return url;
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}access_token=${encodeURIComponent(token)}`;
  }
}
