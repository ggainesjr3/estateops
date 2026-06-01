import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MembershipRole } from '@estateops/shared';
import { Repository } from 'typeorm';
import { OrganizationMembership } from '../../modules/organization-memberships/entities/organization-membership.entity';
import { TenantContext } from '../../tenant/tenant.context';

export interface OrgJobActor {
  orgId: string;
  userId: string;
}

@Injectable()
export class OrgJobContextService {
  constructor(
    @InjectRepository(OrganizationMembership)
    private readonly memberships: Repository<OrganizationMembership>,
  ) {}

  async resolveActor(orgId: string, preferredUserId?: string): Promise<OrgJobActor> {
    if (preferredUserId) {
      return { orgId, userId: preferredUserId };
    }

    const admin = await this.memberships.findOne({
      where: {
        orgId,
        isActive: true,
        role: MembershipRole.ORG_ADMIN,
      },
      order: { createdAt: 'ASC' },
    });
    if (admin) {
      return { orgId, userId: admin.userId };
    }

    const any = await this.memberships.findOne({
      where: { orgId, isActive: true },
      order: { createdAt: 'ASC' },
    });
    if (!any) {
      throw new NotFoundException(`No active membership for org ${orgId}`);
    }
    return { orgId, userId: any.userId };
  }

  async runAsOrg<T>(
    orgId: string,
    fn: () => Promise<T>,
    preferredUserId?: string,
  ): Promise<T> {
    const actor = await this.resolveActor(orgId, preferredUserId);
    return TenantContext.run(actor, fn);
  }
}
