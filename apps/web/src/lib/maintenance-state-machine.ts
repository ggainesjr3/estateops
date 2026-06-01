import type { MaintenanceTicketStatus } from '@web/lib/api/types';

const LINEAR: Readonly<Record<MaintenanceTicketStatus, readonly MaintenanceTicketStatus[]>> = {
  created: ['triaged'],
  triaged: ['assigned'],
  assigned: ['dispatched'],
  dispatched: ['in_progress'],
  in_progress: ['completed'],
  completed: ['invoiced'],
  invoiced: ['closed'],
  closed: [],
};

export function allowedTargets(from: MaintenanceTicketStatus): MaintenanceTicketStatus[] {
  const linear = [...(LINEAR[from] ?? [])];
  if (from !== 'created') {
    return [...linear, 'created'];
  }
  return linear;
}

export function canTransition(
  from: MaintenanceTicketStatus,
  to: MaintenanceTicketStatus,
): boolean {
  if (from === to) return false;
  if (to === 'created') {
    return from !== 'created';
  }
  return LINEAR[from]?.includes(to) ?? false;
}

export function requiresReopenNote(
  from: MaintenanceTicketStatus,
  to: MaintenanceTicketStatus,
): boolean {
  return to === 'created' && from !== 'created';
}

export const KANBAN_STATUSES: MaintenanceTicketStatus[] = [
  'created',
  'triaged',
  'assigned',
  'dispatched',
  'in_progress',
  'completed',
  'invoiced',
  'closed',
];

export const STATUS_LABELS: Record<MaintenanceTicketStatus, string> = {
  created: 'Created',
  triaged: 'Triaged',
  assigned: 'Assigned',
  dispatched: 'Dispatched',
  in_progress: 'In progress',
  completed: 'Completed',
  invoiced: 'Invoiced',
  closed: 'Closed',
};
