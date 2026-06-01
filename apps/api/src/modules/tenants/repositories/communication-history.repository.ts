import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { decodeCursor, encodeCursor } from '../../../common/pagination/cursor.util';
import { TenantAwareRepository } from '../../../tenant/tenant-aware.repository';
import { TenantCommunicationHistory } from '../entities/tenant-communication-history.entity';
import { TenantRepository } from './tenant.repository';

@Injectable()
export class CommunicationHistoryRepository extends TenantAwareRepository<TenantCommunicationHistory> {
  constructor(
    @InjectRepository(TenantCommunicationHistory)
    repository: Repository<TenantCommunicationHistory>,
    private readonly tenantRepository: TenantRepository,
  ) {
    super(repository);
  }

  async assertTenantInOrg(tenantId: string): Promise<void> {
    const tenant = await this.tenantRepository.findById(tenantId);
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }
  }

  async findPageByTenant(
    tenantId: string,
    cursor: string | undefined,
    limit: number,
  ): Promise<{
    items: TenantCommunicationHistory[];
    nextCursor: string | null;
    hasMore: boolean;
  }> {
    await this.assertTenantInOrg(tenantId);

    const qb = this.createScopedQueryBuilder('comm')
      .andWhere('comm.tenant_id = :tenantId', { tenantId })
      .orderBy('comm.sent_at', 'DESC');

    if (cursor) {
      const parsed = this.parseCursor(cursor);
      qb.andWhere(
        '(comm.sent_at < :sentAt OR (comm.sent_at = :sentAt AND comm.id < :id))',
        { sentAt: parsed.createdAt, id: parsed.id },
      );
    }

    const rows = await qb.take(limit + 1).getMany();
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const last = items[items.length - 1];
    const nextCursor =
      hasMore && last ? encodeCursor(last.id, last.sentAt) : null;

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
