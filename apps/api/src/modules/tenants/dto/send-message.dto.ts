import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CommunicationChannel, CommunicationDirection } from '@estateops/shared';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class SendMessageDto {
  @ApiProperty({ enum: CommunicationChannel })
  @IsEnum(CommunicationChannel)
  channel!: CommunicationChannel;

  @ApiPropertyOptional({ enum: CommunicationDirection, default: CommunicationDirection.OUTBOUND })
  @IsOptional()
  @IsEnum(CommunicationDirection)
  direction?: CommunicationDirection;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  subject?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  body!: string;
}
