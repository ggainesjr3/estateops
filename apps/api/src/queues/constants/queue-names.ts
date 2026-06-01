export const EMAIL_QUEUE = 'email-queue';
export const SMS_QUEUE = 'sms-queue';
export const AI_PROCESSING_QUEUE = 'ai-processing-queue';
export const LEASE_PROCESSING_QUEUE = 'lease-processing-queue';
export const MAINTENANCE_TRIAGE_QUEUE = 'maintenance-triage-queue';
export const ACCOUNTING_QUEUE = 'accounting-queue';
export const WEBHOOK_QUEUE = 'webhook-queue';
export const ZOOM_PROCESSING_QUEUE = 'zoom-processing-queue';
export const NOTIFICATION_DELIVERY_QUEUE = 'notification-delivery-queue';

export const ALL_QUEUE_NAMES = [
  EMAIL_QUEUE,
  SMS_QUEUE,
  NOTIFICATION_DELIVERY_QUEUE,
  AI_PROCESSING_QUEUE,
  LEASE_PROCESSING_QUEUE,
  MAINTENANCE_TRIAGE_QUEUE,
  ACCOUNTING_QUEUE,
  WEBHOOK_QUEUE,
  ZOOM_PROCESSING_QUEUE,
] as const;

export type QueueName = (typeof ALL_QUEUE_NAMES)[number];

/** @deprecated Use LEASE_PROCESSING_QUEUE */
export const LEGACY_LEASE_EXPIRATION_QUEUE = 'lease-expiration';

/** @deprecated Use ACCOUNTING_QUEUE */
export const LEGACY_AUTOPAY_QUEUE = 'autopay';
