import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import {
  MaintenanceTicketPriority,
  MaintenanceTicketStatus,
  MaintenanceTrade,
} from '@estateops/shared';
import { TenantAwareRepository } from '../../../tenant/tenant-aware.repository';
import { decodeCursor, encodeCursor } from '../../../common/pagination/cursor.util';
import { MaintenanceTicket } from '../entities/maintenance-ticket.entity';

export interface TicketListFilters {
  status?: MaintenanceTicketStatus;
  priority?: MaintenanceTicketPriority;
  trade?: MaintenanceTrade;
  propertyId?: string;
  assignedVendorId?: string;
}

@Injectable()
export class MaintenanceTicketRepository extends TenantAwareRepository<MaintenanceTicket> {
  constructor(
    @InjectRepository(MaintenanceTicket)
    repository: Repository<MaintenanceTicket>,
  ) {
    super(repository);
  }

  async findPage(
    filters: TicketListFilters,
    cursor: string | undefined,
    limit: number,
  ): Promise<{
    items: MaintenanceTicket[];
    nextCursor: string | null;
    hasMore: boolean;
  }> {
    const qb = this.createScopedQueryBuilder('ticket')
      .andWhere('ticket.deleted_at IS NULL')
      .orderBy('ticket.created_at', 'DESC')
      .addOrderBy('ticket.id', 'DESC');

    if (filters.status) {
      qb.andWhere('ticket.status = :status', { status: filters.status });
    }
    if (filters.priority) {
      qb.andWhere('ticket.priority = :priority', { priority: filters.priority });
    }
    if (filters.trade) {
      qb.andWhere('ticket.trade = :trade', { trade: filters.trade });
    }
    if (filters.propertyId) {
      qb.andWhere('ticket.property_id = :propertyId', { propertyId: filters.propertyId });
    }
    if (filters.assignedVendorId) {
      qb.andWhere('ticket.assigned_vendor_id = :assignedVendorId', {
        assignedVendorId: filters.assignedVendorId,
      });
    }

    if (cursor) {
      const { id, createdAt } = this.parseCursor(cursor);
      qb.andWhere(
        '(ticket.created_at < :createdAt OR (ticket.created_at = :createdAt AND ticket.id < :id))',
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

  async findByIdWithRelations(id: string): Promise<MaintenanceTicket | null> {
    return this.repository.findOne({
      where: {
        id,
        orgId: this.getOrgId(),
        deletedAt: IsNull(),
      } as never,
      relations: ['assignedVendor', 'assignedStaff'],
    });
  }

  async findByVendorId(
    vendorId: string,
    cursor: string | undefined,
    limit: number,
  ): Promise<{
    items: MaintenanceTicket[];
    nextCursor: string | null;
    hasMore: boolean;
  }> {
    return this.findPage({ assignedVendorId: vendorId }, cursor, limit);
  }

  private parseCursor(cursor: string) {
    try {
      return decodeCursor(cursor);
    } catch {
      throw new BadRequestException('Invalid cursor');
    }
  }
}
