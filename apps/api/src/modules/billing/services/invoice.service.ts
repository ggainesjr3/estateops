import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InvoiceStatus, InvoiceType, LeaseStatus } from '@estateops/shared';
import { TenantContext } from '../../../tenant/tenant.context';
import { LeaseRepository } from '../../leases/repositories/lease.repository';
import { LeaseTenantRepository } from '../../leases/repositories/lease-tenant.repository';
import { Invoice } from '../entities/invoice.entity';
import { InvoiceRepository } from '../repositories/invoice.repository';
import { LedgerPostingService } from './ledger-posting.service';

@Injectable()
export class InvoiceService {
  constructor(
    private readonly invoiceRepository: InvoiceRepository,
    private readonly leaseRepository: LeaseRepository,
    private readonly leaseTenantRepository: LeaseTenantRepository,
    private readonly ledgerPostingService: LedgerPostingService,
  ) {}

  async createRentInvoices(leaseId: string): Promise<Invoice> {
    const lease = await this.requireActiveLease(leaseId);
    const tenantId = await this.resolvePrimaryTenantId(leaseId);
    const invoiceNumber = await this.generateInvoiceNumber();
    const dueDate = this.defaultDueDate();

    const invoice = await this.invoiceRepository.create({
      orgId: TenantContext.getOrgId(),
      leaseId: lease.id,
      tenantId,
      invoiceNumber,
      type: InvoiceType.RENT,
      status: InvoiceStatus.SENT,
      amountDue: lease.monthlyRent,
      amountPaid: '0.00',
      dueDate,
      sentAt: new Date(),
      createdBy: TenantContext.getUserId(),
    });

    await this.ledgerPostingService.postInvoiceAccrual(invoice);
    return invoice;
  }

  async createLateFeeInvoice(leaseId: string): Promise<Invoice> {
    const lease = await this.requireActiveLease(leaseId);
    if (!lease.lateFeeAmount || lease.lateFeeAmount === '0.00') {
      throw new BadRequestException('Lease has no late fee amount configured');
    }
    const tenantId = await this.resolvePrimaryTenantId(leaseId);
    const invoiceNumber = await this.generateInvoiceNumber();
    const dueDate = this.defaultDueDate();

    const invoice = await this.invoiceRepository.create({
      orgId: TenantContext.getOrgId(),
      leaseId: lease.id,
      tenantId,
      invoiceNumber,
      type: InvoiceType.LATE_FEE,
      status: InvoiceStatus.SENT,
      amountDue: lease.lateFeeAmount,
      amountPaid: '0.00',
      dueDate,
      sentAt: new Date(),
      createdBy: TenantContext.getUserId(),
    });

    await this.ledgerPostingService.postInvoiceAccrual(invoice);
    return invoice;
  }

  async voidInvoice(invoiceId: string): Promise<Invoice> {
    const invoice = await this.invoiceRepository.findByIdOrFail(invoiceId);
    if (invoice.status === InvoiceStatus.VOID) {
      return invoice;
    }
    if (invoice.status === InvoiceStatus.PAID) {
      throw new UnprocessableEntityException('Cannot void a paid invoice');
    }
    if (parseFloat(invoice.amountPaid) > 0) {
      throw new UnprocessableEntityException('Cannot void an invoice with payments applied');
    }

    return this.invoiceRepository.update(invoiceId, {
      status: InvoiceStatus.VOID,
      voidedAt: new Date(),
    });
  }

  private async requireActiveLease(leaseId: string) {
    const lease = await this.leaseRepository.findByIdOrFail(leaseId);
    if (lease.status !== LeaseStatus.ACTIVE) {
      throw new UnprocessableEntityException('Lease must be active to create invoices');
    }
    return lease;
  }

  private async resolvePrimaryTenantId(leaseId: string): Promise<string> {
    const tenants = await this.leaseTenantRepository.findByLeaseId(leaseId);
    const primary = tenants.find((lt) => lt.isPrimary) ?? tenants[0];
    if (!primary) {
      throw new NotFoundException('No tenant on lease');
    }
    return primary.tenantId;
  }

  private async generateInvoiceNumber(): Promise<string> {
    const now = new Date();
    const prefix = `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-`;
    const count = await this.invoiceRepository.countForMonthPrefix(prefix);
    return `${prefix}${String(count + 1).padStart(5, '0')}`;
  }

  private defaultDueDate(): string {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  }
}
