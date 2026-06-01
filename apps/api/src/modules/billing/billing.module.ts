import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import stripeConfig from '../../config/stripe.config';
import plaidConfig from '../../config/plaid.config';
import paymentsEncryptionConfig from '../../config/payments-encryption.config';
import { QueueModule } from '../../queues/queue.module';
import { LedgerModule } from '../ledger/ledger.module';
import { LeasesModule } from '../leases/leases.module';
import { AccountingModule } from '../accounting/accounting.module';
import { Invoice } from './entities/invoice.entity';
import { Payment } from './entities/payment.entity';
import { PaymentMethod } from './entities/payment-method.entity';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { InvoicesController } from './invoices.controller';
import { PaymentsController } from './payments.controller';
import { PlaidController } from './plaid.controller';
import { WebhooksController } from './webhooks.controller';
import { InvoiceRepository } from './repositories/invoice.repository';
import { PaymentMethodRepository } from './repositories/payment-method.repository';
import { PaymentRepository } from './repositories/payment.repository';
import { InvoiceService } from './services/invoice.service';
import { LedgerPostingService } from './services/ledger-posting.service';
import { PaymentService } from './services/payment.service';
import { PlaidService } from './services/plaid.service';
import { StripeClientService } from './services/stripe-client.service';

@Module({
  imports: [
    ConfigModule.forFeature(stripeConfig),
    ConfigModule.forFeature(plaidConfig),
    ConfigModule.forFeature(paymentsEncryptionConfig),
    forwardRef(() => QueueModule),
    TypeOrmModule.forFeature([Invoice, Payment, PaymentMethod]),
    LedgerModule,
    forwardRef(() => LeasesModule),
    forwardRef(() => AccountingModule),
  ],
  controllers: [
    BillingController,
    InvoicesController,
    PaymentsController,
    PlaidController,
    WebhooksController,
  ],
  providers: [
    BillingService,
    InvoiceService,
    PaymentService,
    PlaidService,
    StripeClientService,
    LedgerPostingService,
    InvoiceRepository,
    PaymentRepository,
    PaymentMethodRepository,
  ],
  exports: [InvoiceService, PaymentService, BillingService, LedgerPostingService],
})
export class BillingModule {}
