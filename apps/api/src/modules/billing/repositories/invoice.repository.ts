import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantAwareRepository } from '../../../tenant/tenant-aware.repository';
import { Invoice } from '../entities/invoice.entity';

@Injectable()
export class InvoiceRepository extends TenantAwareRepository<Invoice> {
  constructor(
    @InjectRepository(Invoice)
    repository: Repository<Invoice>,
  ) {
    super(repository);
  }

  async findByInvoiceNumber(invoiceNumber: string): Promise<Invoice | null> {
    return this.repository.findOne({
      where: { invoiceNumber, orgId: this.getOrgId() },
    });
  }

  async countForMonthPrefix(prefix: string): Promise<number> {
    return this.createScopedQueryBuilder('inv')
      .andWhere('inv.invoice_number LIKE :prefix', { prefix: `${prefix}%` })
      .getCount();
  }
}
