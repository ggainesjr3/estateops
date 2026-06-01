import { Injectable } from '@nestjs/common';
import { NotificationChannel } from '@estateops/shared';
import { NotificationEmailChannelService } from './notification-email-channel.service';
import { NotificationSmsChannelService } from './notification-sms-channel.service';
import { NotificationPushChannelService } from './notification-push-channel.service';
import { NotificationInAppChannelService } from './notification-in-app-channel.service';

@Injectable()
export class NotificationChannelDispatcherService {
  constructor(
    private readonly email: NotificationEmailChannelService,
    private readonly sms: NotificationSmsChannelService,
    private readonly push: NotificationPushChannelService,
    private readonly inApp: NotificationInAppChannelService,
  ) {}

  async deliver(notificationId: string, channel: NotificationChannel): Promise<void> {
    switch (channel) {
      case NotificationChannel.EMAIL:
        await this.email.deliver(notificationId);
        break;
      case NotificationChannel.SMS:
        await this.sms.deliver(notificationId);
        break;
      case NotificationChannel.PUSH:
        await this.push.deliver(notificationId);
        break;
      case NotificationChannel.IN_APP:
        await this.inApp.deliver(notificationId);
        break;
      default:
        throw new Error(`Unsupported channel: ${channel}`);
    }
  }
}
