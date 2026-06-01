import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  InvoiceStatus,
  LeaseStatus,
  MaintenanceTicketPriority,
  MaintenanceTicketStatus,
  MaintenanceTrade,
  UnitStatus,
} from '@estateops/shared';
import { Repository } from 'typeorm';
import { subtractMoney, addMoney } from '../billing/billing-amount.util';
import { Invoice } from '../billing/entities/invoice.entity';
import { Lease } from '../leases/entities/lease.entity';
import { MaintenanceTicket } from '../maintenance/entities/maintenance-ticket.entity';
import { Property } from '../properties/entities/property.entity';
import { Unit } from '../properties/entities/unit.entity';
import { Tenant } from '../tenants/entities/tenant.entity';

export interface ReportDateFilters {
  propertyId?: string;
  from?: string;
  to?: string;
}

export interface OccupancyReportDto {
  summary: {
    totalUnits: number;
    occupied: number;
    vacant: number;
    maintenance: number;
    occupancyRate: number;
  };
  byProperty: Array<{
    propertyName: string;
    totalUnits: number;
    occupied: number;
    occupancyRate: number;
  }>;
  trend: Array<{ month: string; occupancyRate: number }>;
}

export interface RevenueReportDto {
  summary: {
    totalInvoiced: string;
    totalCollected: string;
    outstanding: string;
    collectionRate: number;
  };
  byMonth: Array<{ month: string; invoiced: string; collected: string }>;
  byProperty: Array<{ propertyName: string; invoiced: string; collected: string }>;
}

export interface MaintenanceReportDto {
  summary: {
    total: number;
    open: number;
    completed: number;
    avgResolutionDays: number;
    slaBreachRate: number;
  };
  byPriority: Array<{ priority: MaintenanceTicketPriority; count: number }>;
  byTrade: Array<{ trade: MaintenanceTrade; count: number }>;
  byProperty: Array<{ propertyName: string; count: number; avgResolutionDays: number }>;
}

export interface RentRollReportRowDto {
  property: string;
  unit: string;
  tenant: string | null;
  leaseStart: string;
  leaseEnd: string | null;
  monthlyRent: string;
  status: string;
  daysPastDue: number;
  balance: string;
}

export interface DelinquencyReportDto {
  summary: {
    totalDelinquent: number;
    totalAmountOwed: string;
    avgDaysPastDue: number;
  };
  tenants: Array<{
    tenantName: string;
    unit: string;
    property: string;
    amountOwed: string;
    daysPastDue: number;
  }>;
}

const CLOSED_TICKET_STATUSES = [MaintenanceTicketStatus.CLOSED];
const COMPLETED_TICKET_STATUSES = [
  MaintenanceTicketStatus.COMPLETED,
  MaintenanceTicketStatus.INVOICED,
  MaintenanceTicketStatus.CLOSED,
];

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Unit)
    private readonly unitRepo: Repository<Unit>,
    @InjectRepository(Lease)
    private readonly leaseRepo: Repository<Lease>,
    @InjectRepository(Invoice)
    private readonly invoiceRepo: Repository<Invoice>,
    @InjectRepository(MaintenanceTicket)
    private readonly ticketRepo: Repository<MaintenanceTicket>,
  ) {}

  async occupancyReport(orgId: string, filters: ReportDateFilters): Promise<OccupancyReportDto> {
    const unitQb = this.unitRepo
      .createQueryBuilder('unit')
      .innerJoin(Property, 'property', 'property.id = unit.property_id')
      .where('unit.org_id = :orgId', { orgId })
      .andWhere('unit.deleted_at IS NULL');

    if (filters.propertyId) {
      unitQb.andWhere('unit.property_id = :propertyId', { propertyId: filters.propertyId });
    }

    const units = await unitQb
      .select([
        'unit.status AS status',
        'property.name AS "propertyName"',
      ])
      .getRawMany<{ status: UnitStatus; propertyName: string }>();

    let occupied = 0;
    let vacant = 0;
    let maintenance = 0;
    const byPropertyMap = new Map<string, { total: number; occupied: number }>();

    for (const u of units) {
      const name = String(u.propertyName);
      const entry = byPropertyMap.get(name) ?? { total: 0, occupied: 0 };
      entry.total += 1;
      if (u.status === UnitStatus.OCCUPIED) {
        occupied += 1;
        entry.occupied += 1;
      } else if (u.status === UnitStatus.VACANT) {
        vacant += 1;
      } else if (u.status === UnitStatus.MAINTENANCE) {
        maintenance += 1;
      }
      byPropertyMap.set(name, entry);
    }

    const totalUnits = units.length;
    const occupancyRate =
      totalUnits > 0 ? Math.round((occupied / totalUnits) * 1000) / 10 : 0;

    const byProperty = Array.from(byPropertyMap.entries())
      .map(([propertyName, stats]) => ({
        propertyName,
        totalUnits: stats.total,
        occupied: stats.occupied,
        occupancyRate:
          stats.total > 0 ? Math.round((stats.occupied / stats.total) * 1000) / 10 : 0,
      }))
      .sort((a, b) => a.propertyName.localeCompare(b.propertyName));

    const trend = await this.buildOccupancyTrend(orgId, filters.propertyId, totalUnits);

    return {
      summary: { totalUnits, occupied, vacant, maintenance, occupancyRate },
      byProperty,
      trend,
    };
  }

  async revenueReport(orgId: string, filters: ReportDateFilters): Promise<RevenueReportDto> {
    const qb = this.invoiceRepo
      .createQueryBuilder('inv')
      .innerJoin(Lease, 'lease', 'lease.id = inv.lease_id')
      .innerJoin(Property, 'property', 'property.id = lease.property_id')
      .where('inv.org_id = :orgId', { orgId })
      .andWhere('inv.status != :void', { void: InvoiceStatus.VOID });

    if (filters.propertyId) {
      qb.andWhere('lease.property_id = :propertyId', { propertyId: filters.propertyId });
    }
    if (filters.from) {
      qb.andWhere('inv.due_date >= :from', { from: filters.from });
    }
    if (filters.to) {
      qb.andWhere('inv.due_date <= :to', { to: filters.to });
    }

    const rows = await qb
      .select([
        'inv.amount_due AS "amountDue"',
        'inv.amount_paid AS "amountPaid"',
        'inv.due_date AS "dueDate"',
        'property.name AS "propertyName"',
      ])
      .getRawMany<{
        amountDue: string;
        amountPaid: string;
        dueDate: string;
        propertyName: string;
      }>();

    let totalInvoiced = 0;
    let totalCollected = 0;
    const monthMap = new Map<string, { invoiced: number; collected: number }>();
    const propertyMap = new Map<string, { invoiced: number; collected: number }>();

    for (const row of rows) {
      const due = parseFloat(String(row.amountDue));
      const paid = parseFloat(String(row.amountPaid));
      totalInvoiced += due;
      totalCollected += paid;

      const month = String(row.dueDate).slice(0, 7);
      const monthEntry = monthMap.get(month) ?? { invoiced: 0, collected: 0 };
      monthEntry.invoiced += due;
      monthEntry.collected += paid;
      monthMap.set(month, monthEntry);

      const prop = String(row.propertyName);
      const propEntry = propertyMap.get(prop) ?? { invoiced: 0, collected: 0 };
      propEntry.invoiced += due;
      propEntry.collected += paid;
      propertyMap.set(prop, propEntry);
    }

    const outstanding = Math.max(0, totalInvoiced - totalCollected);
    const collectionRate =
      totalInvoiced > 0 ? Math.round((totalCollected / totalInvoiced) * 1000) / 10 : 0;

    const byMonth = Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, v]) => ({
        month,
        invoiced: v.invoiced.toFixed(2),
        collected: v.collected.toFixed(2),
      }));

    const byProperty = Array.from(propertyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([propertyName, v]) => ({
        propertyName,
        invoiced: v.invoiced.toFixed(2),
        collected: v.collected.toFixed(2),
      }));

    return {
      summary: {
        totalInvoiced: totalInvoiced.toFixed(2),
        totalCollected: totalCollected.toFixed(2),
        outstanding: outstanding.toFixed(2),
        collectionRate,
      },
      byMonth,
      byProperty,
    };
  }

  async maintenanceReport(
    orgId: string,
    filters: ReportDateFilters,
  ): Promise<MaintenanceReportDto> {
    const qb = this.ticketRepo
      .createQueryBuilder('t')
      .innerJoin(Property, 'property', 'property.id = t.property_id')
      .where('t.org_id = :orgId', { orgId })
      .andWhere('t.deleted_at IS NULL');

    if (filters.propertyId) {
      qb.andWhere('t.property_id = :propertyId', { propertyId: filters.propertyId });
    }
    if (filters.from) {
      qb.andWhere('t.created_at >= :from', { from: filters.from });
    }
    if (filters.to) {
      qb.andWhere('t.created_at <= :to', { to: `${filters.to}T23:59:59.999Z` });
    }

    const tickets = await qb
      .select([
        't.status AS status',
        't.priority AS priority',
        't.trade AS trade',
        't.created_at AS "createdAt"',
        't.completed_at AS "completedAt"',
        't.sla_due_at AS "slaDueAt"',
        'property.name AS "propertyName"',
      ])
      .getRawMany<{
        status: MaintenanceTicketStatus;
        priority: MaintenanceTicketPriority;
        trade: MaintenanceTrade;
        createdAt: Date;
        completedAt: Date | null;
        slaDueAt: Date | null;
        propertyName: string;
      }>();

    const now = Date.now();
    let open = 0;
    let completed = 0;
    let resolutionDaysSum = 0;
    let resolutionCount = 0;
    let slaBreaches = 0;

    const priorityMap = new Map<MaintenanceTicketPriority, number>();
    const tradeMap = new Map<MaintenanceTrade, number>();
    const propertyMap = new Map<
      string,
      { count: number; resolutionSum: number; resolutionCount: number }
    >();

    for (const t of tickets) {
      if (!CLOSED_TICKET_STATUSES.includes(t.status)) {
        open += 1;
      }
      if (COMPLETED_TICKET_STATUSES.includes(t.status)) {
        completed += 1;
      }

      const createdMs = new Date(t.createdAt).getTime();
      const completedAt = t.completedAt ? new Date(t.completedAt).getTime() : null;
      const slaDue = t.slaDueAt ? new Date(t.slaDueAt).getTime() : null;

      if (completedAt) {
        resolutionDaysSum += (completedAt - createdMs) / (1000 * 60 * 60 * 24);
        resolutionCount += 1;
        if (slaDue && completedAt > slaDue) {
          slaBreaches += 1;
        }
      } else if (slaDue && slaDue < now && !CLOSED_TICKET_STATUSES.includes(t.status)) {
        slaBreaches += 1;
      }

      priorityMap.set(t.priority, (priorityMap.get(t.priority) ?? 0) + 1);
      tradeMap.set(t.trade, (tradeMap.get(t.trade) ?? 0) + 1);

      const prop = String(t.propertyName);
      const propEntry = propertyMap.get(prop) ?? { count: 0, resolutionSum: 0, resolutionCount: 0 };
      propEntry.count += 1;
      if (completedAt) {
        propEntry.resolutionSum += (completedAt - createdMs) / (1000 * 60 * 60 * 24);
        propEntry.resolutionCount += 1;
      }
      propertyMap.set(prop, propEntry);
    }

    const total = tickets.length;
    const avgResolutionDays =
      resolutionCount > 0 ? Math.round((resolutionDaysSum / resolutionCount) * 10) / 10 : 0;
    const slaBreachRate =
      total > 0 ? Math.round((slaBreaches / total) * 1000) / 10 : 0;

    return {
      summary: { total, open, completed, avgResolutionDays, slaBreachRate },
      byPriority: Array.from(priorityMap.entries()).map(([priority, count]) => ({
        priority,
        count,
      })),
      byTrade: Array.from(tradeMap.entries()).map(([trade, count]) => ({ trade, count })),
      byProperty: Array.from(propertyMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([propertyName, v]) => ({
          propertyName,
          count: v.count,
          avgResolutionDays:
            v.resolutionCount > 0
              ? Math.round((v.resolutionSum / v.resolutionCount) * 10) / 10
              : 0,
        })),
    };
  }

  async rentRollReport(orgId: string, asOf?: Date): Promise<RentRollReportRowDto[]> {
    const asOfDate = asOf ?? new Date();
    const asOfStr = asOfDate.toISOString().slice(0, 10);
    const today = new Date().toISOString().slice(0, 10);

    const leases = await this.leaseRepo
      .createQueryBuilder('lease')
      .innerJoin(Property, 'property', 'property.id = lease.property_id')
      .innerJoin(Unit, 'unit', 'unit.id = lease.unit_id')
      .leftJoin('lease_tenants', 'lt', 'lt.lease_id = lease.id AND lt.is_primary = true')
      .leftJoin(Tenant, 'tenant', 'tenant.id = lt.tenant_id')
      .where('lease.org_id = :orgId', { orgId })
      .andWhere('lease.deleted_at IS NULL')
      .andWhere('lease.start_date <= :asOf', { asOf: asOfStr })
      .andWhere('(lease.end_date IS NULL OR lease.end_date >= :asOf)', { asOf: asOfStr })
      .andWhere('lease.status IN (:...statuses)', {
        statuses: [LeaseStatus.ACTIVE, LeaseStatus.RENEWED, LeaseStatus.PENDING],
      })
      .select([
        'lease.id AS "leaseId"',
        'property.name AS property',
        'unit.unit_number AS unit',
        'tenant.first_name AS "tenantFirst"',
        'tenant.last_name AS "tenantLast"',
        'lease.start_date AS "leaseStart"',
        'lease.end_date AS "leaseEnd"',
        'lease.monthly_rent AS "monthlyRent"',
        'lease.status AS status',
      ])
      .orderBy('property.name', 'ASC')
      .addOrderBy('unit.unit_number', 'ASC')
      .getRawMany();

    const rows: RentRollReportRowDto[] = [];

    for (const l of leases) {
      const unpaid = await this.invoiceRepo
        .createQueryBuilder('inv')
        .where('inv.lease_id = :leaseId', { leaseId: l.leaseId })
        .andWhere('inv.org_id = :orgId', { orgId })
        .andWhere('inv.status NOT IN (:...statuses)', {
          statuses: [InvoiceStatus.VOID, InvoiceStatus.PAID],
        })
        .getMany();

      let balance = '0.00';
      let daysPastDue = 0;

      for (const inv of unpaid) {
        const owed = subtractMoney(inv.amountDue, inv.amountPaid);
        if (parseFloat(owed) > 0) {
          balance = addMoney(balance, owed);
          if (inv.dueDate < today) {
            const days = Math.floor(
              (Date.parse(today) - Date.parse(inv.dueDate)) / (1000 * 60 * 60 * 24),
            );
            daysPastDue = Math.max(daysPastDue, days);
          }
        }
      }

      const tenantName =
        l.tenantFirst && l.tenantLast
          ? `${l.tenantFirst} ${l.tenantLast}`
          : null;

      rows.push({
        property: String(l.property),
        unit: String(l.unit),
        tenant: tenantName,
        leaseStart: String(l.leaseStart),
        leaseEnd: l.leaseEnd ? String(l.leaseEnd) : null,
        monthlyRent: String(l.monthlyRent),
        status: daysPastDue > 0 ? 'past_due' : 'current',
        daysPastDue,
        balance,
      });
    }

    return rows;
  }

  async delinquencyReport(orgId: string): Promise<DelinquencyReportDto> {
    const today = new Date().toISOString().slice(0, 10);

    const rows = await this.invoiceRepo
      .createQueryBuilder('inv')
      .innerJoin(Tenant, 'tenant', 'tenant.id = inv.tenant_id')
      .innerJoin(Lease, 'lease', 'lease.id = inv.lease_id')
      .innerJoin(Unit, 'unit', 'unit.id = lease.unit_id')
      .innerJoin(Property, 'property', 'property.id = lease.property_id')
      .where('inv.org_id = :orgId', { orgId })
      .andWhere('inv.status NOT IN (:...statuses)', {
        statuses: [InvoiceStatus.VOID, InvoiceStatus.PAID],
      })
      .andWhere('inv.due_date < :today', { today })
      .andWhere('inv.amount_due > inv.amount_paid')
      .select([
        'tenant.first_name AS "tenantFirst"',
        'tenant.last_name AS "tenantLast"',
        'tenant.id AS "tenantId"',
        'unit.unit_number AS unit',
        'property.name AS property',
        'inv.amount_due AS "amountDue"',
        'inv.amount_paid AS "amountPaid"',
        'inv.due_date AS "dueDate"',
      ])
      .getRawMany();

    const tenantMap = new Map<
      string,
      {
        tenantName: string;
        unit: string;
        property: string;
        amountOwed: number;
        maxDaysPastDue: number;
      }
    >();

    for (const row of rows) {
      const owed = parseFloat(subtractMoney(String(row.amountDue), String(row.amountPaid)));
      if (owed <= 0) continue;

      const days = Math.floor(
        (Date.parse(today) - Date.parse(String(row.dueDate))) / (1000 * 60 * 60 * 24),
      );
      const tenantId = String(row.tenantId);
      const tenantName = `${row.tenantFirst ?? ''} ${row.tenantLast ?? ''}`.trim();
      const existing = tenantMap.get(tenantId);

      if (existing) {
        existing.amountOwed += owed;
        existing.maxDaysPastDue = Math.max(existing.maxDaysPastDue, days);
      } else {
        tenantMap.set(tenantId, {
          tenantName,
          unit: String(row.unit),
          property: String(row.property),
          amountOwed: owed,
          maxDaysPastDue: days,
        });
      }
    }

    const tenants = Array.from(tenantMap.values())
      .map((t) => ({
        tenantName: t.tenantName,
        unit: t.unit,
        property: t.property,
        amountOwed: t.amountOwed.toFixed(2),
        daysPastDue: t.maxDaysPastDue,
      }))
      .sort((a, b) => b.daysPastDue - a.daysPastDue);

    const totalAmountOwed = tenants.reduce((s, t) => s + parseFloat(t.amountOwed), 0);
    const avgDaysPastDue =
      tenants.length > 0
        ? Math.round(
            tenants.reduce((s, t) => s + t.daysPastDue, 0) / tenants.length,
          )
        : 0;

    return {
      summary: {
        totalDelinquent: tenants.length,
        totalAmountOwed: totalAmountOwed.toFixed(2),
        avgDaysPastDue,
      },
      tenants,
    };
  }

  private async buildOccupancyTrend(
    orgId: string,
    propertyId: string | undefined,
    totalUnits: number,
  ): Promise<Array<{ month: string; occupancyRate: number }>> {
    const now = new Date();
    const trend: Array<{ month: string; occupancyRate: number }> = [];

    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
      const monthEnd = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i + 1, 0),
      );
      const month = `${monthStart.getUTCFullYear()}-${String(monthStart.getUTCMonth() + 1).padStart(2, '0')}`;
      const startStr = monthStart.toISOString().slice(0, 10);
      const endStr = monthEnd.toISOString().slice(0, 10);

      const leaseQb = this.leaseRepo
        .createQueryBuilder('lease')
        .where('lease.org_id = :orgId', { orgId })
        .andWhere('lease.deleted_at IS NULL')
        .andWhere('lease.start_date <= :endStr', { endStr })
        .andWhere('(lease.end_date IS NULL OR lease.end_date >= :startStr)', { startStr })
        .andWhere('lease.status IN (:...statuses)', {
          statuses: [LeaseStatus.ACTIVE, LeaseStatus.RENEWED],
        });

      if (propertyId) {
        leaseQb.andWhere('lease.property_id = :propertyId', { propertyId });
      }

      const occupiedUnits = await leaseQb
        .select('COUNT(DISTINCT lease.unit_id)', 'count')
        .getRawOne<{ count: string }>();

      const occupied = parseInt(occupiedUnits?.count ?? '0', 10);
      const denominator = totalUnits > 0 ? totalUnits : occupied;
      const occupancyRate =
        denominator > 0 ? Math.round((occupied / denominator) * 1000) / 10 : 0;

      trend.push({ month, occupancyRate });
    }

    return trend;
  }
}
