import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LedgerAccount } from './entities/ledger-account.entity';
import { LedgerEntry } from './entities/ledger-entry.entity';
import { LedgerTransaction } from './entities/ledger-transaction.entity';
import { LedgerService } from './ledger.service';
import { LedgerAccountRepository } from './repositories/ledger-account.repository';
import { LedgerTransactionRepository } from './repositories/ledger-transaction.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([LedgerAccount, LedgerTransaction, LedgerEntry]),
  ],
  providers: [
    LedgerService,
    LedgerAccountRepository,
    LedgerTransactionRepository,
  ],
  exports: [LedgerService, LedgerAccountRepository],
})
export class LedgerModule {}
