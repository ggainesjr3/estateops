import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MaintenanceTrade } from '@estateops/shared';
import { TenantAwareRepository } from '../../../tenant/tenant-aware.repository';
import { decodeCursor, encodeCursor } from '../../../common/pagination/cursor.util';
import { Vendor } from '../entities/vendor.entity';

export interface VendorListFilters {
  trade?: MaintenanceTrade;
  isActive?: boolean;
}

@Injectable()
export class VendorRepository extends TenantAwareRepository<Vendor> {
  constructor(
    @InjectRepository(Vendor)
    repository: Repository<Vendor>,
  ) {
    super(repository);
  }

  async findPage(
    filters: VendorListFilters,
    cursor: string | undefined,
    limit: number,
  ): Promise<{ items: Vendor[]; nextCursor: string | null; hasMore: boolean }> {
    const qb = this.createScopedQueryBuilder('vendor')
      .orderBy('vendor.created_at', 'DESC')
      .addOrderBy('vendor.id', 'DESC');

    if (filters.isActive !== undefined) {
      qb.andWhere('vendor.is_active = :isActive', { isActive: filters.isActive });
    }
    if (filters.trade) {
      qb.andWhere(':trade = ANY(vendor.trades)', { trade: filters.trade });
    }

    if (cursor) {
      const { id, createdAt } = this.parseCursor(cursor);
      qb.andWhere(
        '(vendor.created_at < :createdAt OR (vendor.created_at = :createdAt AND vendor.id < :id))',
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
