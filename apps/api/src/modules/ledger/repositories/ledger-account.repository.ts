import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantAwareRepository } from '../../../tenant/tenant-aware.repository';
import { LedgerAccount } from '../entities/ledger-account.entity';

@Injectable()
export class LedgerAccountRepository extends TenantAwareRepository<LedgerAccount> {
  constructor(
    @InjectRepository(LedgerAccount)
    repository: Repository<LedgerAccount>,
  ) {
    super(repository);
  }

  async findByCode(code: string): Promise<LedgerAccount | null> {
    return this.repository.findOne({
      where: { code, orgId: this.getOrgId() },
    });
  }

  async findAllForOrg(): Promise<LedgerAccount[]> {
    return this.findAll();
  }
}
