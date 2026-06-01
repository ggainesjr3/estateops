import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CommunicationChannel, CommunicationDirection } from '@estateops/shared';

export class CommunicationHistoryResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: CommunicationChannel })
  channel!: CommunicationChannel;

  @ApiProperty({ enum: CommunicationDirection })
  direction!: CommunicationDirection;

  @ApiPropertyOptional({ nullable: true })
  subject!: string | null;

  @ApiProperty()
  body!: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  sentByUserId!: string | null;

  @ApiProperty()
  sentAt!: string;
}

export class SendMessageResponseDto {
  @ApiProperty({ format: 'uuid' })
  communicationId!: string;

  @ApiProperty({ example: 'queued' })
  status!: string;
}
