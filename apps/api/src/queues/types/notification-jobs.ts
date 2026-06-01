import type { NotificationChannel, NotificationPriority } from '@estateops/shared';

export interface NotificationDeliveryJobData {
  notificationId: string;
  orgId: string;
  channel: NotificationChannel;
  priority: NotificationPriority;
}
