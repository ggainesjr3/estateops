import type { Notification } from '../entities/notification.entity';
import type { NotificationTemplate } from '../entities/notification-template.entity';
import type {
  NotificationResponseDto,
  NotificationTemplateResponseDto,
} from '../dto/notification.dto';

export function toNotificationResponseDto(row: Notification): NotificationResponseDto {
  return {
    id: row.id,
    channel: row.channel,
    subject: row.subject,
    body: row.body,
    status: row.status,
    priority: row.priority,
    referenceType: row.referenceType,
    referenceId: row.referenceId,
    readAt: row.readAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export function toNotificationTemplateResponseDto(
  row: NotificationTemplate,
): NotificationTemplateResponseDto {
  return {
    id: row.id,
    orgId: row.orgId,
    name: row.name,
    channel: row.channel,
    subject: row.subject,
    body: row.body,
    variables: row.variables ?? [],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
