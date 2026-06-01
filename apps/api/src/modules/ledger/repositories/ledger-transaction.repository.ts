import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantAwareRepository } from '../../../tenant/tenant-aware.repository';
import { LedgerTransaction } from '../entities/ledger-transaction.entity';

@Injectable()
export class LedgerTransactionRepository extends TenantAwareRepository<LedgerTransaction> {
  constructor(
    @InjectRepository(LedgerTransaction)
    repository: Repository<LedgerTransaction>,
  ) {
    super(repository);
  }

  async findByIdempotencyKey(
    idempotencyKey: string,
  ): Promise<LedgerTransaction | null> {
    return this.repository.findOne({
      where: { idempotencyKey, orgId: this.getOrgId() },
    });
  }

  async findByIdWithEntries(id: string): Promise<LedgerTransaction | null> {
    return this.repository.findOne({
      where: { id, orgId: this.getOrgId() },
    });
  }
}
