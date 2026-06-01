import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { MaintenanceTicketStatus } from '@estateops/shared';

const LINEAR_TRANSITIONS: Readonly<
  Record<MaintenanceTicketStatus, readonly MaintenanceTicketStatus[]>
> = {
  [MaintenanceTicketStatus.CREATED]: [MaintenanceTicketStatus.TRIAGED],
  [MaintenanceTicketStatus.TRIAGED]: [MaintenanceTicketStatus.ASSIGNED],
  [MaintenanceTicketStatus.ASSIGNED]: [MaintenanceTicketStatus.DISPATCHED],
  [MaintenanceTicketStatus.DISPATCHED]: [MaintenanceTicketStatus.IN_PROGRESS],
  [MaintenanceTicketStatus.IN_PROGRESS]: [MaintenanceTicketStatus.COMPLETED],
  [MaintenanceTicketStatus.COMPLETED]: [MaintenanceTicketStatus.INVOICED],
  [MaintenanceTicketStatus.INVOICED]: [MaintenanceTicketStatus.CLOSED],
  [MaintenanceTicketStatus.CLOSED]: [],
};

const ALL_STATUSES = Object.values(MaintenanceTicketStatus);

@Injectable()
export class TicketStateMachineService {
  canTransition(from: MaintenanceTicketStatus, to: MaintenanceTicketStatus): boolean {
    if (from === to) {
      return false;
    }
    if (to === MaintenanceTicketStatus.CREATED) {
      return this.isReopen(from);
    }
    return LINEAR_TRANSITIONS[from]?.includes(to) ?? false;
  }

  assertTransition(from: MaintenanceTicketStatus, to: MaintenanceTicketStatus): void {
    if (!this.canTransition(from, to)) {
      throw new UnprocessableEntityException(
        `Invalid maintenance ticket status transition from '${from}' to '${to}'. ` +
          `Allowed transitions from '${from}': ${this.allowedTargets(from).join(', ') || 'none'}.`,
      );
    }
  }

  isReopen(from: MaintenanceTicketStatus): boolean {
    return from !== MaintenanceTicketStatus.CREATED;
  }

  requiresReopenNote(from: MaintenanceTicketStatus, to: MaintenanceTicketStatus): boolean {
    return to === MaintenanceTicketStatus.CREATED && this.isReopen(from);
  }

  allowedTargets(from: MaintenanceTicketStatus): MaintenanceTicketStatus[] {
    const linear = [...(LINEAR_TRANSITIONS[from] ?? [])];
    if (this.isReopen(from)) {
      return [...linear, MaintenanceTicketStatus.CREATED];
    }
    return linear;
  }

  allStatuses(): MaintenanceTicketStatus[] {
    return [...ALL_STATUSES];
  }
}
