import { Inject, Injectable, Logger, Optional, forwardRef } from '@nestjs/common';
import { NotificationStatus, WsServerEvents } from '@estateops/shared';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventsService } from '../../../realtime/services/events.service';
import { Notification } from '../entities/notification.entity';
import { toNotificationResponseDto } from '../mappers/notification.mapper';
import { NotificationBroadcastService } from './notification-broadcast.service';
import { NotificationStatusService } from './notification-status.service';

@Injectable()
export class NotificationInAppChannelService {
  private readonly logger = new Logger(NotificationInAppChannelService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    private readonly broadcast: NotificationBroadcastService,
    private readonly status: NotificationStatusService,
    @Optional()
    @Inject(forwardRef(() => EventsService))
    private readonly events?: EventsService,
  ) {}

  async deliver(notificationId: string): Promise<void> {
    const notification = await this.notificationRepo.findOne({
      where: { id: notificationId },
    });
    if (!notification) return;

    notification.status = NotificationStatus.SENT;
    notification.sentAt = new Date();
    await this.notificationRepo.save(notification);

    await this.broadcast.publish({
      type: 'notification.created',
      orgId: notification.orgId,
      userId: notification.userId,
      notificationId: notification.id,
      subject: notification.subject,
      body: notification.body,
      referenceType: notification.referenceType,
      referenceId: notification.referenceId,
      createdAt: notification.createdAt.toISOString(),
    });

    this.events?.emitToUser(
      notification.userId,
      WsServerEvents.NOTIFICATION_NEW,
      toNotificationResponseDto(notification),
    );

    this.logger.debug(`In-app notification ${notificationId} stored and broadcast`);
  }
}
