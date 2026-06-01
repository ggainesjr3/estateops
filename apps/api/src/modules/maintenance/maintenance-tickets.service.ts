import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  MaintenanceTicketPriority,
  MaintenanceTicketStatus,
  MaintenanceTrade,
} from '@estateops/shared';
import { CursorPageDto } from '../../common/dto/cursor-page.dto';
import { PropertyRepository } from '../properties/repositories/property.repository';
import { TenantContext } from '../../tenant/tenant.context';
import { QueueProducerService } from '../../queues/services/queue-producer.service';
import { AssignTicketDto } from './dto/assign-ticket.dto';
import { CreateTicketAttachmentDto } from './dto/create-ticket-attachment.dto';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { ListTicketsQueryDto } from './dto/list-tickets-query.dto';
import {
  TicketAttachmentResponseDto,
  TicketDetailResponseDto,
  TicketResponseDto,
} from './dto/ticket-response.dto';
import { TransitionTicketStatusDto } from './dto/transition-ticket-status.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import {
  toTicketAttachmentResponseDto,
  toTicketDetailResponseDto,
  toTicketResponseDto,
} from './mappers/ticket.mapper';
import { MaintenanceTicketRepository } from './repositories/maintenance-ticket.repository';
import { TicketAttachmentRepository } from './repositories/ticket-attachment.repository';
import { TicketUpdateRepository } from './repositories/ticket-update.repository';
import { VendorRepository } from './repositories/vendor.repository';
import { toVendorInvoiceResponseDto } from './mappers/vendor-invoice.mapper';
import { VendorInvoiceResponseDto } from './dto/vendor-invoice-response.dto';
import { VendorInvoiceRepository } from './repositories/vendor-invoice.repository';
import { MaintenanceSlaSchedulerService } from './services/maintenance-sla-scheduler.service';
import { TicketStateMachineService } from './ticket-state-machine.service';
import { computeSlaDueAt } from './utils/maintenance-sla.util';

@Injectable()
export class MaintenanceTicketsService {
  constructor(
    private readonly ticketRepository: MaintenanceTicketRepository,
    private readonly ticketUpdateRepository: TicketUpdateRepository,
    private readonly attachmentRepository: TicketAttachmentRepository,
    private readonly vendorRepository: VendorRepository,
    private readonly propertyRepository: PropertyRepository,
    private readonly stateMachine: TicketStateMachineService,
    private readonly slaScheduler: MaintenanceSlaSchedulerService,
    private readonly queueProducer: QueueProducerService,
    private readonly vendorInvoiceRepository: VendorInvoiceRepository,
  ) {}

  async create(dto: CreateTicketDto): Promise<TicketResponseDto> {
    await this.propertyRepository.findByIdOrFail(dto.propertyId);

    const priority = dto.priority ?? MaintenanceTicketPriority.MEDIUM;
    const slaDueAt = computeSlaDueAt(priority);

    const ticket = await this.ticketRepository.create({
      propertyId: dto.propertyId,
      unitId: dto.unitId ?? null,
      tenantId: dto.tenantId ?? null,
      title: dto.title,
      description: dto.description ?? null,
      priority,
      trade: dto.trade ?? MaintenanceTrade.GENERAL,
      status: MaintenanceTicketStatus.CREATED,
      slaDueAt,
      createdBy: TenantContext.getUserId(),
    });

    await this.ticketUpdateRepository.logStatusChange({
      ticketId: ticket.id,
      statusFrom: null,
      statusTo: MaintenanceTicketStatus.CREATED,
      note: 'Ticket created',
    });

    await this.queueProducer.enqueueClassifyMaintenance(ticket.orgId, {
      ticketId: ticket.id,
      title: ticket.title,
      description: ticket.description ?? undefined,
      actorUserId: TenantContext.getUserId(),
    });

    await this.slaScheduler.scheduleSlaAlert({
      orgId: ticket.orgId,
      ticketId: ticket.id,
      slaDueAt,
      ticketTitle: ticket.title,
    });

    return toTicketResponseDto(ticket);
  }

  async list(query: ListTicketsQueryDto): Promise<CursorPageDto<TicketResponseDto>> {
    const limit = query.limit ?? 20;
    const page = await this.ticketRepository.findPage(
      {
        status: query.status,
        priority: query.priority,
        trade: query.trade,
        propertyId: query.propertyId,
      },
      query.cursor,
      limit,
    );
    return new CursorPageDto(
      page.items.map(toTicketResponseDto),
      page.nextCursor,
      page.hasMore,
    );
  }

  async findOne(id: string): Promise<TicketDetailResponseDto> {
    const ticket = await this.ticketRepository.findByIdWithRelations(id);
    if (!ticket) {
      throw new NotFoundException('Maintenance ticket not found');
    }
    const updates = await this.ticketUpdateRepository.findByTicketId(id);
    const attachments = await this.attachmentRepository.findByTicketId(id);
    const vendorInvoices = await this.vendorInvoiceRepository.findByTicketId(id);
    return toTicketDetailResponseDto(
      ticket,
      updates,
      attachments,
      vendorInvoices.map(toVendorInvoiceResponseDto),
    );
  }

  async listVendorInvoices(ticketId: string): Promise<VendorInvoiceResponseDto[]> {
    await this.ticketRepository.findByIdOrFail(ticketId);
    const rows = await this.vendorInvoiceRepository.findByTicketId(ticketId);
    return rows.map(toVendorInvoiceResponseDto);
  }

  async approveVendorInvoice(
    ticketId: string,
    invoiceId: string,
  ): Promise<VendorInvoiceResponseDto> {
    await this.ticketRepository.findByIdOrFail(ticketId);
    const invoice = await this.vendorInvoiceRepository.approve(invoiceId);
    return toVendorInvoiceResponseDto(invoice);
  }

  async payVendorInvoice(
    ticketId: string,
    invoiceId: string,
  ): Promise<VendorInvoiceResponseDto> {
    await this.ticketRepository.findByIdOrFail(ticketId);
    const invoice = await this.vendorInvoiceRepository.markPaid(invoiceId);
    return toVendorInvoiceResponseDto(invoice);
  }

  async update(id: string, dto: UpdateTicketDto): Promise<TicketResponseDto> {
    const existing = await this.ticketRepository.findByIdOrFail(id);
    const priority = dto.priority ?? existing.priority;
    const slaDueAt =
      dto.priority && dto.priority !== existing.priority
        ? computeSlaDueAt(priority)
        : existing.slaDueAt;

    const ticket = await this.ticketRepository.update(id, {
      title: dto.title,
      description: dto.description,
      priority: dto.priority,
      trade: dto.trade,
      unitId: dto.unitId,
      tenantId: dto.tenantId,
      slaDueAt,
    });

    if (dto.priority && dto.priority !== existing.priority && slaDueAt) {
      await this.slaScheduler.scheduleSlaAlert({
        orgId: ticket.orgId,
        ticketId: ticket.id,
        slaDueAt,
        ticketTitle: ticket.title,
      });
    }

    return toTicketResponseDto(ticket);
  }

  async remove(id: string): Promise<void> {
    await this.slaScheduler.cancelSlaAlert(id);
    await this.ticketRepository.softDelete(id);
  }

  async transitionStatus(
    id: string,
    dto: TransitionTicketStatusDto,
  ): Promise<TicketResponseDto> {
    const ticket = await this.ticketRepository.findByIdOrFail(id);
    const from = ticket.status;
    const to = dto.status;

    this.stateMachine.assertTransition(from, to);

    if (this.stateMachine.requiresReopenNote(from, to) && !dto.note?.trim()) {
      throw new BadRequestException('A note is required when reopening a ticket');
    }

    const now = new Date();
    const patch: Partial<typeof ticket> = { status: to };

    if (to === MaintenanceTicketStatus.IN_PROGRESS) {
      patch.startedAt = ticket.startedAt ?? now;
    }
    if (to === MaintenanceTicketStatus.COMPLETED) {
      patch.completedAt = now;
    }
    if (to === MaintenanceTicketStatus.INVOICED) {
      patch.invoicedAt = now;
    }
    if (to === MaintenanceTicketStatus.CLOSED) {
      patch.closedAt = now;
    }
    if (to === MaintenanceTicketStatus.CREATED) {
      patch.startedAt = null;
      patch.completedAt = null;
      patch.invoicedAt = null;
      patch.closedAt = null;
      patch.assignedVendorId = null;
      patch.assignedStaffId = null;
    }

    const updated = await this.ticketRepository.update(id, patch);

    await this.ticketUpdateRepository.logStatusChange({
      ticketId: id,
      statusFrom: from,
      statusTo: to,
      note: dto.note ?? null,
    });

    if (this.slaScheduler.isProgressStatus(to)) {
      await this.slaScheduler.cancelSlaAlert(id);
    }

    return toTicketResponseDto(updated);
  }

  async assign(id: string, dto: AssignTicketDto): Promise<TicketResponseDto> {
    const ticket = await this.ticketRepository.findByIdOrFail(id);

    if (dto.vendorId) {
      await this.vendorRepository.findByIdOrFail(dto.vendorId);
    }

    let updated = await this.ticketRepository.update(id, {
      assignedVendorId:
        dto.vendorId !== undefined ? dto.vendorId : ticket.assignedVendorId,
      assignedStaffId:
        dto.staffId !== undefined ? dto.staffId : ticket.assignedStaffId,
    });

    if (
      ticket.status === MaintenanceTicketStatus.TRIAGED &&
      (dto.vendorId || dto.staffId)
    ) {
      this.stateMachine.assertTransition(
        ticket.status,
        MaintenanceTicketStatus.ASSIGNED,
      );
      updated = await this.ticketRepository.update(id, {
        status: MaintenanceTicketStatus.ASSIGNED,
      });
      await this.ticketUpdateRepository.logStatusChange({
        ticketId: id,
        statusFrom: ticket.status,
        statusTo: MaintenanceTicketStatus.ASSIGNED,
        note: 'Assignment updated',
      });
    }

    return toTicketResponseDto(updated);
  }

  async addAttachment(
    id: string,
    dto: CreateTicketAttachmentDto,
  ): Promise<TicketAttachmentResponseDto> {
    await this.ticketRepository.findByIdOrFail(id);
    const attachment = await this.attachmentRepository.createForTicket(id, {
      fileName: dto.fileName,
      fileSize: String(dto.fileSize),
      mimeType: dto.mimeType,
      storageUrl: dto.storageUrl,
      storageProvider: dto.storageProvider,
      uploadedBy: TenantContext.getUserId(),
    });
    return toTicketAttachmentResponseDto(attachment);
  }

  async listAttachments(id: string): Promise<TicketAttachmentResponseDto[]> {
    await this.ticketRepository.findByIdOrFail(id);
    const rows = await this.attachmentRepository.findByTicketId(id);
    return rows.map(toTicketAttachmentResponseDto);
  }
}
