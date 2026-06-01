import { Injectable, Logger } from '@nestjs/common';
import type { Request } from 'express';
import { NotificationStatus } from '@estateops/shared';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '../entities/notification.entity';
import { NotificationDeliveryEventRepository } from '../repositories/notification-delivery-event.repository';
import { NotificationStatusService } from './notification-status.service';
import { NotificationSmsChannelService } from './notification-sms-channel.service';

interface SendGridEvent {
  event?: string;
  sg_message_id?: string;
  reason?: string;
}

@Injectable()
export class NotificationWebhookService {
  private readonly logger = new Logger(NotificationWebhookService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    private readonly deliveryEvents: NotificationDeliveryEventRepository,
    private readonly status: NotificationStatusService,
    private readonly smsChannel: NotificationSmsChannelService,
  ) {}

  async handleSendGridEvents(body: unknown): Promise<void> {
    const events = Array.isArray(body) ? body : [body];
    for (const raw of events) {
      const event = raw as SendGridEvent;
      const messageId = event.sg_message_id?.split('.')[0];
      if (!messageId) continue;

      const notification = await this.notificationRepo.findOne({
        where: { providerMessageId: messageId },
      });
      if (!notification) continue;

      const type = event.event ?? 'unknown';
      await this.deliveryEvents.create({
        notificationId: notification.id,
        provider: 'sendgrid',
        eventType: type,
        externalId: messageId,
        payload: event as Record<string, unknown>,
      });

      if (type === 'delivered') {
        await this.status.markDelivered(notification.id);
      } else if (type === 'bounce' || type === 'dropped' || type === 'spamreport') {
        await this.status.markFailed(
          notification.id,
          event.reason ?? `SendGrid ${type}`,
        );
        await this.deliveryEvents.create({
          notificationId: notification.id,
          provider: 'sendgrid',
          eventType: 'complaint',
          externalId: messageId,
          payload: event as Record<string, unknown>,
        });
      }
    }
  }

  async handleTwilioStatus(body: Record<string, string>, _req: Request): Promise<void> {
    const messageSid = body.MessageSid ?? body.SmsSid;
    const smsStatus = body.MessageStatus ?? body.SmsStatus;
    const bodyText = body.Body ?? '';

    if (bodyText.trim().toUpperCase() === 'STOP' && body.From) {
      await this.smsChannel.handleInboundStop(body.From);
      return;
    }

    if (!messageSid) return;

    const notification = await this.notificationRepo.findOne({
      where: { providerMessageId: messageSid },
    });
    if (!notification) return;

    await this.deliveryEvents.create({
      notificationId: notification.id,
      provider: 'twilio',
      eventType: smsStatus ?? 'status',
      externalId: messageSid,
      payload: body as Record<string, unknown>,
    });

    if (smsStatus === 'delivered') {
      await this.status.markDelivered(notification.id);
    } else if (smsStatus === 'failed' || smsStatus === 'undelivered') {
      await this.status.markFailed(
        notification.id,
        body.ErrorMessage ?? `Twilio ${smsStatus}`,
      );
    } else if (smsStatus === 'sent') {
      const row = await this.notificationRepo.findOne({ where: { id: notification.id } });
      if (row && row.status === NotificationStatus.PENDING) {
        await this.status.markSent(notification.id, messageSid);
      }
    }
  }
}
