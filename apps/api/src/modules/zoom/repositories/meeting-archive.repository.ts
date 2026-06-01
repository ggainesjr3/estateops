import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MeetingArchiveStatus } from '@estateops/shared';
import { TenantAwareRepository } from '../../../tenant/tenant-aware.repository';
import { decodeCursor, encodeCursor } from '../../../common/pagination/cursor.util';
import { MeetingArchive } from '../entities/meeting-archive.entity';

export interface MeetingSearchFilters {
  query?: string;
  propertyId?: string;
  status?: MeetingArchiveStatus;
  hostUserId?: string;
  from?: string;
  to?: string;
  cursor?: string;
  limit?: number;
}

@Injectable()
export class MeetingArchiveRepository extends TenantAwareRepository<MeetingArchive> {
  constructor(
    @InjectRepository(MeetingArchive)
    repository: Repository<MeetingArchive>,
  ) {
    super(repository);
  }

  async findByZoomUuid(zoomUuid: string): Promise<MeetingArchive | null> {
    return this.repository.findOne({
      where: { orgId: this.getOrgId(), zoomUuid },
    });
  }

  async search(filters: MeetingSearchFilters): Promise<{
    items: MeetingArchive[];
    nextCursor: string | null;
  }> {
    const orgId = this.getOrgId();
    const limit = Math.min(Math.max(filters.limit ?? 25, 1), 100);

    const qb = this.repository
      .createQueryBuilder('m')
      .where('m.org_id = :orgId', { orgId })
      .orderBy('m.created_at', 'DESC')
      .addOrderBy('m.id', 'DESC')
      .take(limit + 1);

    if (filters.propertyId) {
      qb.andWhere('m.property_id = :propertyId', { propertyId: filters.propertyId });
    }
    if (filters.status) {
      qb.andWhere('m.status = :status', { status: filters.status });
    }
    if (filters.hostUserId) {
      qb.andWhere('m.host_user_id = :hostUserId', { hostUserId: filters.hostUserId });
    }
    if (filters.from) {
      qb.andWhere('m.started_at >= :from', { from: new Date(filters.from) });
    }
    if (filters.to) {
      qb.andWhere('m.started_at <= :to', { to: new Date(filters.to) });
    }
    if (filters.query?.trim()) {
      qb.andWhere(
        `(m.topic ILIKE :q OR m.ai_summary::text ILIKE :q)`,
        { q: `%${filters.query.trim()}%` },
      );
    }
    if (filters.cursor) {
      const { id, createdAt } = decodeCursor(filters.cursor);
      qb.andWhere(
        '(m.created_at < :createdAt OR (m.created_at = :createdAt AND m.id < :id))',
        { createdAt: new Date(createdAt), id },
      );
    }

    const rows = await qb.getMany();
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor =
      hasMore && items.length
        ? encodeCursor(items[items.length - 1]!.id, items[items.length - 1]!.createdAt)
        : null;

    return { items, nextCursor };
  }

  async updateStatus(
    id: string,
    status: MeetingArchiveStatus,
    patch: Partial<MeetingArchive> = {},
  ): Promise<MeetingArchive> {
    return this.update(id, { status, ...patch } as Partial<MeetingArchive>);
  }
}
