import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { LeaseStatus } from '@estateops/shared';

const VALID_TRANSITIONS: Readonly<Record<LeaseStatus, readonly LeaseStatus[]>> = {
  [LeaseStatus.DRAFT]: [LeaseStatus.PENDING],
  [LeaseStatus.PENDING]: [LeaseStatus.ACTIVE, LeaseStatus.DRAFT],
  [LeaseStatus.ACTIVE]: [
    LeaseStatus.RENEWED,
    LeaseStatus.TERMINATED,
    LeaseStatus.EXPIRED,
  ],
  [LeaseStatus.EXPIRED]: [],
  [LeaseStatus.RENEWED]: [],
  [LeaseStatus.TERMINATED]: [],
};

@Injectable()
export class LeaseStateMachineService {
  canTransition(from: LeaseStatus, to: LeaseStatus): boolean {
    return VALID_TRANSITIONS[from]?.includes(to) ?? false;
  }

  assertTransition(from: LeaseStatus, to: LeaseStatus): void {
    if (!this.canTransition(from, to)) {
      throw new UnprocessableEntityException(
        `Invalid lease status transition from '${from}' to '${to}'. ` +
          `Allowed transitions from '${from}': ${this.allowedTargets(from).join(', ') || 'none'}.`,
      );
    }
  }

  allowedTargets(from: LeaseStatus): LeaseStatus[] {
    return [...(VALID_TRANSITIONS[from] ?? [])];
  }
}
