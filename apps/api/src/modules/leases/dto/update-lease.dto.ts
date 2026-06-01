import { ApiPropertyOptional } from '@nestjs/swagger';
import { RentEscalationFrequency } from '@estateops/shared';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumberString,
  IsOptional,
  Min,
} from 'class-validator';

export class UpdateLeaseDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumberString()
  monthlyRent?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumberString()
  securityDeposit?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumberString()
  lateFeeAmount?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  lateFeeGraceDays?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumberString()
  rentEscalationPercent?: string;

  @ApiPropertyOptional({ enum: RentEscalationFrequency })
  @IsOptional()
  @IsEnum(RentEscalationFrequency)
  rentEscalationFrequency?: RentEscalationFrequency;
}
