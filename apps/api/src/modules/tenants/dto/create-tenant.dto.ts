import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
} from 'class-validator';
import { GovtIdType, TenantRecordStatus } from '@estateops/shared';

export class CreateTenantDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName!: string;

  @ApiProperty()
  @IsEmail()
  @MaxLength(320)
  email!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dob?: string;

  @ApiPropertyOptional({ enum: GovtIdType })
  @IsOptional()
  @IsEnum(GovtIdType)
  govtIdType?: GovtIdType;

  @ApiPropertyOptional({ description: 'Last 4 digits only' })
  @IsOptional()
  @IsString()
  @Length(4, 4)
  govtIdLast4?: string;

  @ApiPropertyOptional({ enum: TenantRecordStatus, default: TenantRecordStatus.PROSPECT })
  @IsOptional()
  @IsEnum(TenantRecordStatus)
  status?: TenantRecordStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
