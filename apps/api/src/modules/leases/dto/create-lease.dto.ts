import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RentEscalationFrequency } from '@estateops/shared';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumberString,
  IsOptional,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class LeaseTenantInputDto {
  @ApiProperty()
  @IsUUID()
  tenantId!: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  isPrimary?: boolean;
}

export class CreateLeaseDto {
  @ApiProperty()
  @IsUUID()
  propertyId!: string;

  @ApiProperty()
  @IsUUID()
  unitId!: string;

  @ApiProperty()
  @IsDateString()
  startDate!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty()
  @IsNumberString()
  monthlyRent!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumberString()
  securityDeposit?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumberString()
  lateFeeAmount?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  lateFeeGraceDays?: number;

  @ApiPropertyOptional({ default: '0' })
  @IsOptional()
  @IsNumberString()
  rentEscalationPercent?: string;

  @ApiPropertyOptional({ enum: RentEscalationFrequency })
  @IsOptional()
  @IsEnum(RentEscalationFrequency)
  rentEscalationFrequency?: RentEscalationFrequency;

  @ApiProperty({ type: [LeaseTenantInputDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LeaseTenantInputDto)
  tenants!: LeaseTenantInputDto[];
}
