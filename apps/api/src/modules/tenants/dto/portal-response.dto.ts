import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentStatus } from '@estateops/shared';
import { TenantDetailResponseDto } from './tenant-response.dto';

export class PortalLeaseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  propertyName!: string;

  @ApiProperty()
  unitNumber!: string;

  @ApiProperty()
  monthlyRent!: number;

  @ApiProperty()
  startDate!: string;

  @ApiPropertyOptional({ nullable: true })
  endDate!: string | null;
}

export class PortalPaymentDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  amount!: number;

  @ApiProperty({ enum: PaymentStatus })
  status!: PaymentStatus;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiPropertyOptional({ nullable: true })
  paidAt!: string | null;

  @ApiProperty()
  createdAt!: string;
}

export class PortalMeResponseDto {
  @ApiProperty({ type: TenantDetailResponseDto })
  profile!: TenantDetailResponseDto;

  @ApiPropertyOptional({ type: PortalLeaseDto, nullable: true })
  lease!: PortalLeaseDto | null;

  @ApiProperty({ type: [PortalPaymentDto] })
  paymentHistory!: PortalPaymentDto[];
}
