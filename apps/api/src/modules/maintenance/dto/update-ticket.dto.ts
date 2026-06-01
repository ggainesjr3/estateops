import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  MaintenanceTicketPriority,
  MaintenanceTrade,
} from '@estateops/shared';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class UpdateTicketDto {
  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: MaintenanceTicketPriority })
  @IsOptional()
  @IsEnum(MaintenanceTicketPriority)
  priority?: MaintenanceTicketPriority;

  @ApiPropertyOptional({ enum: MaintenanceTrade })
  @IsOptional()
  @IsEnum(MaintenanceTrade)
  trade?: MaintenanceTrade;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  unitId?: string | null;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  tenantId?: string | null;
}
