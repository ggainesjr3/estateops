import { ApiPropertyOptional } from '@nestjs/swagger';
import { CursorPaginationQueryDto, UnitStatus, UnitType } from '@estateops/shared';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';

export class ListUnitsQueryDto extends CursorPaginationQueryDto {
  @ApiPropertyOptional({ enum: UnitType })
  @IsOptional()
  @IsEnum(UnitType)
  type?: UnitType;

  @ApiPropertyOptional({ enum: UnitStatus })
  @IsOptional()
  @IsEnum(UnitStatus)
  status?: UnitStatus;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  buildingId?: string;
}
