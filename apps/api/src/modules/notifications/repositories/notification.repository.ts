import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationChannel, NotificationStatus } from '@estateops/shared';
import { TenantAwareRepository } from '../../../tenant/tenant-aware.repository';
import { decodeCursor, encodeCursor } from '../../../common/pagination/cursor.util';
import { Notification } from '../entities/notification.entity';

export interface NotificationListFilters {
  channel?: NotificationChannel;
  unreadOnly?: boolean;
  cursor?: string;
  limit?: number;
}

@Injectable()
export class NotificationRepository extends TenantAwareRepository<Notification> {
  constructor(
    @InjectRepository(Notification)
    repository: Repository<Notification>,
  ) {
    super(repository);
  }

  async listForUser(
    userId: string,
    filters: NotificationListFilters,
  ): Promise<{ items: Notification[]; nextCursor: string | null }> {
    const orgId = this.getOrgId();
    const limit = Math.min(Math.max(filters.limit ?? 25, 1), 100);

    const qb = this.repository
      .createQueryBuilder('n')
      .where('n.org_id = :orgId', { orgId })
      .andWhere('n.user_id = :userId', { userId })
      .orderBy('n.created_at', 'DESC')
      .addOrderBy('n.id', 'DESC')
      .take(limit + 1);

    if (filters.channel) {
      qb.andWhere('n.channel = :channel', { channel: filters.channel });
    }
    if (filters.unreadOnly) {
      qb.andWhere('n.channel = :inApp', { inApp: NotificationChannel.IN_APP });
      qb.andWhere('n.read_at IS NULL');
    }

    if (filters.cursor) {
      const { id, createdAt } = decodeCursor(filters.cursor);
      qb.andWhere(
        '(n.created_at < :createdAt OR (n.created_at = :createdAt AND n.id < :id))',
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

  async countUnreadInApp(userId: string): Promise<number> {
    const orgId = this.getOrgId();
    return this.repository.count({
      where: {
        orgId,
        userId,
        channel: NotificationChannel.IN_APP,
        status: NotificationStatus.SENT,
      },
    });
  }

  async countUnreadInAppWhereReadNull(userId: string): Promise<number> {
    return this.repository
      .createQueryBuilder('n')
      .where('n.org_id = :orgId', { orgId: this.getOrgId() })
      .andWhere('n.user_id = :userId', { userId })
      .andWhere('n.channel = :channel', { channel: NotificationChannel.IN_APP })
      .andWhere('n.read_at IS NULL')
      .getCount();
  }

  async findByIdForUser(id: string, userId: string): Promise<Notification | null> {
    return this.repository.findOne({
      where: {
        id,
        orgId: this.getOrgId(),
        userId,
      },
    });
  }

  async findByProviderMessageId(messageId: string): Promise<Notification | null> {
    return this.repository.findOne({
      where: { providerMessageId: messageId },
    });
  }

  async markRead(id: string, userId: string): Promise<Notification | null> {
    const row = await this.findByIdForUser(id, userId);
    if (!row) return null;
    row.readAt = new Date();
    row.status = NotificationStatus.READ;
    return this.repository.save(row);
  }

  async markAllInAppRead(userId: string): Promise<number> {
    const result = await this.repository
      .createQueryBuilder()
      .update(Notification)
      .set({ readAt: new Date(), status: NotificationStatus.READ })
      .where('org_id = :orgId', { orgId: this.getOrgId() })
      .andWhere('user_id = :userId', { userId })
      .andWhere('channel = :channel', { channel: NotificationChannel.IN_APP })
      .andWhere('read_at IS NULL')
      .execute();
    return result.affected ?? 0;
  }
}
