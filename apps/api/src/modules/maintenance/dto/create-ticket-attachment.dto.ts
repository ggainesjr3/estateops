import { ApiProperty } from '@nestjs/swagger';
import { TicketAttachmentStorageProvider } from '@estateops/shared';
import { IsEnum, IsInt, IsString, IsUrl, MaxLength, Min } from 'class-validator';

export class CreateTicketAttachmentDto {
  @ApiProperty({ maxLength: 500 })
  @IsString()
  @MaxLength(500)
  fileName!: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  fileSize!: number;

  @ApiProperty()
  @IsString()
  @MaxLength(255)
  mimeType!: string;

  @ApiProperty()
  @IsUrl()
  storageUrl!: string;

  @ApiProperty({ enum: TicketAttachmentStorageProvider })
  @IsEnum(TicketAttachmentStorageProvider)
  storageProvider!: TicketAttachmentStorageProvider;
}
