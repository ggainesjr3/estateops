import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  CursorPaginationQueryDto,
  MaintenanceTicketPriority,
  MaintenanceTicketStatus,
  MaintenanceTrade,
} from '@estateops/shared';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';

export class ListTicketsQueryDto extends CursorPaginationQueryDto {
  @ApiPropertyOptional({ enum: MaintenanceTicketStatus })
  @IsOptional()
  @IsEnum(MaintenanceTicketStatus)
  status?: MaintenanceTicketStatus;

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
  propertyId?: string;
}
