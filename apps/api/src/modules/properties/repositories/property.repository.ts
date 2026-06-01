import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PropertyStatus, PropertyType } from '@estateops/shared';
import { TenantAwareRepository } from '../../../tenant/tenant-aware.repository';
import { decodeCursor, encodeCursor } from '../../../common/pagination/cursor.util';
import { Building } from '../entities/building.entity';
import { Property } from '../entities/property.entity';
import { Unit } from '../entities/unit.entity';

export interface PropertyListFilters {
  type?: PropertyType;
  status?: PropertyStatus;
  city?: string;
}

@Injectable()
export class PropertyRepository extends TenantAwareRepository<Property> {
  constructor(
    @InjectRepository(Property)
    repository: Repository<Property>,
  ) {
    super(repository);
  }

  async findPage(
    filters: PropertyListFilters,
    cursor: string | undefined,
    limit: number,
  ): Promise<{ items: Property[]; nextCursor: string | null; hasMore: boolean }> {
    const qb = this.createScopedQueryBuilder('property').orderBy('property.created_at', 'DESC');

    if (filters.type) {
      qb.andWhere('property.type = :type', { type: filters.type });
    }
    if (filters.status) {
      qb.andWhere('property.status = :status', { status: filters.status });
    }
    if (filters.city) {
      qb.andWhere('LOWER(property.city) = LOWER(:city)', { city: filters.city });
    }

    if (cursor) {
      const { id, createdAt } = this.parseCursor(cursor);
      qb.andWhere(
        '(property.created_at < :createdAt OR (property.created_at = :createdAt AND property.id < :id))',
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

  async findByIdWithSummary(id: string): Promise<{
    property: Property;
    buildingsCount: number;
    unitsCount: number;
    vacantUnits: number;
  } | null> {
    const property = await this.findById(id);
    if (!property) {
      return null;
    }

    const buildingsCount = await this.repository.manager
      .getRepository(Building)
      .createQueryBuilder('building')
      .where('building.org_id = :orgId', { orgId: this.getOrgId() })
      .andWhere('building.property_id = :propertyId', { propertyId: id })
      .getCount();

    const unitsStats = await this.repository.manager
      .getRepository(Unit)
      .createQueryBuilder('unit')
      .select('COUNT(*)', 'total')
      .addSelect(
        `SUM(CASE WHEN unit.status = 'vacant' THEN 1 ELSE 0 END)`,
        'vacant',
      )
      .where('unit.org_id = :orgId', { orgId: this.getOrgId() })
      .andWhere('unit.property_id = :propertyId', { propertyId: id })
      .getRawOne<{ total: string; vacant: string }>();

    return {
      property,
      buildingsCount,
      unitsCount: parseInt(unitsStats?.total ?? '0', 10),
      vacantUnits: parseInt(unitsStats?.vacant ?? '0', 10),
    };
  }
}
