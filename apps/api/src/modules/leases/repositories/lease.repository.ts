import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LeaseStatus } from '@estateops/shared';
import { Repository } from 'typeorm';
import { TenantAwareRepository } from '../../../tenant/tenant-aware.repository';
import { Lease } from '../entities/lease.entity';

export interface ListLeasesFilters {
  status?: LeaseStatus;
  propertyId?: string;
  unitId?: string;
  tenantId?: string;
}

@Injectable()
export class LeaseRepository extends TenantAwareRepository<Lease> {
  constructor(
    @InjectRepository(Lease)
    repository: Repository<Lease>,
  ) {
    super(repository);
  }

  async findByIdForOrg(id: string, orgId: string): Promise<Lease | null> {
    return this.repository.findOne({
      where: { id, orgId },
    });
  }

  async findDetailById(id: string): Promise<Lease | null> {
    return this.repository.findOne({
      where: { id, orgId: this.getOrgId() },
      relations: ['property', 'unit'],
    });
  }

  async listWithFilters(
    filters: ListLeasesFilters,
    limit: number,
    cursor?: string,
  ): Promise<{ items: Lease[]; nextCursor: string | null }> {
    const qb = this.repository
      .createQueryBuilder('lease')
      .where('lease.org_id = :orgId', { orgId: this.getOrgId() })
      .andWhere('lease.deleted_at IS NULL');

    if (filters.status) {
      qb.andWhere('lease.status = :status', { status: filters.status });
    }
    if (filters.propertyId) {
      qb.andWhere('lease.property_id = :propertyId', {
        propertyId: filters.propertyId,
      });
    }
    if (filters.unitId) {
      qb.andWhere('lease.unit_id = :unitId', { unitId: filters.unitId });
    }
    if (filters.tenantId) {
      qb.innerJoin(
        'lease_tenants',
        'filterLt',
        'filterLt.lease_id = lease.id AND filterLt.tenant_id = :tenantId',
        { tenantId: filters.tenantId },
      );
    }

    if (cursor) {
      qb.andWhere('lease.id > :cursor', { cursor });
    }

    qb.orderBy('lease.id', 'ASC').take(limit + 1);

    const rows = await qb.getMany();
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? items[items.length - 1]!.id : null;
    return { items, nextCursor };
  }

  async hasActiveLease(tenantId: string): Promise<boolean> {
    const count = await this.repository
      .createQueryBuilder('lease')
      .innerJoin('lease_tenants', 'lt', 'lt.lease_id = lease.id')
      .where('lease.org_id = :orgId', { orgId: this.getOrgId() })
      .andWhere('lt.tenant_id = :tenantId', { tenantId })
      .andWhere('lease.status = :status', { status: LeaseStatus.ACTIVE })
      .andWhere('lease.deleted_at IS NULL')
      .getCount();
    return count > 0;
  }

  async findActiveByTenantId(tenantId: string): Promise<Lease | null> {
    return this.repository
      .createQueryBuilder('lease')
      .innerJoin('lease_tenants', 'lt', 'lt.lease_id = lease.id')
      .where('lease.org_id = :orgId', { orgId: this.getOrgId() })
      .andWhere('lt.tenant_id = :tenantId', { tenantId })
      .andWhere('lease.status = :status', { status: LeaseStatus.ACTIVE })
      .leftJoinAndSelect('lease.property', 'property')
      .leftJoinAndSelect('lease.unit', 'unit')
      .getOne();
  }

  async findActiveByUserId(userId: string): Promise<Lease | null> {
    return this.repository
      .createQueryBuilder('lease')
      .innerJoin('lease_tenants', 'lt', 'lt.lease_id = lease.id')
      .innerJoin('tenants', 'tenant', 'tenant.id = lt.tenant_id')
      .where('lease.org_id = :orgId', { orgId: this.getOrgId() })
      .andWhere('tenant.user_id = :userId', { userId })
      .andWhere('lease.status = :status', { status: LeaseStatus.ACTIVE })
      .leftJoinAndSelect('lease.property', 'property')
      .leftJoinAndSelect('lease.unit', 'unit')
      .getOne();
  }
}
