import type { MembershipRole } from '@estateops/shared';

export interface WsAuthenticatedUser {
  userId: string;
  orgId: string;
  role: MembershipRole;
  email?: string;
  tenantId?: string;
}

export interface WsSocketMeta {
  socketId: string;
  user: WsAuthenticatedUser;
}
