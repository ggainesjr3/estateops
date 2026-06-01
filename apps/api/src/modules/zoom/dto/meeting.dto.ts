import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MeetingArchiveStatus } from '@estateops/shared';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ListMeetingsQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  propertyId?: string;

  @ApiPropertyOptional({ enum: MeetingArchiveStatus })
  @IsOptional()
  @IsEnum(MeetingArchiveStatus)
  status?: MeetingArchiveStatus;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  hostUserId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  to?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({ default: 25 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class LinkPropertyDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  propertyId!: string;
}

export class MeetingSummaryDto {
  @ApiProperty()
  summary!: string;

  @ApiProperty({ type: 'array', items: { type: 'object' } })
  action_items!: Record<string, unknown>[];

  @ApiProperty({ type: [String] })
  key_decisions!: string[];

  @ApiProperty({ type: [String] })
  topics_discussed!: string[];
}

export class MeetingListItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  zoomMeetingId!: string;

  @ApiProperty()
  topic!: string;

  @ApiProperty()
  status!: MeetingArchiveStatus;

  @ApiPropertyOptional()
  propertyId!: string | null;

  @ApiPropertyOptional()
  hostUserId!: string | null;

  @ApiPropertyOptional()
  startedAt!: string | null;

  @ApiPropertyOptional()
  durationSeconds!: number | null;

  @ApiProperty()
  createdAt!: string;
}

export class MeetingListResponseDto {
  @ApiProperty({ type: [MeetingListItemDto] })
  items!: MeetingListItemDto[];

  @ApiPropertyOptional({ nullable: true })
  nextCursor!: string | null;
}

export class MeetingDetailDto extends MeetingListItemDto {
  @ApiProperty()
  zoomUuid!: string;

  @ApiPropertyOptional()
  endedAt!: string | null;

  @ApiPropertyOptional()
  sharepointRecordingUrl!: string | null;

  @ApiPropertyOptional()
  sharepointTranscriptUrl!: string | null;

  @ApiPropertyOptional({ type: MeetingSummaryDto })
  aiSummary!: MeetingSummaryDto | null;

  @ApiProperty({ type: 'array', items: { type: 'object' } })
  participants!: Record<string, unknown>[];

  @ApiPropertyOptional()
  failureReason!: string | null;
}

export class RecordingUrlResponseDto {
  @ApiProperty()
  downloadUrl!: string;

  @ApiProperty()
  expiresAt!: string;
}
