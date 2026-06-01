import { MaintenanceTicketPriority } from '@estateops/shared';

const SLA_MS: Record<MaintenanceTicketPriority, number> = {
  [MaintenanceTicketPriority.CRITICAL]: 4 * 60 * 60 * 1000,
  [MaintenanceTicketPriority.HIGH]: 24 * 60 * 60 * 1000,
  [MaintenanceTicketPriority.MEDIUM]: 72 * 60 * 60 * 1000,
  [MaintenanceTicketPriority.LOW]: 7 * 24 * 60 * 60 * 1000,
};

export function computeSlaDueAt(
  priority: MaintenanceTicketPriority,
  from: Date = new Date(),
): Date {
  return new Date(from.getTime() + SLA_MS[priority]);
}

export function slaDelayMs(slaDueAt: Date, from: Date = new Date()): number {
  return Math.max(0, slaDueAt.getTime() - from.getTime());
}
