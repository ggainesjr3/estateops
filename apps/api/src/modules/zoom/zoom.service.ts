import { Injectable, NotFoundException } from '@nestjs/common';
import { StorageService } from '../storage/storage.service';
import { MeetingArchiveRepository } from './repositories/meeting-archive.repository';
import type { MeetingSearchFilters } from './repositories/meeting-archive.repository';
import { toMeetingDetailDto, toMeetingListItemDto } from './mappers/meeting.mapper';

@Injectable()
export class ZoomService {
  constructor(
    private readonly archives: MeetingArchiveRepository,
    private readonly storage: StorageService,
  ) {}

  async searchMeetings(orgId: string, filters: MeetingSearchFilters) {
    void orgId;
    const page = await this.archives.search(filters);
    return {
      items: page.items.map(toMeetingListItemDto),
      nextCursor: page.nextCursor,
    };
  }

  async getMeeting(id: string) {
    const row = await this.archives.findByIdOrFail(id);
    return toMeetingDetailDto(row);
  }

  async linkMeetingToProperty(meetingId: string, propertyId: string) {
    const row = await this.archives.update(meetingId, { propertyId } as never);
    return toMeetingDetailDto(row);
  }

  async getRecordingDownloadUrl(meetingId: string) {
    const row = await this.archives.findByIdOrFail(meetingId);
    const itemId = row.sharepointRecordingItemId;
    if (!itemId) {
      throw new NotFoundException('Recording not available');
    }
    const signed = await this.storage.getSignedDownloadUrl(itemId);
    return signed;
  }
}
