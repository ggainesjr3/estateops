import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantAwareRepository } from '../../../tenant/tenant-aware.repository';
import { TenantEmergencyContact } from '../entities/tenant-emergency-contact.entity';
import { TenantRepository } from './tenant.repository';

@Injectable()
export class EmergencyContactRepository extends TenantAwareRepository<TenantEmergencyContact> {
  constructor(
    @InjectRepository(TenantEmergencyContact)
    repository: Repository<TenantEmergencyContact>,
    private readonly tenantRepository: TenantRepository,
  ) {
    super(repository);
  }

  async assertTenantInOrg(tenantId: string): Promise<void> {
    const tenant = await this.tenantRepository.findById(tenantId);
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }
  }

  async findByTenantId(tenantId: string): Promise<TenantEmergencyContact[]> {
    await this.assertTenantInOrg(tenantId);
    return this.repository.find({
      where: { tenantId, orgId: this.getOrgId() },
      order: { isPrimary: 'DESC', createdAt: 'ASC' },
    });
  }

  async createForTenant(
    tenantId: string,
    dto: Partial<TenantEmergencyContact>,
  ): Promise<TenantEmergencyContact> {
    await this.assertTenantInOrg(tenantId);
    return this.create({ ...dto, tenantId });
  }
}
