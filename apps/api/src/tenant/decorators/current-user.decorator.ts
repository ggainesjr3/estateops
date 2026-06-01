import { createParamDecorator, UnauthorizedException } from '@nestjs/common';
import { TenantContext } from '../tenant.context';

export const CurrentUser = createParamDecorator((): string => {
  try {
    return TenantContext.getUserId();
  } catch {
    throw new UnauthorizedException('User context is required');
  }
});
