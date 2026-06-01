type LeaseStatus =
  | 'draft'
  | 'pending'
  | 'active'
  | 'expired'
  | 'renewed'
  | 'terminated';

const VALID_TRANSITIONS: Readonly<Record<LeaseStatus, readonly LeaseStatus[]>> = {
  draft: ['pending'],
  pending: ['active', 'draft'],
  active: ['renewed', 'terminated', 'expired'],
  expired: [],
  renewed: [],
  terminated: [],
};

export type LeaseActionId =
  | 'send'
  | 'recall'
  | 'sign-tenant'
  | 'sign-manager'
  | 'renew'
  | 'terminate';

export interface LeaseAction {
  id: LeaseActionId;
  label: string;
  targetStatus: LeaseStatus;
  variant?: 'default' | 'destructive' | 'outline';
}

export function allowedTargets(from: LeaseStatus): LeaseStatus[] {
  return [...(VALID_TRANSITIONS[from] ?? [])];
}

export function canTransition(from: LeaseStatus, to: LeaseStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function getLeaseActions(status: LeaseStatus): LeaseAction[] {
  switch (status) {
    case 'draft':
      return [
        {
          id: 'send',
          label: 'Send for signing',
          targetStatus: 'pending',
          variant: 'default',
        },
      ];
    case 'pending':
      return [
        {
          id: 'recall',
          label: 'Recall to draft',
          targetStatus: 'draft',
          variant: 'outline',
        },
        {
          id: 'sign-tenant',
          label: 'Record tenant signature',
          targetStatus: 'active',
          variant: 'default',
        },
        {
          id: 'sign-manager',
          label: 'Record manager signature',
          targetStatus: 'active',
          variant: 'default',
        },
      ];
    case 'active':
      return [
        {
          id: 'renew',
          label: 'Renew lease',
          targetStatus: 'renewed',
          variant: 'default',
        },
        {
          id: 'terminate',
          label: 'Terminate',
          targetStatus: 'terminated',
          variant: 'destructive',
        },
      ];
    default:
      return [];
  }
}
