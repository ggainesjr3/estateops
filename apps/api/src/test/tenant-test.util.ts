import { JwtService } from '@nestjs/jwt';
import type { JwtAccessPayload } from '@estateops/shared';
import { TenantContext } from '../tenant/tenant.context';

export const TEST_JWT_SECRET = 'test-jwt-secret';

export function signTestToken(
  jwtService: JwtService,
  payload: Partial<JwtAccessPayload> & { sub: string; org_id: string },
): string {
  return jwtService.sign(payload, { secret: TEST_JWT_SECRET });
}

export function runWithTenant<T>(
  orgId: string,
  userId: string,
  fn: () => T,
): T {
  return TenantContext.run({ orgId, userId }, fn);
}
