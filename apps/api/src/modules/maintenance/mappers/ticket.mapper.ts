import { MaintenanceTicket } from '../entities/maintenance-ticket.entity';
import { TicketAttachment } from '../entities/ticket-attachment.entity';
import { TicketUpdate } from '../entities/ticket-update.entity';
import {
  TicketAttachmentResponseDto,
  TicketDetailResponseDto,
  TicketResponseDto,
  TicketUpdateResponseDto,
} from '../dto/ticket-response.dto';
import { VendorInvoiceResponseDto } from '../dto/vendor-invoice-response.dto';

export function toTicketResponseDto(ticket: MaintenanceTicket): TicketResponseDto {
  return {
    id: ticket.id,
    propertyId: ticket.propertyId,
    unitId: ticket.unitId,
    tenantId: ticket.tenantId,
    title: ticket.title,
    description: ticket.description,
    priority: ticket.priority,
    status: ticket.status,
    trade: ticket.trade,
    aiClassification: ticket.aiClassification,
    assignedVendorId: ticket.assignedVendorId,
    assignedStaffId: ticket.assignedStaffId,
    slaDueAt: ticket.slaDueAt?.toISOString() ?? null,
    startedAt: ticket.startedAt?.toISOString() ?? null,
    completedAt: ticket.completedAt?.toISOString() ?? null,
    invoicedAt: ticket.invoicedAt?.toISOString() ?? null,
    closedAt: ticket.closedAt?.toISOString() ?? null,
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
  };
}

export function toTicketUpdateResponseDto(update: TicketUpdate): TicketUpdateResponseDto {
  return {
    id: update.id,
    statusFrom: update.statusFrom,
    statusTo: update.statusTo,
    note: update.note,
    updatedByUserId: update.updatedByUserId,
    createdAt: update.createdAt.toISOString(),
  };
}

export function toTicketAttachmentResponseDto(
  attachment: TicketAttachment,
): TicketAttachmentResponseDto {
  return {
    id: attachment.id,
    fileName: attachment.fileName,
    fileSize: attachment.fileSize,
    mimeType: attachment.mimeType,
    storageUrl: attachment.storageUrl,
    storageProvider: attachment.storageProvider,
    uploadedBy: attachment.uploadedBy,
    createdAt: attachment.createdAt.toISOString(),
  };
}

export function toTicketDetailResponseDto(
  ticket: MaintenanceTicket,
  updates: TicketUpdate[] = [],
  attachments: TicketAttachment[] = [],
  vendorInvoices: VendorInvoiceResponseDto[] = [],
): TicketDetailResponseDto {
  return {
    ...toTicketResponseDto(ticket),
    updates: updates.map(toTicketUpdateResponseDto),
    attachments: attachments.map(toTicketAttachmentResponseDto),
    vendorInvoices,
  };
}
