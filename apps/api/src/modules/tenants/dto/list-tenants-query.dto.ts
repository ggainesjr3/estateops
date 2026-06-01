import { ApiPropertyOptional } from '@nestjs/swagger';
import { CursorPaginationQueryDto, TenantRecordStatus } from '@estateops/shared';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';

export class ListTenantsQueryDto extends CursorPaginationQueryDto {
  @ApiPropertyOptional({ enum: TenantRecordStatus })
  @IsOptional()
  @IsEnum(TenantRecordStatus)
  status?: TenantRecordStatus;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  propertyId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  unitId?: string;
}
