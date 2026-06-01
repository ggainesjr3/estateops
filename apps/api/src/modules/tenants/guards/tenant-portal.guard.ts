import { CanActivate, ForbiddenException, Injectable } from '@nestjs/common';
import { TenantContext } from '../../../tenant/tenant.context';
import { TenantRepository } from '../repositories/tenant.repository';

/** Ensures the authenticated user has a tenant record linked in the current org. */
@Injectable()
export class TenantPortalGuard implements CanActivate {
  constructor(private readonly tenantRepository: TenantRepository) {}

  async canActivate(): Promise<boolean> {
    const tenant = await this.tenantRepository.findByUserId(TenantContext.getUserId());
    if (!tenant) {
      throw new ForbiddenException('No tenant profile linked to this user');
    }
    return true;
  }
}
