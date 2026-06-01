import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MaintenanceTicketStatus } from '@estateops/shared';
import { IsEnum, IsOptional, IsString, ValidateIf } from 'class-validator';

export class TransitionTicketStatusDto {
  @ApiProperty({ enum: MaintenanceTicketStatus })
  @IsEnum(MaintenanceTicketStatus)
  status!: MaintenanceTicketStatus;

  @ApiPropertyOptional({ description: 'Required when reopening (any → created)' })
  @ValidateIf((o: TransitionTicketStatusDto) => o.status === MaintenanceTicketStatus.CREATED)
  @IsString()
  @IsOptional()
  note?: string;
}
