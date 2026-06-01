import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PropertyStatus, PropertyType } from '@estateops/shared';

export class PropertyResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  orgId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: PropertyType })
  type!: PropertyType;

  @ApiProperty()
  addressLine1!: string;

  @ApiPropertyOptional({ nullable: true })
  addressLine2!: string | null;

  @ApiProperty()
  city!: string;

  @ApiProperty()
  state!: string;

  @ApiProperty()
  postalCode!: string;

  @ApiProperty()
  country!: string;

  @ApiPropertyOptional({ nullable: true })
  latitude!: number | null;

  @ApiPropertyOptional({ nullable: true })
  longitude!: number | null;

  @ApiProperty({ enum: PropertyStatus })
  status!: PropertyStatus;

  @ApiProperty({ format: 'uuid' })
  createdBy!: string;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class PropertySummaryDto {
  @ApiProperty()
  buildingsCount!: number;

  @ApiProperty()
  unitsCount!: number;

  @ApiProperty()
  vacantUnits!: number;
}

export class PropertyDetailResponseDto extends PropertyResponseDto {
  @ApiProperty({ type: PropertySummaryDto })
  summary!: PropertySummaryDto;
}
