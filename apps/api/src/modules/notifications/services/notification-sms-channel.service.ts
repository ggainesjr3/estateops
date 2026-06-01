import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '../entities/notification.entity';
import { User } from '../../users/entities/user.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { NotificationOptOutRepository } from '../repositories/notification-opt-out.repository';
import { NotificationStatusService } from './notification-status.service';
import { NotificationChannel } from '@estateops/shared';

const SMS_MAX_LENGTH = 1600;
const STOP_SUFFIX = ' Reply STOP to opt out.';

@Injectable()
export class NotificationSmsChannelService {
  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
    private readonly optOuts: NotificationOptOutRepository,
    private readonly status: NotificationStatusService,
  ) {}

  async deliver(notificationId: string): Promise<void> {
    const notification = await this.notificationRepo.findOne({
      where: { id: notificationId },
    });
    if (!notification) return;

    const phone = await this.resolvePhone(notification);
    if (!phone) {
      await this.status.markFailed(notificationId, 'No phone number for recipient');
      return;
    }

    let message = notification.body;
    if (!/\bSTOP\b/i.test(message)) {
      message += STOP_SUFFIX;
    }
    if (message.length > SMS_MAX_LENGTH) {
      await this.status.markFailed(
        notificationId,
        `SMS exceeds ${SMS_MAX_LENGTH} characters (${message.length})`,
      );
      return;
    }

    if (await this.isStopReply(phone)) {
      await this.optOuts.optOut(notification.userId, NotificationChannel.SMS);
      await this.status.markFailed(notificationId, 'Recipient opted out (STOP)');
      return;
    }

    try {
      const sid = await this.sendTwilio(phone, message);
      await this.status.markSent(notificationId, sid);
      await this.status.markDelivered(notificationId);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'SMS failed';
      await this.status.markFailed(notificationId, msg);
      throw e;
    }
  }

  async handleInboundStop(from: string): Promise<void> {
    const normalized = normalizePhone(from);
    const user = await this.userRepo
      .createQueryBuilder('u')
      .where("regexp_replace(coalesce(u.phone, ''), '[^0-9+]', '', 'g') = :p", {
        p: normalized.replace(/\D/g, ''),
      })
      .getOne();
    if (!user) return;
    await this.optOuts.optOut(user.id, NotificationChannel.SMS);
  }

  private async resolvePhone(notification: Notification): Promise<string | null> {
    if (notification.tenantId) {
      const tenant = await this.tenantRepo.findOne({
        where: { id: notification.tenantId },
      });
      if (tenant?.phone) return tenant.phone;
    }
    const user = await this.userRepo.findOne({ where: { id: notification.userId } });
    return user?.phone ?? null;
  }

  private async isStopReply(_phone: string): Promise<boolean> {
    return false;
  }

  private async sendTwilio(to: string, message: string): Promise<string> {
    const accountSid = this.configService.get<string>('sms.twilioAccountSid');
    const authToken = this.configService.get<string>('sms.twilioAuthToken');
    const from = this.configService.get<string>('sms.twilioFromNumber');
    if (!accountSid || !authToken || !from) {
      return `twilio-stub-${Date.now()}`;
    }
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const body = new URLSearchParams({ To: to, From: from, Body: message });
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });
    if (!response.ok) {
      throw new Error(`Twilio failed (${response.status}): ${await response.text()}`);
    }
    const json = (await response.json()) as { sid: string };
    return json.sid;
  }
}

function normalizePhone(phone: string): string {
  return phone.trim();
}
