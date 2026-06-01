import type { TranscriptSummaryResult } from '../../ai/schemas/ai-schemas';
import type { MeetingArchive } from '../entities/meeting-archive.entity';
import type { MeetingDetailDto, MeetingListItemDto } from '../dto/meeting.dto';

export function toMeetingListItemDto(row: MeetingArchive): MeetingListItemDto {
  return {
    id: row.id,
    zoomMeetingId: row.zoomMeetingId,
    topic: row.topic,
    status: row.status,
    propertyId: row.propertyId,
    hostUserId: row.hostUserId,
    startedAt: row.startedAt?.toISOString() ?? null,
    durationSeconds: row.durationSeconds,
    createdAt: row.createdAt.toISOString(),
  };
}

export function toMeetingDetailDto(row: MeetingArchive): MeetingDetailDto {
  const ai = row.aiSummary as TranscriptSummaryResult | null;
  return {
    ...toMeetingListItemDto(row),
    zoomUuid: row.zoomUuid,
    endedAt: row.endedAt?.toISOString() ?? null,
    sharepointRecordingUrl: row.sharepointRecordingUrl,
    sharepointTranscriptUrl: row.sharepointTranscriptUrl,
    aiSummary: ai
      ? {
          summary: ai.summary,
          action_items: ai.action_items,
          key_decisions: ai.key_decisions,
          topics_discussed: ai.topics_discussed,
        }
      : null,
    participants: row.participants as Record<string, unknown>[],
    failureReason: row.failureReason,
  };
}
