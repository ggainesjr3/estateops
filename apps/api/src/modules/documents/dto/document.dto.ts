import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentEntityType, DocumentStorageProvider } from '@estateops/shared';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateUploadUrlDto {
  @ApiProperty({ enum: DocumentEntityType })
  @IsEnum(DocumentEntityType)
  entityType!: DocumentEntityType;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  entityId!: string;

  @ApiProperty({ maxLength: 500 })
  @IsString()
  @MaxLength(500)
  fileName!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(255)
  mimeType!: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Required for lease, maintenance, financial' })
  @IsOptional()
  @IsUUID()
  propertyId?: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Required for tenant documents' })
  @IsOptional()
  @IsUUID()
  tenantId?: string;
}

export class UploadUrlResponseDto {
  @ApiProperty()
  uploadUrl!: string;

  @ApiProperty()
  expiresAt!: string;

  @ApiProperty({ enum: DocumentStorageProvider })
  provider!: DocumentStorageProvider;

  @ApiProperty()
  folderPath!: string;

  @ApiProperty()
  fileName!: string;
}

export class RegisterDocumentDto {
  @ApiProperty({ enum: DocumentEntityType })
  @IsEnum(DocumentEntityType)
  entityType!: DocumentEntityType;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  entityId!: string;

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

  @ApiProperty({ description: 'SharePoint drive item id or S3 object key' })
  @IsString()
  @MaxLength(1024)
  storageItemId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  webUrl?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  propertyId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  tenantId?: string;
}

export class DocumentResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: DocumentEntityType })
  entityType!: DocumentEntityType;

  @ApiProperty({ format: 'uuid' })
  entityId!: string;

  @ApiProperty()
  fileName!: string;

  @ApiProperty()
  fileSize!: string;

  @ApiProperty()
  mimeType!: string;

  @ApiProperty()
  folderPath!: string;

  @ApiPropertyOptional({ nullable: true })
  sharepointItemId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  sharepointWebUrl!: string | null;

  @ApiProperty({ enum: DocumentStorageProvider })
  storageProvider!: DocumentStorageProvider;

  @ApiProperty()
  createdAt!: string;
}

export class DownloadUrlResponseDto {
  @ApiProperty()
  downloadUrl!: string;

  @ApiProperty()
  expiresAt!: string;
}
