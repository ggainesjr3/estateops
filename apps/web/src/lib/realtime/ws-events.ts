/** Server → client Socket.io event names. */
export const WsServerEvents = {
  MAINTENANCE_UPDATED: 'maintenance:updated',
  MAINTENANCE_ASSIGNED: 'maintenance:assigned',
  PAYMENT_RECEIVED: 'payment:received',
  PAYMENT_FAILED: 'payment:failed',
  LEASE_STATUS_CHANGED: 'lease:status_changed',
  NOTIFICATION_NEW: 'notification:new',
  AI_PROCESSING_COMPLETE: 'ai:processing_complete',
} as const;

/** Client → server Socket.io event names. */
export const WsClientEvents = {
  NOTIFICATIONS_MARK_READ: 'notifications:mark_read',
} as const;

export type WsServerEventName =
  (typeof WsServerEvents)[keyof typeof WsServerEvents];

export interface MaintenanceUpdatedPayload {
  ticketId: string;
  status: string;
  updatedBy: string;
}

export interface MaintenanceAssignedPayload {
  ticketId: string;
  assignedTo: string;
}

export interface PaymentReceivedPayload {
  invoiceId: string;
  amount: number;
  tenantId: string;
}

export interface PaymentFailedPayload {
  invoiceId: string;
  reason: string;
}

export interface LeaseStatusChangedPayload {
  leaseId: string;
  oldStatus: string;
  newStatus: string;
}

export interface AiProcessingCompletePayload {
  jobId: string;
  type: string;
  result: unknown;
}
