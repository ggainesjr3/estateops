import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GovtIdType, TenantRecordStatus } from '@estateops/shared';

/** List/summary shape — no PII beyond contact info. */
export class TenantResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  orgId!: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  userId!: string | null;

  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;

  @ApiProperty()
  email!: string;

  @ApiPropertyOptional({ nullable: true })
  phone!: string | null;

  @ApiProperty({ enum: TenantRecordStatus })
  status!: TenantRecordStatus;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

/** Detail shape — includes masked govt id only (last 4). */
export class TenantDetailResponseDto extends TenantResponseDto {
  @ApiPropertyOptional({ nullable: true })
  dob!: string | null;

  @ApiPropertyOptional({ enum: GovtIdType, nullable: true })
  govtIdType!: GovtIdType | null;

  @ApiPropertyOptional({ nullable: true, description: 'Last 4 digits only' })
  govtIdLast4!: string | null;

  @ApiPropertyOptional({ nullable: true })
  notes!: string | null;

  @ApiProperty({ type: () => [EmergencyContactResponseDto] })
  emergencyContacts!: EmergencyContactResponseDto[];

  @ApiPropertyOptional({ type: () => ActiveLeaseSummaryDto, nullable: true })
  activeLease!: ActiveLeaseSummaryDto | null;
}

export class EmergencyContactResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  relationship!: string;

  @ApiProperty()
  phone!: string;

  @ApiPropertyOptional({ nullable: true })
  email!: string | null;

  @ApiProperty()
  isPrimary!: boolean;
}

export class ActiveLeaseSummaryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  propertyId!: string;

  @ApiProperty()
  propertyName!: string;

  @ApiProperty({ format: 'uuid' })
  unitId!: string;

  @ApiProperty()
  unitNumber!: string;

  @ApiProperty()
  monthlyRent!: number;

  @ApiProperty()
  startDate!: string;

  @ApiPropertyOptional({ nullable: true })
  endDate!: string | null;
}
