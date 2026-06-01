import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import notificationConfig from '../../config/notification.config';
import emailConfig from '../../config/email.config';
import smsConfig from '../../config/sms.config';
import { QueueModule } from '../../queues/queue.module';
import { Organization } from '../organizations/entities/organization.entity';
import { User } from '../users/entities/user.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { OrganizationMembership } from '../organization-memberships/entities/organization-membership.entity';
import { NotificationTemplate } from './entities/notification-template.entity';
import { Notification } from './entities/notification.entity';
import { NotificationOptOut } from './entities/notification-opt-out.entity';
import { NotificationPushSubscription } from './entities/notification-push-subscription.entity';
import { NotificationDeliveryEvent } from './entities/notification-delivery-event.entity';
import { NotificationRepository } from './repositories/notification.repository';
import { NotificationTemplateRepository } from './repositories/notification-template.repository';
import { NotificationOptOutRepository } from './repositories/notification-opt-out.repository';
import { NotificationPushSubscriptionRepository } from './repositories/notification-push-subscription.repository';
import { NotificationDeliveryEventRepository } from './repositories/notification-delivery-event.repository';
import { NotificationService } from './services/notification.service';
import { NotificationTemplateService } from './services/notification-template.service';
import { TemplateRendererService } from './services/template-renderer.service';
import { NotificationStatusService } from './services/notification-status.service';
import { BrandedEmailWrapperService } from './services/branded-email-wrapper.service';
import { NotificationEmailDeliveryService } from './services/notification-email-delivery.service';
import { NotificationEmailChannelService } from './services/notification-email-channel.service';
import { NotificationSmsChannelService } from './services/notification-sms-channel.service';
import { NotificationPushChannelService } from './services/notification-push-channel.service';
import { NotificationInAppChannelService } from './services/notification-in-app-channel.service';
import { NotificationBroadcastService } from './services/notification-broadcast.service';
import { NotificationChannelDispatcherService } from './services/notification-channel-dispatcher.service';
import { NotificationWebhookService } from './services/notification-webhook.service';
import { NotificationsController } from './notifications.controller';
import { AdminNotificationTemplatesController } from './admin-notification-templates.controller';
import { NotificationWebhooksController } from './notification-webhooks.controller';
import { RealtimeModule } from '../../realtime/realtime.module';

@Module({
  imports: [
    ConfigModule.forFeature(notificationConfig),
    ConfigModule.forFeature(emailConfig),
    ConfigModule.forFeature(smsConfig),
    forwardRef(() => QueueModule),
    forwardRef(() => RealtimeModule),
    TypeOrmModule.forFeature([
      NotificationTemplate,
      Notification,
      NotificationOptOut,
      NotificationPushSubscription,
      NotificationDeliveryEvent,
      Organization,
      User,
      Tenant,
      OrganizationMembership,
    ]),
  ],
  controllers: [
    NotificationsController,
    AdminNotificationTemplatesController,
    NotificationWebhooksController,
  ],
  providers: [
    NotificationRepository,
    NotificationTemplateRepository,
    NotificationOptOutRepository,
    NotificationPushSubscriptionRepository,
    NotificationDeliveryEventRepository,
    TemplateRendererService,
    NotificationStatusService,
    BrandedEmailWrapperService,
    NotificationEmailDeliveryService,
    NotificationEmailChannelService,
    NotificationSmsChannelService,
    NotificationPushChannelService,
    NotificationInAppChannelService,
    NotificationBroadcastService,
    NotificationChannelDispatcherService,
    NotificationService,
    NotificationTemplateService,
    NotificationWebhookService,
  ],
  exports: [
    NotificationService,
    NotificationChannelDispatcherService,
    NotificationTemplateRepository,
  ],
})
export class NotificationsModule {}
