import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import type { MembershipRole } from '@estateops/shared';
import { Repository } from 'typeorm';
import { OrganizationMembership } from '../../modules/organization-memberships/entities/organization-membership.entity';
import { TenantContext } from '../../tenant/tenant.context';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectRepository(OrganizationMembership)
    private readonly memberships: Repository<OrganizationMembership>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<MembershipRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const jwtRole = request.user?.role;

    const membership = await this.memberships.findOne({
      where: {
        userId: TenantContext.getUserId(),
        orgId: TenantContext.getOrgId(),
        isActive: true,
      },
    });

    if (!membership || !requiredRoles.includes(membership.role)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    if (jwtRole && membership.role !== jwtRole) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
