import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { NotificationChannel } from '@estateops/shared';
import { TenantContext } from '../../../tenant/tenant.context';
import { NotificationTemplate } from '../entities/notification-template.entity';

@Injectable()
export class NotificationTemplateRepository {
  constructor(
    @InjectRepository(NotificationTemplate)
    private readonly repository: Repository<NotificationTemplate>,
  ) {}

  private getOrgId(): string {
    return TenantContext.getOrgId();
  }

  async findResolvedTemplate(
    name: string,
    channel: NotificationChannel,
  ): Promise<NotificationTemplate | null> {
    const orgId = this.getOrgId();
    const orgTemplate = await this.repository.findOne({
      where: { orgId, name, channel },
    });
    if (orgTemplate) return orgTemplate;

    return this.repository.findOne({
      where: { orgId: IsNull(), name, channel },
    });
  }

  async findByIdForOrgOrSystem(id: string): Promise<NotificationTemplate | null> {
    const orgId = this.getOrgId();
    return this.repository.findOne({
      where: [
        { id, orgId },
        { id, orgId: IsNull() },
      ],
    });
  }

  async listForOrg(): Promise<NotificationTemplate[]> {
    const orgId = this.getOrgId();
    return this.repository.find({
      where: [{ orgId }, { orgId: IsNull() }],
      order: { name: 'ASC', channel: 'ASC' },
    });
  }

  async findById(id: string): Promise<NotificationTemplate | null> {
    return this.findByIdForOrgOrSystem(id);
  }

  async createOrgTemplate(
    dto: Partial<NotificationTemplate>,
  ): Promise<NotificationTemplate> {
    const entity = this.repository.create({
      ...dto,
      orgId: this.getOrgId(),
      createdBy: dto.createdBy ?? TenantContext.getUserId(),
    });
    return this.repository.save(entity);
  }

  async update(
    id: string,
    dto: Partial<NotificationTemplate>,
  ): Promise<NotificationTemplate> {
    const existing = await this.findByIdForOrgOrSystem(id);
    if (!existing) {
      throw new Error('Template not found');
    }
    Object.assign(existing, dto);
    return this.repository.save(existing);
  }
}
