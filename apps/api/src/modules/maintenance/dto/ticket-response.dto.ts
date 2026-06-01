import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  MaintenanceTicketPriority,
  MaintenanceTicketStatus,
  MaintenanceTrade,
  TicketAttachmentStorageProvider,
} from '@estateops/shared';
import { VendorInvoiceResponseDto } from './vendor-invoice-response.dto';

export class TicketUpdateResponseDto {
  @ApiProperty()
  id!: string;

  @ApiPropertyOptional({ enum: MaintenanceTicketStatus, nullable: true })
  statusFrom!: MaintenanceTicketStatus | null;

  @ApiProperty({ enum: MaintenanceTicketStatus })
  statusTo!: MaintenanceTicketStatus;

  @ApiPropertyOptional({ nullable: true })
  note!: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  updatedByUserId!: string | null;

  @ApiProperty()
  createdAt!: string;
}

export class TicketAttachmentResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  fileName!: string;

  @ApiProperty()
  fileSize!: string;

  @ApiProperty()
  mimeType!: string;

  @ApiProperty()
  storageUrl!: string;

  @ApiProperty({ enum: TicketAttachmentStorageProvider })
  storageProvider!: TicketAttachmentStorageProvider;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  uploadedBy!: string | null;

  @ApiProperty()
  createdAt!: string;
}

export class TicketResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  propertyId!: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  unitId!: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  tenantId!: string | null;

  @ApiProperty()
  title!: string;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiProperty({ enum: MaintenanceTicketPriority })
  priority!: MaintenanceTicketPriority;

  @ApiProperty({ enum: MaintenanceTicketStatus })
  status!: MaintenanceTicketStatus;

  @ApiProperty({ enum: MaintenanceTrade })
  trade!: MaintenanceTrade;

  @ApiPropertyOptional({ nullable: true })
  aiClassification!: Record<string, unknown> | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  assignedVendorId!: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  assignedStaffId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  slaDueAt!: string | null;

  @ApiPropertyOptional({ nullable: true })
  startedAt!: string | null;

  @ApiPropertyOptional({ nullable: true })
  completedAt!: string | null;

  @ApiPropertyOptional({ nullable: true })
  invoicedAt!: string | null;

  @ApiPropertyOptional({ nullable: true })
  closedAt!: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class TicketDetailResponseDto extends TicketResponseDto {
  @ApiProperty({ type: [TicketUpdateResponseDto] })
  updates!: TicketUpdateResponseDto[];

  @ApiProperty({ type: [TicketAttachmentResponseDto] })
  attachments!: TicketAttachmentResponseDto[];

  @ApiProperty({ type: [VendorInvoiceResponseDto] })
  vendorInvoices!: VendorInvoiceResponseDto[];
}
