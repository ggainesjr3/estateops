import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantRecordStatus } from '@estateops/shared';
import { decodeCursor, encodeCursor } from '../../../common/pagination/cursor.util';
import { TenantAwareRepository } from '../../../tenant/tenant-aware.repository';
import { Tenant } from '../entities/tenant.entity';

export interface TenantListFilters {
  status?: TenantRecordStatus;
  propertyId?: string;
  unitId?: string;
}

@Injectable()
export class TenantRepository extends TenantAwareRepository<Tenant> {
  constructor(
    @InjectRepository(Tenant)
    repository: Repository<Tenant>,
  ) {
    super(repository);
  }

  async findByEmail(email: string): Promise<Tenant | null> {
    return this.repository.findOne({
      where: { email: email.toLowerCase(), orgId: this.getOrgId() },
    });
  }

  async findByUserId(userId: string): Promise<Tenant | null> {
    return this.repository.findOne({
      where: { userId, orgId: this.getOrgId() },
    });
  }

  async createUnique(dto: Parameters<TenantRepository['create']>[0]): Promise<Tenant> {
    const email = (dto as { email?: string }).email;
    if (email) {
      const existing = await this.findByEmail(email);
      if (existing) {
        throw new ConflictException('A tenant with this email already exists in the organization');
      }
    }
    try {
      return await this.create({
        ...dto,
        email: email?.toLowerCase(),
      } as Parameters<TenantRepository['create']>[0]);
    } catch (error: unknown) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        (error as { code: string }).code === '23505'
      ) {
        throw new ConflictException('A tenant with this email already exists in the organization');
      }
      throw error;
    }
  }

  async findPage(
    filters: TenantListFilters,
    cursor: string | undefined,
    limit: number,
  ): Promise<{ items: Tenant[]; nextCursor: string | null; hasMore: boolean }> {
    const qb = this.createScopedQueryBuilder('tenant').orderBy('tenant.created_at', 'DESC');

    if (filters.status) {
      qb.andWhere('tenant.status = :status', { status: filters.status });
    }

    if (filters.propertyId || filters.unitId) {
      qb.innerJoin('leases', 'lease', 'lease.tenant_id = tenant.id AND lease.org_id = :orgId', {
        orgId: this.getOrgId(),
      });
      if (filters.propertyId) {
        qb.andWhere('lease.property_id = :propertyId', { propertyId: filters.propertyId });
      }
      if (filters.unitId) {
        qb.andWhere('lease.unit_id = :unitId', { unitId: filters.unitId });
      }
    }

    if (cursor) {
      const { id, createdAt } = this.parseCursor(cursor);
      qb.andWhere(
        '(tenant.created_at < :createdAt OR (tenant.created_at = :createdAt AND tenant.id < :id))',
        { createdAt, id },
      );
    }

    const rows = await qb.take(limit + 1).getMany();
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const last = items[items.length - 1];
    const nextCursor = hasMore && last ? encodeCursor(last.id, last.createdAt) : null;

    return { items, nextCursor, hasMore };
  }

  private parseCursor(cursor: string) {
    try {
      return decodeCursor(cursor);
    } catch {
      throw new BadRequestException('Invalid cursor');
    }
  }
}
