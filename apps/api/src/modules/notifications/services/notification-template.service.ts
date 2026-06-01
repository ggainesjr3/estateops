import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MembershipRole } from '@estateops/shared';
import { TenantContext } from '../../../tenant/tenant.context';
import { NotificationTemplateRepository } from '../repositories/notification-template.repository';
import {
  CreateNotificationTemplateDto,
  UpdateNotificationTemplateDto,
} from '../dto/notification.dto';
import { toNotificationTemplateResponseDto } from '../mappers/notification.mapper';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationTemplate } from '../entities/notification-template.entity';
import { OrganizationMembership } from '../../organization-memberships/entities/organization-membership.entity';

@Injectable()
export class NotificationTemplateService {
  constructor(
    private readonly templates: NotificationTemplateRepository,
    @InjectRepository(NotificationTemplate)
    private readonly templateRepo: Repository<NotificationTemplate>,
    @InjectRepository(OrganizationMembership)
    private readonly membershipRepo: Repository<OrganizationMembership>,
  ) {}

  async list() {
    const rows = await this.templates.listForOrg();
    return rows.map(toNotificationTemplateResponseDto);
  }

  async get(id: string) {
    const row = await this.templates.findByIdForOrgOrSystem(id);
    if (!row) throw new NotFoundException('Template not found');
    return toNotificationTemplateResponseDto(row);
  }

  async create(dto: CreateNotificationTemplateDto) {
    await this.assertCanManageOrgTemplates();
    const row = await this.templates.createOrgTemplate({
      name: dto.name,
      channel: dto.channel,
      subject: dto.subject ?? null,
      body: dto.body,
      variables: dto.variables ?? [],
      createdBy: TenantContext.getUserId(),
    } as NotificationTemplate);
    return toNotificationTemplateResponseDto(row);
  }

  async update(id: string, dto: UpdateNotificationTemplateDto) {
    const existing = await this.templates.findById(id);
    if (!existing) throw new NotFoundException('Template not found');
    if (existing.orgId === null) {
      await this.assertSuperAdmin();
    } else {
      await this.assertCanManageOrgTemplates();
    }
    const row = await this.templates.update(id, {
      ...dto,
    } as Partial<NotificationTemplate>);
    return toNotificationTemplateResponseDto(row);
  }

  async remove(id: string) {
    const existing = await this.templates.findById(id);
    if (!existing) throw new NotFoundException('Template not found');
    if (existing.orgId === null) {
      throw new BadRequestException('System templates cannot be deleted');
    }
    await this.assertCanManageOrgTemplates();
    await this.templateRepo.delete({ id, orgId: TenantContext.getOrgId() });
  }

  private async assertCanManageOrgTemplates(): Promise<void> {
    const userId = TenantContext.getUserId();
    const orgId = TenantContext.getOrgId();
    const membership = await this.membershipRepo.findOne({
      where: { userId, orgId, isActive: true },
    });
    const allowed = [
      MembershipRole.SUPER_ADMIN,
      MembershipRole.ORG_ADMIN,
      MembershipRole.PROPERTY_MANAGER,
    ];
    if (!membership || !allowed.includes(membership.role)) {
      throw new ForbiddenException('Insufficient permissions to manage templates');
    }
  }

  private async assertSuperAdmin(): Promise<void> {
    const userId = TenantContext.getUserId();
    const orgId = TenantContext.getOrgId();
    const membership = await this.membershipRepo.findOne({
      where: { userId, orgId, isActive: true },
    });
    if (membership?.role !== MembershipRole.SUPER_ADMIN) {
      throw new ForbiddenException('Super admin required for system templates');
    }
  }
}
