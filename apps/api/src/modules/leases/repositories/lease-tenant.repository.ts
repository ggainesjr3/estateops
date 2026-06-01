import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantAwareRepository } from '../../../tenant/tenant-aware.repository';
import { LeaseTenant } from '../entities/lease-tenant.entity';

@Injectable()
export class LeaseTenantRepository extends TenantAwareRepository<LeaseTenant> {
  constructor(
    @InjectRepository(LeaseTenant)
    repository: Repository<LeaseTenant>,
  ) {
    super(repository);
  }

  async findByLeaseId(leaseId: string): Promise<LeaseTenant[]> {
    return this.repository.find({
      where: { leaseId, orgId: this.getOrgId() },
      relations: ['tenant'],
    });
  }
}
