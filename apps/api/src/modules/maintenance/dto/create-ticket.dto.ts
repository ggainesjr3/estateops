import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  MaintenanceTicketPriority,
  MaintenanceTrade,
} from '@estateops/shared';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateTicketDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  propertyId!: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  unitId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @ApiProperty({ maxLength: 500 })
  @IsString()
  @MaxLength(500)
  title!: string;

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
}
