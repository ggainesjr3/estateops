import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  LeaseStatus,
  MaintenanceTicketPriority,
  MaintenanceTicketStatus,
  MembershipRole,
  PaymentTransactionStatus,
  TenantRecordStatus,
  UnitStatus,
} from '@estateops/shared';
import { DataSource, Repository } from 'typeorm';
import { CursorPageDto } from '../../common/dto/cursor-page.dto';
import { RedisHealthIndicator } from '../../health/redis-health.indicator';
import { QueueMetricsService } from '../../queues/services/queue-metrics.service';
import { TenantContext } from '../../tenant/tenant.context';
import { AuditLogService } from '../audit-logs/audit-log.service';
import { AuditLog } from '../audit-logs/entities/audit-log.entity';
import { Payment } from '../billing/entities/payment.entity';
import { Lease } from '../leases/entities/lease.entity';
import { MaintenanceTicket } from '../maintenance/entities/maintenance-ticket.entity';
import { OrganizationMembership } from '../organization-memberships/entities/organization-membership.entity';
import { Property } from '../properties/entities/property.entity';
import { Unit } from '../properties/entities/unit.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { User } from '../users/entities/user.entity';
import type { ListAuditLogsQueryDto } from './dto/admin-query.dto';

export interface OrgStatsDto {
  totalProperties: number;
  totalUnits: number;
  occupancyRate: number;
  totalTenants: number;
  activeTenants: number;
  totalLeases: number;
  activeLeases: number;
  openMaintenanceTickets: number;
  criticalTickets: number;
  monthlyRevenue: string;
}

export interface AdminUserDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: MembershipRole;
  isActive: boolean;
  joinedAt: string | null;
}

export interface AuditLogDto {
  id: string;
  createdAt: string;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  action: string;
  entityType: string;
  entityId: string;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
}

export interface SystemHealthDto {
  database: 'ok' | 'error';
  redis: 'ok' | 'error';
  queues: Array<{ name: string; depth: number }>;
}

export interface QueueStatsDto {
  name: string;
  waiting: number;
  active: number;
  failed: number;
  depth: number;
}

const OPEN_TICKET_STATUSES = [
  MaintenanceTicketStatus.CREATED,
  MaintenanceTicketStatus.TRIAGED,
  MaintenanceTicketStatus.ASSIGNED,
  MaintenanceTicketStatus.DISPATCHED,
  MaintenanceTicketStatus.IN_PROGRESS,
  MaintenanceTicketStatus.COMPLETED,
  MaintenanceTicketStatus.INVOICED,
];

@Injectable()
export class AdminService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly redisHealth: RedisHealthIndicator,
    private readonly queueMetrics: QueueMetricsService,
    private readonly auditLogService: AuditLogService,
    @InjectRepository(Property)
    private readonly propertyRepo: Repository<Property>,
    @InjectRepository(Unit)
    private readonly unitRepo: Repository<Unit>,
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(Lease)
    private readonly leaseRepo: Repository<Lease>,
    @InjectRepository(MaintenanceTicket)
    private readonly ticketRepo: Repository<MaintenanceTicket>,
    @InjectRepository(OrganizationMembership)
    private readonly membershipRepo: Repository<OrganizationMembership>,
    @InjectRepository(AuditLog)
    private readonly auditLogRepo: Repository<AuditLog>,
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
  ) {}

  async getOrgStats(orgId: string): Promise<OrgStatsDto> {
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

    const [
      totalProperties,
      totalUnits,
      occupiedUnits,
      totalTenants,
      activeTenants,
      totalLeases,
      activeLeases,
      openMaintenanceTickets,
      revenueRaw,
    ] = await Promise.all([
      this.propertyRepo.count({ where: { orgId } }),
      this.unitRepo.count({ where: { orgId } }),
      this.unitRepo.count({ where: { orgId, status: UnitStatus.OCCUPIED } }),
      this.tenantRepo.count({ where: { orgId } }),
      this.tenantRepo.count({ where: { orgId, status: TenantRecordStatus.ACTIVE } }),
      this.leaseRepo.count({ where: { orgId } }),
      this.leaseRepo.count({ where: { orgId, status: LeaseStatus.ACTIVE } }),
      this.ticketRepo
        .createQueryBuilder('t')
        .where('t.org_id = :orgId', { orgId })
        .andWhere('t.status IN (:...statuses)', { statuses: OPEN_TICKET_STATUSES })
        .getCount(),
      this.paymentRepo
        .createQueryBuilder('p')
        .select('COALESCE(SUM(p.amount), 0)', 'total')
        .where('p.org_id = :orgId', { orgId })
        .andWhere('p.status = :status', { status: PaymentTransactionStatus.SUCCEEDED })
        .andWhere('p.processed_at >= :monthStart', { monthStart })
        .getRawOne<{ total: string }>(),
    ]);

    const criticalOpen = await this.ticketRepo
      .createQueryBuilder('t')
      .where('t.org_id = :orgId', { orgId })
      .andWhere('t.priority = :priority', { priority: MaintenanceTicketPriority.CRITICAL })
      .andWhere('t.status IN (:...statuses)', { statuses: OPEN_TICKET_STATUSES })
      .getCount();

    const occupancyRate =
      totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 1000) / 10 : 0;

    return {
      totalProperties,
      totalUnits,
      occupancyRate,
      totalTenants,
      activeTenants,
      totalLeases,
      activeLeases,
      openMaintenanceTickets,
      criticalTickets: criticalOpen,
      monthlyRevenue: Number(revenueRaw?.total ?? 0).toFixed(2),
    };
  }

  async getUsers(orgId: string): Promise<AdminUserDto[]> {
    const rows = await this.membershipRepo
      .createQueryBuilder('m')
      .innerJoin(User, 'u', 'u.id = m.user_id')
      .where('m.org_id = :orgId', { orgId })
      .select([
        'u.id AS id',
        'u.email AS email',
        'u.first_name AS "firstName"',
        'u.last_name AS "lastName"',
        'm.role AS role',
        'm.is_active AS "isActive"',
        'm.joined_at AS "joinedAt"',
      ])
      .orderBy('u.last_name', 'ASC')
      .addOrderBy('u.first_name', 'ASC')
      .getRawMany();

    return rows.map((row) => ({
      id: String(row.id),
      email: String(row.email),
      firstName: String(row.firstName),
      lastName: String(row.lastName),
      role: row.role as MembershipRole,
      isActive: Boolean(row.isActive),
      joinedAt: row.joinedAt ? new Date(String(row.joinedAt)).toISOString() : null,
    }));
  }

  async updateUserRole(
    orgId: string,
    userId: string,
    role: MembershipRole,
  ): Promise<AdminUserDto> {
    const membership = await this.membershipRepo.findOne({
      where: { orgId, userId },
    });
    if (!membership) {
      throw new NotFoundException('User membership not found');
    }

    const oldRole = membership.role;
    membership.role = role;
    await this.membershipRepo.save(membership);

    await this.auditLogService.log({
      orgId,
      userId: TenantContext.getUserId(),
      action: 'user.role_updated',
      entityType: 'organization_membership',
      entityId: membership.id,
      oldValue: { role: oldRole },
      newValue: { role },
    });

    const users = await this.getUsers(orgId);
    const updated = users.find((u) => u.id === userId);
    if (!updated) throw new NotFoundException('User not found');
    return updated;
  }

  async deactivateUser(orgId: string, userId: string): Promise<AdminUserDto> {
    const membership = await this.membershipRepo.findOne({
      where: { orgId, userId },
    });
    if (!membership) {
      throw new NotFoundException('User membership not found');
    }

    membership.isActive = false;
    await this.membershipRepo.save(membership);

    await this.auditLogService.log({
      orgId,
      userId: TenantContext.getUserId(),
      action: 'user.deactivated',
      entityType: 'organization_membership',
      entityId: membership.id,
      oldValue: { isActive: true },
      newValue: { isActive: false },
    });

    const users = await this.getUsers(orgId);
    const updated = users.find((u) => u.id === userId);
    if (!updated) throw new NotFoundException('User not found');
    return updated;
  }

  async getAuditLogs(
    orgId: string,
    query: ListAuditLogsQueryDto,
  ): Promise<CursorPageDto<AuditLogDto>> {
    const limit = Math.min(query.limit ?? 20, 100);
    const qb = this.auditLogRepo
      .createQueryBuilder('log')
      .leftJoin(User, 'u', 'u.id = log.user_id')
      .where('log.org_id = :orgId', { orgId })
      .select([
        'log.id AS id',
        'log.created_at AS "createdAt"',
        'log.user_id AS "userId"',
        'log.action AS action',
        'log.entity_type AS "entityType"',
        'log.entity_id AS "entityId"',
        'log.old_value AS "oldValue"',
        'log.new_value AS "newValue"',
        'u.first_name AS "userFirst"',
        'u.last_name AS "userLast"',
        'u.email AS "userEmail"',
      ])
      .orderBy('log.created_at', 'DESC')
      .addOrderBy('log.id', 'DESC')
      .limit(limit + 1);

    if (query.from) {
      qb.andWhere('log.created_at >= :from', { from: query.from });
    }
    if (query.to) {
      qb.andWhere('log.created_at <= :to', { to: `${query.to}T23:59:59.999Z` });
    }
    if (query.action) {
      qb.andWhere('log.action = :action', { action: query.action });
    }
    if (query.userId) {
      qb.andWhere('log.user_id = :userId', { userId: query.userId });
    }
    if (query.cursor) {
      qb.andWhere('log.id < :cursor', { cursor: query.cursor });
    }

    const rows = await qb.getRawMany();
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;

    const items: AuditLogDto[] = page.map((row) => {
      const first = row.userFirst ? String(row.userFirst) : '';
      const last = row.userLast ? String(row.userLast) : '';
      const name = `${first} ${last}`.trim();
      return {
        id: String(row.id),
        createdAt: new Date(String(row.createdAt)).toISOString(),
        userId: row.userId ? String(row.userId) : null,
        userName: name || null,
        userEmail: row.userEmail ? String(row.userEmail) : null,
        action: String(row.action),
        entityType: String(row.entityType),
        entityId: String(row.entityId),
        oldValue: (row.oldValue as Record<string, unknown> | null) ?? null,
        newValue: (row.newValue as Record<string, unknown> | null) ?? null,
      };
    });

    return new CursorPageDto(items, hasMore ? items[items.length - 1]!.id : null, hasMore);
  }

  async getSystemHealth(): Promise<SystemHealthDto> {
    let database: 'ok' | 'error' = 'ok';
    try {
      await this.dataSource.query('SELECT 1');
    } catch {
      database = 'error';
    }

    let redis: 'ok' | 'error' = 'ok';
    try {
      await this.redisHealth.isHealthy('redis');
    } catch {
      redis = 'error';
    }

    const queueStats = await this.queueMetrics.getQueueStats();
    return {
      database,
      redis,
      queues: queueStats.map((q) => ({ name: q.name, depth: q.depth })),
    };
  }

  async getQueues(): Promise<QueueStatsDto[]> {
    return this.queueMetrics.getQueueStats();
  }
}
