import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UnitStatus, UnitType } from '@estateops/shared';
import { decodeCursor, encodeCursor } from '../../../common/pagination/cursor.util';
import { TenantAwareRepository } from '../../../tenant/tenant-aware.repository';
import { PropertyRepository } from './property.repository';
import { Unit } from '../entities/unit.entity';

export interface UnitListFilters {
  type?: UnitType;
  status?: UnitStatus;
  buildingId?: string;
}

@Injectable()
export class UnitRepository extends TenantAwareRepository<Unit> {
  constructor(
    @InjectRepository(Unit)
    repository: Repository<Unit>,
    private readonly propertyRepository: PropertyRepository,
  ) {
    super(repository);
  }

  async assertPropertyInOrg(propertyId: string): Promise<void> {
    const property = await this.propertyRepository.findById(propertyId);
    if (!property) {
      throw new NotFoundException('Property not found');
    }
  }

  async findPageByProperty(
    propertyId: string,
    filters: UnitListFilters,
    cursor: string | undefined,
    limit: number,
  ): Promise<{ items: Unit[]; nextCursor: string | null; hasMore: boolean }> {
    await this.assertPropertyInOrg(propertyId);

    const qb = this.createScopedQueryBuilder('unit')
      .andWhere('unit.property_id = :propertyId', { propertyId })
      .orderBy('unit.created_at', 'DESC');

    if (filters.type) {
      qb.andWhere('unit.type = :type', { type: filters.type });
    }
    if (filters.status) {
      qb.andWhere('unit.status = :status', { status: filters.status });
    }
    if (filters.buildingId) {
      qb.andWhere('unit.building_id = :buildingId', { buildingId: filters.buildingId });
    }

    if (cursor) {
      const { id, createdAt } = this.parseCursor(cursor);
      qb.andWhere(
        '(unit.created_at < :createdAt OR (unit.created_at = :createdAt AND unit.id < :id))',
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

  async findByIdForProperty(propertyId: string, id: string): Promise<Unit | null> {
    await this.assertPropertyInOrg(propertyId);
    return this.repository.findOne({
      where: {
        id,
        propertyId,
        orgId: this.getOrgId(),
      },
    });
  }
}
