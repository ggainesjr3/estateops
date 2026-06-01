import { ApiProperty } from '@nestjs/swagger';

export class OnlinePresenceResponseDto {
  @ApiProperty({ type: [String] })
  userIds!: string[];
}
