import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantAwareRepository } from '../../../tenant/tenant-aware.repository';
import { LeaseVersion } from '../entities/lease-version.entity';

@Injectable()
export class LeaseVersionRepository extends TenantAwareRepository<LeaseVersion> {
  constructor(
    @InjectRepository(LeaseVersion)
    repository: Repository<LeaseVersion>,
  ) {
    super(repository);
  }

  async findByLeaseId(leaseId: string): Promise<LeaseVersion[]> {
    return this.repository.find({
      where: { leaseId, orgId: this.getOrgId() },
      order: { version: 'DESC' },
    });
  }

  async saveSnapshot(
    leaseId: string,
    version: number,
    snapshot: Record<string, unknown>,
    changedBy: string,
  ): Promise<LeaseVersion> {
    return this.create({
      leaseId,
      version,
      snapshot,
      changedBy,
    });
  }
}
