import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantAwareRepository } from '../../../tenant/tenant-aware.repository';
import { TenantPayment } from '../entities/tenant-payment.entity';

@Injectable()
export class PaymentRepository extends TenantAwareRepository<TenantPayment> {
  constructor(
    @InjectRepository(TenantPayment)
    repository: Repository<TenantPayment>,
  ) {
    super(repository);
  }

  async findByTenantId(tenantId: string, limit = 50): Promise<TenantPayment[]> {
    return this.repository.find({
      where: { tenantId, orgId: this.getOrgId() },
      order: { paidAt: 'DESC', createdAt: 'DESC' },
      take: limit,
    });
  }
}
