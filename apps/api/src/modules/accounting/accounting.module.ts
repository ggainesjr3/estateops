import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BillingModule } from '../billing/billing.module';
import { Invoice } from '../billing/entities/invoice.entity';
import { Payment } from '../billing/entities/payment.entity';
import { Lease } from '../leases/entities/lease.entity';
import { LedgerModule } from '../ledger/ledger.module';
import { LedgerAccount } from '../ledger/entities/ledger-account.entity';
import { LedgerEntry } from '../ledger/entities/ledger-entry.entity';
import { LedgerTransaction } from '../ledger/entities/ledger-transaction.entity';
import { Property } from '../properties/entities/property.entity';
import { Unit } from '../properties/entities/unit.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { AccountingController } from './accounting.controller';
import { AccountingReportingService } from './accounting-reporting.service';

@Module({
  imports: [
    LedgerModule,
    forwardRef(() => BillingModule),
    TypeOrmModule.forFeature([
      Invoice,
      Payment,
      Lease,
      LedgerEntry,
      LedgerTransaction,
      LedgerAccount,
      Property,
      Unit,
      Tenant,
    ]),
  ],
  controllers: [AccountingController],
  providers: [AccountingReportingService],
  exports: [AccountingReportingService],
})
export class AccountingModule {}
