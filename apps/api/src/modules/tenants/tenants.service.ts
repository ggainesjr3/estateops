import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CommunicationChannel,
  CommunicationDirection,
  DocumentEntityType,
  TenantRecordStatus,
} from '@estateops/shared';
import { CursorPageDto } from '../../common/dto/cursor-page.dto';
import { CreateEmergencyContactDto } from './dto/create-emergency-contact.dto';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { ListTenantsQueryDto } from './dto/list-tenants-query.dto';
import { CursorPaginationQueryDto } from '@estateops/shared';
import {
  CommunicationHistoryResponseDto,
  SendMessageResponseDto,
} from './dto/communication-history-response.dto';
import { SendMessageDto } from './dto/send-message.dto';
import {
  EmergencyContactResponseDto,
  TenantDetailResponseDto,
  TenantResponseDto,
} from './dto/tenant-response.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import {
  toCommunicationHistoryResponseDto,
  toEmergencyContactResponseDto,
  toTenantDetailResponseDto,
  toTenantResponseDto,
} from './mappers/tenant.mapper';
import { CommunicationHistoryRepository } from './repositories/communication-history.repository';
import { EmergencyContactRepository } from './repositories/emergency-contact.repository';
import { LeaseRepository } from '../leases/repositories/lease.repository';
import { TenantRepository } from './repositories/tenant.repository';
import { CommunicationQueueService } from './services/communication-queue.service';
import { DocumentsService } from '../documents/documents.service';
import { TenantContext } from '../../tenant/tenant.context';

@Injectable()
export class TenantsService {
  constructor(
    private readonly tenantRepository: TenantRepository,
    private readonly emergencyContactRepository: EmergencyContactRepository,
    private readonly communicationRepository: CommunicationHistoryRepository,
    private readonly leaseRepository: LeaseRepository,
    private readonly communicationQueue: CommunicationQueueService,
    private readonly documentsService: DocumentsService,
  ) {}

  async create(dto: CreateTenantDto): Promise<TenantResponseDto> {
    const tenant = await this.tenantRepository.createUnique({
      userId: dto.userId ?? null,
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      phone: dto.phone ?? null,
      dob: dto.dob ?? null,
      govtIdType: dto.govtIdType ?? null,
      govtIdLast4: dto.govtIdLast4 ?? null,
      status: dto.status ?? TenantRecordStatus.PROSPECT,
      notes: dto.notes ?? null,
    });
    return toTenantResponseDto(tenant);
  }

  async list(query: ListTenantsQueryDto): Promise<CursorPageDto<TenantResponseDto>> {
    const limit = query.limit ?? 20;
    const page = await this.tenantRepository.findPage(
      {
        status: query.status,
        propertyId: query.propertyId,
        unitId: query.unitId,
      },
      query.cursor,
      limit,
    );
    return new CursorPageDto(
      page.items.map(toTenantResponseDto),
      page.nextCursor,
      page.hasMore,
    );
  }

  async findOne(id: string): Promise<TenantDetailResponseDto> {
    const tenant = await this.tenantRepository.findById(id);
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }
    const emergencyContacts = await this.emergencyContactRepository.findByTenantId(id);
    const activeLease = await this.leaseRepository.findActiveByTenantId(id);
    return toTenantDetailResponseDto(tenant, emergencyContacts, activeLease);
  }

  async update(id: string, dto: UpdateTenantDto): Promise<TenantResponseDto> {
    if (dto.email) {
      const existing = await this.tenantRepository.findByEmail(dto.email);
      if (existing && existing.id !== id) {
        throw new BadRequestException('A tenant with this email already exists in the organization');
      }
    }
    const tenant = await this.tenantRepository.update(id, {
      ...(dto.userId !== undefined && { userId: dto.userId }),
      ...(dto.firstName !== undefined && { firstName: dto.firstName }),
      ...(dto.lastName !== undefined && { lastName: dto.lastName }),
      ...(dto.email !== undefined && { email: dto.email.toLowerCase() }),
      ...(dto.phone !== undefined && { phone: dto.phone }),
      ...(dto.dob !== undefined && { dob: dto.dob }),
      ...(dto.govtIdType !== undefined && { govtIdType: dto.govtIdType }),
      ...(dto.govtIdLast4 !== undefined && { govtIdLast4: dto.govtIdLast4 }),
      ...(dto.status !== undefined && { status: dto.status }),
      ...(dto.notes !== undefined && { notes: dto.notes }),
    });
    return toTenantResponseDto(tenant);
  }

  async remove(id: string): Promise<void> {
    const hasActive = await this.leaseRepository.hasActiveLease(id);
    if (hasActive) {
      throw new BadRequestException('Cannot delete tenant with an active lease');
    }
    await this.tenantRepository.softDelete(id);
  }

  async addEmergencyContact(
    tenantId: string,
    dto: CreateEmergencyContactDto,
  ): Promise<EmergencyContactResponseDto> {
    const contact = await this.emergencyContactRepository.createForTenant(tenantId, {
      name: dto.name,
      relationship: dto.relationship,
      phone: dto.phone,
      email: dto.email ?? null,
      isPrimary: dto.isPrimary ?? false,
    });
    return toEmergencyContactResponseDto(contact);
  }

  async getCommunicationHistory(
    tenantId: string,
    query: CursorPaginationQueryDto,
  ): Promise<CursorPageDto<CommunicationHistoryResponseDto>> {
    const limit = query.limit ?? 20;
    const page = await this.communicationRepository.findPageByTenant(
      tenantId,
      query.cursor,
      limit,
    );
    return new CursorPageDto(
      page.items.map(toCommunicationHistoryResponseDto),
      page.nextCursor,
      page.hasMore,
    );
  }

  async sendMessage(tenantId: string, dto: SendMessageDto): Promise<SendMessageResponseDto> {
    const direction = dto.direction ?? CommunicationDirection.OUTBOUND;
    const queueable =
      direction === CommunicationDirection.OUTBOUND &&
      (dto.channel === CommunicationChannel.EMAIL ||
        dto.channel === CommunicationChannel.SMS);

    if (queueable) {
      const { communicationId } = await this.communicationQueue.queueOutboundMessage({
        tenantId,
        channel: dto.channel as CommunicationChannel.EMAIL | CommunicationChannel.SMS,
        subject: dto.subject,
        body: dto.body,
      });
      return { communicationId, status: 'queued' };
    }

    await this.requireTenant(tenantId);
    const record = await this.communicationRepository.create({
      tenantId,
      channel: dto.channel,
      direction,
      subject: dto.subject ?? null,
      body: dto.body,
      sentByUserId: TenantContext.getUserId(),
      sentAt: new Date(),
    });
    return { communicationId: record.id, status: 'logged' };
  }

  async getDocuments(tenantId: string) {
    await this.requireTenant(tenantId);
    return this.documentsService.listByEntity(DocumentEntityType.TENANT, tenantId);
  }

  private async requireTenant(id: string) {
    const tenant = await this.tenantRepository.findById(id);
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }
    return tenant;
  }
}
