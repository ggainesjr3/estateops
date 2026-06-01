import { createParamDecorator, UnauthorizedException } from '@nestjs/common';
import { TenantContext } from '../tenant.context';

export const CurrentOrg = createParamDecorator((): string => {
  try {
    return TenantContext.getOrgId();
  } catch {
    throw new UnauthorizedException('Organization context is required');
  }
});
