import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  InvoiceStatus,
  InvoiceType,
  LeaseStatus,
  LedgerAccountType,
  LedgerEntryType,
  LedgerReferenceType,
  PaymentTransactionStatus,
} from '@estateops/shared';
import { Repository } from 'typeorm';
import { CursorPageDto } from '../../common/dto/cursor-page.dto';
import { TenantContext } from '../../tenant/tenant.context';
import { Invoice } from '../billing/entities/invoice.entity';
import { Payment } from '../billing/entities/payment.entity';
import { InvoiceService } from '../billing/services/invoice.service';
import { LedgerPostingService } from '../billing/services/ledger-posting.service';
import { Lease } from '../leases/entities/lease.entity';
import { LedgerService } from '../ledger/ledger.service';
import { LedgerAccountRepository } from '../ledger/repositories/ledger-account.repository';
import { centsToAmount, parseMoneyToCents } from '../ledger/ledger-amount.util';
import { LedgerEntry } from '../ledger/entities/ledger-entry.entity';
import { LedgerTransaction } from '../ledger/entities/ledger-transaction.entity';
import { LedgerAccount } from '../ledger/entities/ledger-account.entity';
import { Property } from '../properties/entities/property.entity';
import { Unit } from '../properties/entities/unit.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import type { CreateInvoiceDto, ListInvoicesQueryDto } from './dto/accounting-query.dto';
import type {
  AccountingDashboardDto,
  InvoiceDetailDto,
  InvoiceSummaryDto,
  RentRollRowDto,
  TrialBalanceResponseDto,
  TrialBalanceRowDto,
} from './dto/accounting-response.dto';

@Injectable()
export class AccountingReportingService {
  constructor(
    private readonly ledgerService: LedgerService,
    private readonly ledgerAccountRepository: LedgerAccountRepository,
    private readonly invoiceService: InvoiceService,
    private readonly ledgerPostingService: LedgerPostingService,
    @InjectRepository(Invoice)
    private readonly invoiceRepo: Repository<Invoice>,
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(Lease)
    private readonly leaseRepo: Repository<Lease>,
    @InjectRepository(LedgerEntry)
    private readonly entryRepo: Repository<LedgerEntry>,
    @InjectRepository(LedgerTransaction)
    private readonly txRepo: Repository<LedgerTransaction>,
    @InjectRepository(LedgerAccount)
    private readonly accountRepo: Repository<LedgerAccount>,
    @InjectRepository(Property)
    private readonly propertyRepo: Repository<Property>,
    @InjectRepository(Unit)
    private readonly unitRepo: Repository<Unit>,
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
  ) {}

  async getDashboard(): Promise<AccountingDashboardDto> {
    const orgId = TenantContext.getOrgId();
    await this.ledgerService.ensureSystemAccounts();

    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

    const [ar, deposits, rentMtd, maintMtd] = await Promise.all([
      this.accountBalanceByCode('1100'),
      this.accountBalanceByCode('2000'),
      this.sumPaymentsMtd(orgId, monthStart),
      this.sumExpenseMtd(orgId, monthStart, ['5000', '5100']),
    ]);

    const monthlyRevenueExpense = await this.monthlyRevenueExpense(orgId, 12);
    const collectionByProperty = await this.collectionRatesByProperty(orgId);
    const recentPaidInvoices = await this.listInvoiceSummaries(orgId, {
      status: InvoiceStatus.PAID,
      limit: 10,
    });
    const overdueInvoices = await this.listOverdueSummaries(orgId, 10);

    return {
      metrics: {
        rentCollectedMtd: rentMtd,
        outstandingReceivables: ar,
        securityDepositsHeld: deposits,
        maintenanceExpenseMtd: maintMtd,
      },
      monthlyRevenueExpense,
      collectionByProperty,
      recentPaidInvoices,
      overdueInvoices,
    };
  }

  async listInvoices(query: ListInvoicesQueryDto): Promise<CursorPageDto<InvoiceSummaryDto>> {
    const orgId = TenantContext.getOrgId();
    const limit = Math.min(query.limit ?? 25, 100);
    const items = await this.queryInvoiceSummaries(orgId, query, limit + 1);
    const hasMore = items.length > limit;
    const page = hasMore ? items.slice(0, limit) : items;
    return new CursorPageDto(page, hasMore ? page[page.length - 1]!.id : null, hasMore);
  }

  async getInvoiceDetail(id: string): Promise<InvoiceDetailDto> {
    const orgId = TenantContext.getOrgId();
    const row = await this.invoiceRepo
      .createQueryBuilder('inv')
      .innerJoin(Tenant, 'tenant', 'tenant.id = inv.tenant_id')
      .innerJoin(Lease, 'lease', 'lease.id = inv.lease_id')
      .innerJoin(Property, 'property', 'property.id = lease.property_id')
      .innerJoin(Unit, 'unit', 'unit.id = lease.unit_id')
      .where('inv.id = :id', { id })
      .andWhere('inv.org_id = :orgId', { orgId })
      .select([
        'inv.id AS id',
        'inv.invoice_number AS "invoiceNumber"',
        'inv.type AS type',
        'inv.status AS status',
        'inv.amount_due AS "amountDue"',
        'inv.amount_paid AS "amountPaid"',
        'inv.due_date AS "dueDate"',
        'inv.paid_at AS "paidAt"',
        'inv.notes AS notes',
        'inv.lease_id AS "leaseId"',
        'inv.tenant_id AS "tenantId"',
        'tenant.first_name AS "tenantFirst"',
        'tenant.last_name AS "tenantLast"',
        'property.name AS "propertyName"',
        'unit.unit_number AS "unitNumber"',
      ])
      .getRawOne();

    if (!row) throw new NotFoundException('Invoice not found');

    const payments = await this.paymentRepo.find({
      where: { invoiceId: id, orgId },
      order: { createdAt: 'DESC' },
    });

    const ledgerEntries = await this.ledgerEntriesForInvoice(id, orgId);

    const summary = this.mapRawToSummary(row);
    return {
      ...summary,
      leaseId: row.leaseId,
      tenantId: row.tenantId,
      propertyName: row.propertyName,
      notes: row.notes ?? null,
      payments: payments.map((p) => ({
        id: p.id,
        amount: p.amount,
        status: p.status,
        method: p.method,
        processedAt: p.processedAt?.toISOString() ?? null,
        createdAt: p.createdAt.toISOString(),
      })),
      ledgerEntries,
    };
  }

  async createInvoice(dto: CreateInvoiceDto): Promise<InvoiceDetailDto> {
    const notes = dto.notes?.trim() || null;
    let created: Invoice;
    if (dto.type === InvoiceType.RENT) {
      created = await this.invoiceService.createRentInvoices(dto.leaseId);
    } else if (dto.type === InvoiceType.LATE_FEE) {
      created = await this.invoiceService.createLateFeeInvoice(dto.leaseId);
    } else {
      created = await this.invoiceRepo.save(
        this.invoiceRepo.create({
          orgId: TenantContext.getOrgId(),
          leaseId: dto.leaseId,
          tenantId: await this.resolveTenantId(dto.leaseId),
          invoiceNumber: await this.nextInvoiceNumber(),
          type: dto.type,
          status: InvoiceStatus.SENT,
          amountDue: dto.amountDue,
          amountPaid: '0.00',
          dueDate: dto.dueDate,
          notes,
          sentAt: new Date(),
          createdBy: TenantContext.getUserId(),
        }),
      );
      await this.ledgerPostingService.postInvoiceAccrual(created);
    }

    if (notes && created.notes !== notes) {
      created.notes = notes;
      await this.invoiceRepo.update(created.id, { notes });
    }

    return this.getInvoiceDetail(created.id);
  }

  async getTrialBalance(asOf?: string): Promise<TrialBalanceResponseDto> {
    const asOfDate = asOf ? new Date(`${asOf}T23:59:59.999Z`) : undefined;
    const lines = await this.ledgerService.getTrialBalance(undefined, asOfDate);
    const accounts = await this.accountRepo.find({
      where: { orgId: TenantContext.getOrgId() },
    });
    const accountMap = new Map(accounts.map((a) => [a.id, a]));

    const rows: TrialBalanceRowDto[] = [];
    let totalDebitCents = 0n;
    let totalCreditCents = 0n;

    for (const line of lines) {
      const account = accountMap.get(line.accountId);
      if (!account) continue;
      const totals = await this.sumForAccount(line.accountId, asOfDate);
      const debitCents = totals.debitsCents;
      const creditCents = totals.creditsCents;
      totalDebitCents += debitCents;
      totalCreditCents += creditCents;
      rows.push({
        accountId: line.accountId,
        code: line.code,
        name: line.name,
        type: line.type,
        debit: centsToAmount(debitCents),
        credit: centsToAmount(creditCents),
      });
    }

    return {
      rows,
      totalDebit: centsToAmount(totalDebitCents),
      totalCredit: centsToAmount(totalCreditCents),
      balanced: totalDebitCents === totalCreditCents,
      asOf: asOf ?? undefined,
    };
  }

  async getRentRoll(): Promise<RentRollRowDto[]> {
    const orgId = TenantContext.getOrgId();
    const leases = await this.leaseRepo
      .createQueryBuilder('lease')
      .innerJoin(Property, 'property', 'property.id = lease.property_id')
      .innerJoin(Unit, 'unit', 'unit.id = lease.unit_id')
      .leftJoin('lease_tenants', 'lt', 'lt.lease_id = lease.id AND lt.is_primary = true')
      .leftJoin(Tenant, 'tenant', 'tenant.id = lt.tenant_id')
      .where('lease.org_id = :orgId', { orgId })
      .andWhere('lease.status = :status', { status: LeaseStatus.ACTIVE })
      .andWhere('lease.deleted_at IS NULL')
      .select([
        'lease.id AS "leaseId"',
        'property.id AS "propertyId"',
        'property.name AS "propertyName"',
        'unit.id AS "unitId"',
        'unit.unit_number AS "unitNumber"',
        'lease.end_date AS "leaseEndDate"',
        'lease.monthly_rent AS "monthlyRent"',
        'lease.status AS "leaseStatus"',
        'tenant.first_name AS "tenantFirst"',
        'tenant.last_name AS "tenantLast"',
      ])
      .getRawMany();

    const rows: RentRollRowDto[] = [];
    for (const l of leases) {
      const lastPayment = await this.paymentRepo
        .createQueryBuilder('p')
        .innerJoin(Invoice, 'inv', 'inv.id = p.invoice_id')
        .where('inv.lease_id = :leaseId', { leaseId: l.leaseId })
        .andWhere('p.status = :status', { status: PaymentTransactionStatus.SUCCEEDED })
        .orderBy('p.processed_at', 'DESC')
        .getOne();

      const tenantName =
        l.tenantFirst && l.tenantLast
          ? `${l.tenantFirst} ${l.tenantLast}`
          : null;

      rows.push({
        propertyId: l.propertyId,
        propertyName: l.propertyName,
        unitId: l.unitId,
        unitNumber: l.unitNumber,
        tenantName,
        leaseEndDate: l.leaseEndDate ?? null,
        monthlyRent: l.monthlyRent,
        lastPaymentDate: lastPayment?.processedAt?.toISOString().slice(0, 10) ?? null,
        status: l.leaseStatus ?? LeaseStatus.ACTIVE,
      });
    }
    return rows;
  }

  rentRollCsv(rows: RentRollRowDto[]): string {
    const header = 'Property,Unit,Tenant,Lease End,Monthly Rent,Last Payment,Status';
    const lines = rows.map((r) =>
      [
        csvEscape(r.propertyName),
        csvEscape(r.unitNumber),
        csvEscape(r.tenantName ?? ''),
        r.leaseEndDate ?? '',
        r.monthlyRent,
        r.lastPaymentDate ?? '',
        r.status,
      ].join(','),
    );
    return [header, ...lines].join('\n');
  }

  generalLedgerCsv(
    lines: { postedAt: string; description: string; amount: string; type: string; runningBalance: string }[],
  ): string {
    const header = 'Posted At,Description,Type,Amount,Running Balance';
    const body = lines.map((l) =>
      [l.postedAt, csvEscape(l.description), l.type, l.amount, l.runningBalance].join(','),
    );
    return [header, ...body].join('\n');
  }

  private async accountBalanceByCode(code: string): Promise<string> {
    const account = await this.ledgerAccountRepository.findByCode(code);
    if (!account) return '0.00';
    const balance = await this.ledgerService.getAccountBalance(account.id);
    return balance.balance;
  }

  private async sumPaymentsMtd(orgId: string, monthStart: Date): Promise<string> {
    const raw = await this.paymentRepo
      .createQueryBuilder('p')
      .select('COALESCE(SUM(p.amount), 0)', 'total')
      .where('p.org_id = :orgId', { orgId })
      .andWhere('p.status = :status', { status: PaymentTransactionStatus.SUCCEEDED })
      .andWhere('p.processed_at >= :monthStart', { monthStart })
      .getRawOne<{ total: string }>();
    return centsToAmount(parseMoneyToCents(raw?.total ?? '0'));
  }

  private async sumExpenseMtd(
    orgId: string,
    monthStart: Date,
    codes: string[],
  ): Promise<string> {
    const accounts = await this.accountRepo.find({
      where: codes.map((code) => ({ orgId, code })),
    });
    if (!accounts.length) return '0.00';
    let total = 0n;
    for (const account of accounts) {
      const totals = await this.sumForAccount(account.id, undefined, monthStart);
      total += totals.debitsCents;
    }
    return centsToAmount(total);
  }

  private async monthlyRevenueExpense(orgId: string, months: number) {
    const result: { month: string; revenue: string; expense: string }[] = [];
    const now = new Date();
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
      const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0, 23, 59, 59, 999));
      const revenue = await this.sumCreditsByAccountType(orgId, d, end, LedgerAccountType.REVENUE);
      const expense = await this.sumDebitsByAccountType(orgId, d, end, LedgerAccountType.EXPENSE);
      result.push({
        month: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`,
        revenue: centsToAmount(revenue),
        expense: centsToAmount(expense),
      });
    }
    return result;
  }

  private async sumCreditsByAccountType(
    orgId: string,
    from: Date,
    to: Date,
    type: LedgerAccountType,
  ): Promise<bigint> {
    const raw = await this.entryRepo
      .createQueryBuilder('entry')
      .innerJoin('entry.transaction', 'tx')
      .innerJoin(LedgerAccount, 'acct', 'acct.id = entry.account_id')
      .select(`COALESCE(SUM(entry.amount), 0)`, 'total')
      .where('entry.org_id = :orgId', { orgId })
      .andWhere('acct.type = :type', { type })
      .andWhere('entry.type = :entryType', { entryType: LedgerEntryType.CREDIT })
      .andWhere('tx.posted_at >= :from', { from })
      .andWhere('tx.posted_at <= :to', { to })
      .getRawOne<{ total: string }>();
    return parseMoneyToCents(raw?.total ?? '0');
  }

  private async sumDebitsByAccountType(
    orgId: string,
    from: Date,
    to: Date,
    type: LedgerAccountType,
  ): Promise<bigint> {
    const raw = await this.entryRepo
      .createQueryBuilder('entry')
      .innerJoin('entry.transaction', 'tx')
      .innerJoin(LedgerAccount, 'acct', 'acct.id = entry.account_id')
      .select(`COALESCE(SUM(entry.amount), 0)`, 'total')
      .where('entry.org_id = :orgId', { orgId })
      .andWhere('acct.type = :type', { type })
      .andWhere('entry.type = :entryType', { entryType: LedgerEntryType.DEBIT })
      .andWhere('tx.posted_at >= :from', { from })
      .andWhere('tx.posted_at <= :to', { to })
      .getRawOne<{ total: string }>();
    return parseMoneyToCents(raw?.total ?? '0');
  }

  private async collectionRatesByProperty(orgId: string) {
    const properties = await this.propertyRepo.find({ where: { orgId } });
    const rates = [];
    for (const property of properties) {
      const dueRaw = await this.invoiceRepo
        .createQueryBuilder('inv')
        .innerJoin(Lease, 'lease', 'lease.id = inv.lease_id')
        .where('inv.org_id = :orgId', { orgId })
        .andWhere('lease.property_id = :propertyId', { propertyId: property.id })
        .andWhere('inv.type = :type', { type: InvoiceType.RENT })
        .andWhere('inv.status != :void', { void: InvoiceStatus.VOID })
        .select('COALESCE(SUM(inv.amount_due), 0)', 'due')
        .getRawOne<{ due: string }>();

      const paidRaw = await this.invoiceRepo
        .createQueryBuilder('inv')
        .innerJoin(Lease, 'lease', 'lease.id = inv.lease_id')
        .where('inv.org_id = :orgId', { orgId })
        .andWhere('lease.property_id = :propertyId', { propertyId: property.id })
        .andWhere('inv.type = :type', { type: InvoiceType.RENT })
        .select('COALESCE(SUM(inv.amount_paid), 0)', 'paid')
        .getRawOne<{ paid: string }>();

      const due = parseMoneyToCents(dueRaw?.due ?? '0');
      const paid = parseMoneyToCents(paidRaw?.paid ?? '0');
      const rate = due > 0n ? Math.round(Number((paid * 10000n) / due) / 100) : 100;
      rates.push({
        propertyId: property.id,
        propertyName: property.name,
        collectionRatePercent: rate,
      });
    }
    return rates;
  }

  private async listInvoiceSummaries(
    orgId: string,
    opts: { status?: InvoiceStatus; limit: number },
  ): Promise<InvoiceSummaryDto[]> {
    return this.queryInvoiceSummaries(orgId, { status: opts.status, limit: opts.limit }, opts.limit);
  }

  private async listOverdueSummaries(orgId: string, limit: number): Promise<InvoiceSummaryDto[]> {
    const today = new Date().toISOString().slice(0, 10);
    const qb = this.baseInvoiceQuery(orgId)
      .andWhere('inv.due_date < :today', { today })
      .andWhere('inv.status IN (:...statuses)', {
        statuses: [InvoiceStatus.SENT, InvoiceStatus.PARTIAL, InvoiceStatus.OVERDUE],
      })
      .orderBy('inv.due_date', 'ASC')
      .limit(limit);
    const rows = await qb.getRawMany();
    return rows.map((r) => this.mapRawToSummary(r));
  }

  private async queryInvoiceSummaries(
    orgId: string,
    query: ListInvoicesQueryDto,
    take: number,
  ): Promise<InvoiceSummaryDto[]> {
    const qb = this.baseInvoiceQuery(orgId);

    if (query.status) qb.andWhere('inv.status = :status', { status: query.status });
    if (query.type) qb.andWhere('inv.type = :type', { type: query.type });
    if (query.propertyId) {
      qb.andWhere('lease.property_id = :propertyId', { propertyId: query.propertyId });
    }
    if (query.tenantId) {
      qb.andWhere('inv.tenant_id = :tenantId', { tenantId: query.tenantId });
    }
    if (query.dueFrom) qb.andWhere('inv.due_date >= :dueFrom', { dueFrom: query.dueFrom });
    if (query.dueTo) qb.andWhere('inv.due_date <= :dueTo', { dueTo: query.dueTo });
    if (query.cursor) qb.andWhere('inv.id > :cursor', { cursor: query.cursor });

    qb.orderBy('inv.due_date', 'DESC').addOrderBy('inv.id', 'ASC').limit(take);

    const rows = await qb.getRawMany();
    return rows.map((r) => this.mapRawToSummary(r));
  }

  private baseInvoiceQuery(orgId: string) {
    return this.invoiceRepo
      .createQueryBuilder('inv')
      .innerJoin(Tenant, 'tenant', 'tenant.id = inv.tenant_id')
      .innerJoin(Lease, 'lease', 'lease.id = inv.lease_id')
      .innerJoin(Unit, 'unit', 'unit.id = lease.unit_id')
      .where('inv.org_id = :orgId', { orgId })
      .select([
        'inv.id AS id',
        'inv.invoice_number AS "invoiceNumber"',
        'inv.type AS type',
        'inv.status AS status',
        'inv.amount_due AS "amountDue"',
        'inv.amount_paid AS "amountPaid"',
        'inv.due_date AS "dueDate"',
        'inv.paid_at AS "paidAt"',
        'tenant.first_name AS "tenantFirst"',
        'tenant.last_name AS "tenantLast"',
        'unit.unit_number AS "unitNumber"',
      ]);
  }

  private mapRawToSummary(row: Record<string, string | null | undefined>): InvoiceSummaryDto {
    const today = new Date().toISOString().slice(0, 10);
    const dueDate = String(row.dueDate ?? '');
    const isOverdue =
      dueDate.length > 0 &&
      dueDate < today &&
      ![InvoiceStatus.PAID, InvoiceStatus.VOID].includes(row.status as InvoiceStatus);
    const daysOverdue = isOverdue
      ? Math.floor(
          (Date.parse(today) - Date.parse(dueDate)) / (1000 * 60 * 60 * 24),
        )
      : undefined;
    const displayStatus = isOverdue ? InvoiceStatus.OVERDUE : (row.status as InvoiceStatus);

    return {
      id: String(row.id),
      invoiceNumber: String(row.invoiceNumber),
      tenantName: `${row.tenantFirst ?? ''} ${row.tenantLast ?? ''}`.trim(),
      unitLabel: row.unitNumber ? `Unit ${row.unitNumber}` : undefined,
      type: row.type as InvoiceType,
      amountDue: String(row.amountDue),
      amountPaid: String(row.amountPaid),
      status: displayStatus,
      dueDate,
      paidAt: row.paidAt ? String(row.paidAt) : null,
      daysOverdue,
    };
  }

  private async ledgerEntriesForInvoice(invoiceId: string, orgId: string) {
    const paymentIds = (
      await this.paymentRepo.find({ where: { invoiceId, orgId }, select: ['id'] })
    ).map((p) => p.id);

    const txs = await this.txRepo
      .createQueryBuilder('tx')
      .where('tx.org_id = :orgId', { orgId })
      .andWhere(
        `(tx.reference_type = :invType AND tx.reference_id = :invoiceId)
         OR (tx.reference_type = :payType AND tx.reference_id IN (:...paymentIds))`,
        {
          invType: LedgerReferenceType.INVOICE,
          invoiceId,
          payType: LedgerReferenceType.PAYMENT,
          paymentIds: paymentIds.length ? paymentIds : ['00000000-0000-0000-0000-000000000000'],
        },
      )
      .orderBy('tx.posted_at', 'ASC')
      .getMany();

    const lines: {
      accountCode: string;
      accountName: string;
      amount: string;
      type: LedgerEntryType;
    }[] = [];

    for (const tx of txs) {
      const entries = await this.entryRepo.find({
        where: { transactionId: tx.id, orgId },
      });
      for (const e of entries) {
        const acct = await this.accountRepo.findOne({ where: { id: e.accountId } });
        lines.push({
          accountCode: acct?.code ?? '',
          accountName: acct?.name ?? '',
          amount: e.amount,
          type: e.type,
        });
      }
    }
    return lines;
  }

  private async sumForAccount(accountId: string, asOf?: Date, from?: Date) {
    const orgId = TenantContext.getOrgId();
    const qb = this.entryRepo
      .createQueryBuilder('entry')
      .innerJoin('entry.transaction', 'tx')
      .select(
        `COALESCE(SUM(CASE WHEN entry.type = 'debit' THEN entry.amount ELSE 0 END), 0)`,
        'debitSum',
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN entry.type = 'credit' THEN entry.amount ELSE 0 END), 0)`,
        'creditSum',
      )
      .where('entry.org_id = :orgId', { orgId })
      .andWhere('entry.account_id = :accountId', { accountId });

    if (asOf) qb.andWhere('tx.posted_at <= :asOf', { asOf });
    if (from) qb.andWhere('tx.posted_at >= :from', { from });

    const raw = await qb.getRawOne<{ debitSum: string; creditSum: string }>();
    return {
      debitsCents: parseMoneyToCents(raw?.debitSum ?? '0'),
      creditsCents: parseMoneyToCents(raw?.creditSum ?? '0'),
    };
  }

  private async resolveTenantId(leaseId: string): Promise<string> {
    const lt = await this.leaseRepo.manager.query(
      `SELECT tenant_id FROM lease_tenants WHERE lease_id = $1 AND is_primary = true LIMIT 1`,
      [leaseId],
    );
    if (!lt[0]?.tenant_id) throw new NotFoundException('Primary tenant not found on lease');
    return lt[0].tenant_id;
  }

  private async nextInvoiceNumber(): Promise<string> {
    const now = new Date();
    const prefix = `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-`;
    const count = await this.invoiceRepo
      .createQueryBuilder('inv')
      .where('inv.org_id = :orgId', { orgId: TenantContext.getOrgId() })
      .andWhere('inv.invoice_number LIKE :prefix', { prefix: `${prefix}%` })
      .getCount();
    return `${prefix}${String(count + 1).padStart(5, '0')}`;
  }
}

function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
