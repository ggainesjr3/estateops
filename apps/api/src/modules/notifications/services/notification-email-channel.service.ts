import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '../entities/notification.entity';
import { Organization } from '../../organizations/entities/organization.entity';
import { User } from '../../users/entities/user.entity';
import { BrandedEmailWrapperService } from './branded-email-wrapper.service';
import { NotificationEmailDeliveryService } from './notification-email-delivery.service';
import { NotificationStatusService } from './notification-status.service';

@Injectable()
export class NotificationEmailChannelService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly wrapper: BrandedEmailWrapperService,
    private readonly delivery: NotificationEmailDeliveryService,
    private readonly status: NotificationStatusService,
  ) {}

  async deliver(notificationId: string): Promise<void> {
    const notification = await this.notificationRepo.findOne({
      where: { id: notificationId },
    });
    if (!notification) return;

    const [user, org] = await Promise.all([
      this.userRepo.findOne({ where: { id: notification.userId } }),
      this.orgRepo.findOne({ where: { id: notification.orgId } }),
    ]);
    if (!user?.email) {
      await this.status.markFailed(notificationId, 'User email not found');
      return;
    }

    const wrapped = this.wrapper.wrap({
      orgName: org?.name ?? 'EstateOps',
      logoUrl: org?.brandingLogoUrl ?? null,
      primaryColor: org?.brandingPrimaryColor ?? '#0f172a',
      subject: notification.subject ?? 'Notification',
      bodyHtml: notification.body,
    });

    try {
      const result = await this.delivery.send({
        to: user.email,
        subject: notification.subject ?? 'Notification',
        html: wrapped.html,
        text: wrapped.text,
      });
      await this.status.markSent(notificationId, result.messageId);
      await this.status.markDelivered(notificationId);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Email delivery failed';
      await this.status.markFailed(notificationId, message);
      throw e;
    }
  }
}
