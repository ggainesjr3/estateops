import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LeaseStatus, RentEscalationFrequency } from '@estateops/shared';

export class LeaseTenantResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  tenantId!: string;

  @ApiProperty()
  isPrimary!: boolean;

  @ApiPropertyOptional()
  signedAt?: string | null;

  @ApiPropertyOptional()
  tenantName?: string;
}

export class LeasePaymentResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  amount!: string;

  @ApiProperty()
  status!: string;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiPropertyOptional()
  paidAt?: string | null;

  @ApiProperty()
  createdAt!: string;
}

export class LeaseResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  propertyId!: string;

  @ApiProperty()
  unitId!: string;

  @ApiProperty({ enum: LeaseStatus })
  status!: LeaseStatus;

  @ApiProperty()
  version!: number;

  @ApiProperty()
  startDate!: string;

  @ApiPropertyOptional()
  endDate?: string | null;

  @ApiProperty()
  monthlyRent!: string;

  @ApiPropertyOptional()
  securityDeposit?: string | null;

  @ApiPropertyOptional()
  lateFeeAmount?: string | null;

  @ApiProperty()
  lateFeeGraceDays!: number;

  @ApiProperty()
  rentEscalationPercent!: string;

  @ApiProperty({ enum: RentEscalationFrequency })
  rentEscalationFrequency!: RentEscalationFrequency;

  @ApiPropertyOptional()
  signedByTenantAt?: string | null;

  @ApiPropertyOptional()
  signedByManagerAt?: string | null;

  @ApiPropertyOptional()
  terminatedAt?: string | null;

  @ApiPropertyOptional()
  terminationReason?: string | null;

  @ApiPropertyOptional()
  renewedFromLeaseId?: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class LeaseDetailResponseDto extends LeaseResponseDto {
  @ApiProperty({ type: [LeaseTenantResponseDto] })
  tenants!: LeaseTenantResponseDto[];

  @ApiProperty({ type: [LeasePaymentResponseDto] })
  paymentHistory!: LeasePaymentResponseDto[];
}

export class LeaseVersionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  version!: number;

  @ApiProperty()
  snapshot!: Record<string, unknown>;

  @ApiProperty()
  changedBy!: string;

  @ApiProperty()
  createdAt!: string;
}
