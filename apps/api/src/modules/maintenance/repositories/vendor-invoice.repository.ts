import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VendorInvoiceStatus } from '@estateops/shared';
import { TenantContext } from '../../../tenant/tenant.context';
import { VendorInvoice } from '../entities/vendor-invoice.entity';

@Injectable()
export class VendorInvoiceRepository {
  constructor(
    @InjectRepository(VendorInvoice)
    private readonly repository: Repository<VendorInvoice>,
  ) {}

  async findByTicketId(ticketId: string): Promise<VendorInvoice[]> {
    return this.repository.find({
      where: { ticketId, orgId: TenantContext.getOrgId() },
      order: { createdAt: 'DESC' },
      relations: ['vendor'],
    });
  }

  async findByIdOrFail(id: string): Promise<VendorInvoice> {
    const row = await this.repository.findOne({
      where: { id, orgId: TenantContext.getOrgId() },
      relations: ['vendor'],
    });
    if (!row) {
      throw new NotFoundException('Vendor invoice not found');
    }
    return row;
  }

  async approve(id: string): Promise<VendorInvoice> {
    const row = await this.findByIdOrFail(id);
    row.status = VendorInvoiceStatus.APPROVED;
    row.approvedBy = TenantContext.getUserId();
    return this.repository.save(row);
  }

  async markPaid(id: string): Promise<VendorInvoice> {
    const row = await this.findByIdOrFail(id);
    row.status = VendorInvoiceStatus.PAID;
    row.paidAt = new Date();
    return this.repository.save(row);
  }
}
