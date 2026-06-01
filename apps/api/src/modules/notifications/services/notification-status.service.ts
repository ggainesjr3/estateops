import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationStatus } from '@estateops/shared';
import { Notification } from '../entities/notification.entity';
import { NotificationDeliveryEventRepository } from '../repositories/notification-delivery-event.repository';

@Injectable()
export class NotificationStatusService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    private readonly deliveryEvents: NotificationDeliveryEventRepository,
  ) {}

  async markSent(
    notificationId: string,
    providerMessageId?: string,
  ): Promise<Notification | null> {
    const row = await this.notificationRepo.findOne({ where: { id: notificationId } });
    if (!row) return null;
    row.status = NotificationStatus.SENT;
    row.sentAt = new Date();
    if (providerMessageId) row.providerMessageId = providerMessageId;
    return this.notificationRepo.save(row);
  }

  async markDelivered(notificationId: string): Promise<Notification | null> {
    const row = await this.notificationRepo.findOne({ where: { id: notificationId } });
    if (!row) return null;
    row.status = NotificationStatus.DELIVERED;
    row.deliveredAt = new Date();
    if (!row.sentAt) row.sentAt = new Date();
    return this.notificationRepo.save(row);
  }

  async markFailed(notificationId: string, reason: string): Promise<Notification | null> {
    const row = await this.notificationRepo.findOne({ where: { id: notificationId } });
    if (!row) return null;
    row.status = NotificationStatus.FAILED;
    row.failureReason = reason;
    row.retryCount += 1;
    return this.notificationRepo.save(row);
  }

  async recordDeliveryEvent(
    notificationId: string,
    provider: string,
    eventType: string,
    externalId: string | null,
    payload: Record<string, unknown>,
  ): Promise<void> {
    await this.deliveryEvents.create({
      notificationId,
      provider,
      eventType,
      externalId,
      payload,
    });
  }
}
