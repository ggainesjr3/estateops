import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantAwareRepository } from '../../../tenant/tenant-aware.repository';
import { PaymentMethod } from '../entities/payment-method.entity';

@Injectable()
export class PaymentMethodRepository extends TenantAwareRepository<PaymentMethod> {
  constructor(
    @InjectRepository(PaymentMethod)
    repository: Repository<PaymentMethod>,
  ) {
    super(repository);
  }

  async findDefaultForTenant(tenantId: string): Promise<PaymentMethod | null> {
    return this.repository.findOne({
      where: { tenantId, orgId: this.getOrgId(), isDefault: true },
    });
  }

  async clearDefaultForTenant(tenantId: string): Promise<void> {
    await this.repository.update(
      { tenantId, orgId: this.getOrgId(), isDefault: true },
      { isDefault: false },
    );
  }
}
