import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UnitStatus, UnitType } from '@estateops/shared';

export class UnitResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  orgId!: string;

  @ApiProperty({ format: 'uuid' })
  propertyId!: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  buildingId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  floorNumber!: number | null;

  @ApiProperty()
  unitNumber!: string;

  @ApiProperty({ enum: UnitType })
  type!: UnitType;

  @ApiPropertyOptional({ nullable: true })
  sqft!: number | null;

  @ApiPropertyOptional({ nullable: true })
  bedrooms!: number | null;

  @ApiPropertyOptional({ nullable: true })
  bathrooms!: number | null;

  @ApiProperty({ enum: UnitStatus })
  status!: UnitStatus;

  @ApiPropertyOptional({ nullable: true })
  monthlyRent!: number | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}
