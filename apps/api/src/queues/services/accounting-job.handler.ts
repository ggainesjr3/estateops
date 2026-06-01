import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InvoiceStatus } from '@estateops/shared';
import { Repository } from 'typeorm';
import { Invoice } from '../../modules/billing/entities/invoice.entity';
import { PaymentService } from '../../modules/billing/services/payment.service';
import { PostTransactionDto } from '../../modules/ledger/dto/post-transaction.dto';
import { LedgerService } from '../../modules/ledger/ledger.service';
import { OrgJobContextService } from './org-job-context.service';

export type AccountingJobType =
  | 'post_transaction'
  | 'generate_invoices'
  | 'process_autopay';

export interface AccountingJobPayload {
  type: AccountingJobType;
  orgId: string;
  actorUserId?: string;
  idempotencyKey: string;
  transaction?: PostTransactionDto;
  invoiceId?: string;
}

@Injectable()
export class AccountingJobHandler {
  private readonly logger = new Logger(AccountingJobHandler.name);

  constructor(
    private readonly orgJobContext: OrgJobContextService,
    private readonly ledgerService: LedgerService,
    private readonly paymentService: PaymentService,
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
  ) {}

  async handle(payload: AccountingJobPayload): Promise<void> {
    await this.orgJobContext.runAsOrg(
      payload.orgId,
      async () => {
        switch (payload.type) {
          case 'post_transaction':
            if (!payload.transaction) {
              throw new Error('post_transaction requires transaction payload');
            }
            await this.ledgerService.postTransaction({
              ...payload.transaction,
              idempotencyKey: payload.idempotencyKey,
            });
            break;
          case 'process_autopay':
            if (payload.invoiceId) {
              await this.paymentService.processAutopay(
                payload.invoiceId,
                payload.orgId,
                payload.actorUserId ?? (await this.orgJobContext.resolveActor(payload.orgId)).userId,
              );
              return;
            }
            await this.runAutopayForOrg(payload.orgId, payload.actorUserId);
            break;
          case 'generate_invoices':
            this.logger.log(`generate_invoices delegated to lease-processing queue for org ${payload.orgId}`);
            break;
          default:
            throw new Error(`Unknown accounting job type: ${payload.type as string}`);
        }
      },
      payload.actorUserId,
    );
  }

  private async runAutopayForOrg(orgId: string, actorUserId?: string): Promise<void> {
    const actor = await this.orgJobContext.resolveActor(orgId, actorUserId);
    const invoices = await this.invoiceRepository.find({
      where: {
        orgId,
        status: InvoiceStatus.SENT,
      },
    });
    for (const invoice of invoices) {
      await this.paymentService.processAutopay(invoice.id, orgId, actor.userId);
    }
    this.logger.log(`Autopay processed ${invoices.length} invoices for org ${orgId}`);
  }
}
