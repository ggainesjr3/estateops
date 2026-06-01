import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LedgerEntryType, LedgerReferenceType } from '@estateops/shared';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class PostTransactionEntryDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  accountId!: string;

  @ApiProperty({ description: 'NUMERIC(15,2) as string, e.g. "100.00"' })
  @IsNumberString()
  amount!: string;

  @ApiProperty({ enum: LedgerEntryType })
  @IsEnum(LedgerEntryType)
  type!: LedgerEntryType;
}

export class PostTransactionDto {
  @ApiProperty({ description: 'Unique key per org; duplicate returns existing transaction' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  idempotencyKey!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  description!: string;

  @ApiProperty({ enum: LedgerReferenceType })
  @IsEnum(LedgerReferenceType)
  referenceType!: LedgerReferenceType;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  referenceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  postedAt?: string;

  @ApiProperty({ type: [PostTransactionEntryDto] })
  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => PostTransactionEntryDto)
  entries!: PostTransactionEntryDto[];
}
