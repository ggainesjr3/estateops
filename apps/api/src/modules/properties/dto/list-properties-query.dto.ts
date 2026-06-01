import { ApiPropertyOptional } from '@nestjs/swagger';
import { CursorPaginationQueryDto, PropertyStatus, PropertyType } from '@estateops/shared';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class ListPropertiesQueryDto extends CursorPaginationQueryDto {
  @ApiPropertyOptional({ enum: PropertyType })
  @IsOptional()
  @IsEnum(PropertyType)
  type?: PropertyType;

  @ApiPropertyOptional({ enum: PropertyStatus })
  @IsOptional()
  @IsEnum(PropertyStatus)
  status?: PropertyStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;
}
