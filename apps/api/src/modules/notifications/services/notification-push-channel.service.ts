import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import webpush from 'web-push';
import { PushSubscriptionPlatform } from '@estateops/shared';
import { Notification } from '../entities/notification.entity';
import { NotificationPushSubscriptionRepository } from '../repositories/notification-push-subscription.repository';
import { NotificationStatusService } from './notification-status.service';

@Injectable()
export class NotificationPushChannelService {
  private readonly logger = new Logger(NotificationPushChannelService.name);
  private vapidConfigured = false;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    private readonly subscriptions: NotificationPushSubscriptionRepository,
    private readonly status: NotificationStatusService,
  ) {
    this.configureVapid();
  }

  private configureVapid(): void {
    const publicKey = this.configService.get<string>('notification.vapidPublicKey');
    const privateKey = this.configService.get<string>('notification.vapidPrivateKey');
    const subject = this.configService.get<string>('notification.vapidSubject');
    if (publicKey && privateKey) {
      webpush.setVapidDetails(subject ?? 'mailto:noreply@estateops.local', publicKey, privateKey);
      this.vapidConfigured = true;
    }
  }

  async deliver(notificationId: string): Promise<void> {
    const notification = await this.notificationRepo.findOne({
      where: { id: notificationId },
    });
    if (!notification) return;

    const subs = await this.subscriptions.findActiveForUser(notification.userId);
    if (!subs.length) {
      await this.status.markFailed(notificationId, 'No push subscriptions');
      return;
    }

    const payload = JSON.stringify({
      title: notification.subject ?? 'EstateOps',
      body: notification.body.replace(/<[^>]+>/g, ' ').trim().slice(0, 240),
      notificationId: notification.id,
      referenceType: notification.referenceType,
      referenceId: notification.referenceId,
    });

    let lastId: string | undefined;
    let anySuccess = false;

    for (const sub of subs) {
      try {
        if (sub.platform === PushSubscriptionPlatform.WEB && this.vapidConfigured && sub.keys) {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: sub.keys,
            },
            payload,
          );
          lastId = sub.endpoint;
          anySuccess = true;
        } else if (sub.platform === PushSubscriptionPlatform.EXPO && sub.expoPushToken) {
          await this.sendExpo(sub.expoPushToken, notification.subject ?? 'Notification', notification.body);
          lastId = sub.expoPushToken;
          anySuccess = true;
        }
      } catch (e) {
        this.logger.warn(
          `Push failed for subscription ${sub.id}: ${e instanceof Error ? e.message : e}`,
        );
      }
    }

    if (anySuccess && lastId) {
      await this.status.markSent(notificationId, lastId);
      await this.status.markDelivered(notificationId);
    } else {
      await this.status.markFailed(notificationId, 'All push deliveries failed');
    }
  }

  private async sendExpo(token: string, title: string, body: string): Promise<void> {
    const accessToken = this.configService.get<string>('notification.expoAccessToken');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        to: token,
        title,
        body: body.replace(/<[^>]+>/g, ' ').trim().slice(0, 240),
        sound: 'default',
      }),
    });
    if (!response.ok) {
      throw new Error(`Expo push failed (${response.status})`);
    }
  }
}
