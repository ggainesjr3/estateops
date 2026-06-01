import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  NotificationChannel,
  NotificationPriority,
  NotificationStatus,
} from '@estateops/shared';
import { TenantContext } from '../../../tenant/tenant.context';
import { NotificationRepository } from '../repositories/notification.repository';
import { NotificationTemplateRepository } from '../repositories/notification-template.repository';
import { NotificationOptOutRepository } from '../repositories/notification-opt-out.repository';
import { TemplateRendererService } from './template-renderer.service';
import { NotificationChannelDispatcherService } from './notification-channel-dispatcher.service';
import { SendNotificationDto } from '../dto/notification.dto';
import { toNotificationResponseDto } from '../mappers/notification.mapper';
import type { NotificationListFilters } from '../repositories/notification.repository';
import { Notification } from '../entities/notification.entity';
import { QueueProducerService } from '../../../queues/services/queue-producer.service';
import type { NotificationDeliveryJobData } from '../../../queues/types/notification-jobs';

@Injectable()
export class NotificationService {
  constructor(
    private readonly notifications: NotificationRepository,
    private readonly templates: NotificationTemplateRepository,
    private readonly optOuts: NotificationOptOutRepository,
    private readonly renderer: TemplateRendererService,
    private readonly dispatcher: NotificationChannelDispatcherService,
    private readonly queueProducer: QueueProducerService,
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
  ) {}

  async send(dto: SendNotificationDto): Promise<ReturnType<typeof toNotificationResponseDto>> {
    const row = await this.prepareAndCreate(dto);
    await this.dispatch(row);
    return toNotificationResponseDto(
      (await this.notificationRepo.findOne({ where: { id: row.id } }))!,
    );
  }

  async sendBulk(dtos: SendNotificationDto[]): Promise<number> {
    let count = 0;
    for (const dto of dtos) {
      const row = await this.prepareAndCreate(dto);
      await this.dispatch(row);
      count += 1;
    }
    return count;
  }

  async markRead(notificationId: string, userId: string) {
    const currentUserId = TenantContext.getUserId();
    if (userId !== currentUserId) {
      throw new ForbiddenException('Cannot mark another user notification as read');
    }
    const row = await this.notifications.markRead(notificationId, userId);
    if (!row) throw new NotFoundException('Notification not found');
    return toNotificationResponseDto(row);
  }

  async markAllRead(userId: string) {
    const currentUserId = TenantContext.getUserId();
    if (userId !== currentUserId) {
      throw new ForbiddenException('Cannot mark another user notifications as read');
    }
    const updated = await this.notifications.markAllInAppRead(userId);
    return { updated };
  }

  async getForUser(userId: string, filters: NotificationListFilters) {
    const currentUserId = TenantContext.getUserId();
    if (userId !== currentUserId) {
      throw new ForbiddenException('Cannot list another user notifications');
    }
    const page = await this.notifications.listForUser(userId, filters);
    return {
      items: page.items.map(toNotificationResponseDto),
      nextCursor: page.nextCursor,
    };
  }

  async getUnreadCount(userId: string) {
    const currentUserId = TenantContext.getUserId();
    if (userId !== currentUserId) {
      throw new ForbiddenException('Cannot read another user unread count');
    }
    const count = await this.notifications.countUnreadInAppWhereReadNull(userId);
    return { count };
  }

  private async prepareAndCreate(dto: SendNotificationDto): Promise<Notification> {
    const orgId = TenantContext.getOrgId();

    if (await this.optOuts.isOptedOut(dto.userId, dto.channel)) {
      throw new BadRequestException(`User opted out of ${dto.channel} notifications`);
    }

    let subject = dto.subject ?? null;
    let body = dto.body ?? '';
    let templateId: string | null = null;

    if (!dto.body) {
      const template = dto.templateId
        ? await this.templates.findByIdForOrgOrSystem(dto.templateId)
        : dto.templateName
          ? await this.templates.findResolvedTemplate(dto.templateName, dto.channel)
          : null;

      if (!template) {
        throw new BadRequestException('Template not found');
      }
      templateId = template.id;
      const vars = (dto.variables ?? {}) as Record<string, unknown>;
      if (template.subject) {
        subject = dto.subject ?? this.renderer.render(template.subject, vars);
      }
      body = this.renderer.render(template.body, vars);
    }

    if (!body.trim()) {
      throw new BadRequestException('Notification body is required');
    }

    return this.notifications.create({
      userId: dto.userId,
      tenantId: dto.tenantId ?? null,
      channel: dto.channel,
      templateId,
      subject,
      body,
      priority: dto.priority ?? NotificationPriority.NORMAL,
      referenceType: dto.referenceType ?? null,
      referenceId: dto.referenceId ?? null,
      status: NotificationStatus.PENDING,
      retryCount: 0,
    } as Notification);
  }

  private async dispatch(row: Notification): Promise<void> {
    const jobData: NotificationDeliveryJobData = {
      notificationId: row.id,
      orgId: row.orgId,
      channel: row.channel,
      priority: row.priority,
    };

    if (row.priority === NotificationPriority.EMERGENCY) {
      await this.dispatcher.deliver(row.id, row.channel);
      return;
    }

    if (row.channel === NotificationChannel.IN_APP) {
      await this.dispatcher.deliver(row.id, row.channel);
      return;
    }

    await this.queueProducer.enqueueNotificationDelivery(jobData);
  }
}
