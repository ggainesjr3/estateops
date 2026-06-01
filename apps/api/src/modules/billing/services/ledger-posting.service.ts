import { Injectable, NotFoundException } from '@nestjs/common';
import { InvoiceType, LedgerEntryType, LedgerReferenceType } from '@estateops/shared';
import { LedgerService } from '../../ledger/ledger.service';
import { LedgerAccountRepository } from '../../ledger/repositories/ledger-account.repository';
import { Invoice } from '../entities/invoice.entity';
import { Payment } from '../entities/payment.entity';

@Injectable()
export class LedgerPostingService {
  constructor(
    private readonly ledgerService: LedgerService,
    private readonly ledgerAccountRepository: LedgerAccountRepository,
  ) {}

  async postInvoiceAccrual(invoice: Invoice): Promise<void> {
    const ar = await this.requireAccount('1100');
    const amount = invoice.amountDue;
    const revenueAccountCode = this.revenueAccountCodeForInvoiceType(invoice.type);
    const revenue = await this.requireAccount(revenueAccountCode);

    await this.ledgerService.postTransaction({
      idempotencyKey: `invoice-accrual:${invoice.id}`,
      description: `Invoice ${invoice.invoiceNumber} accrual`,
      referenceType: LedgerReferenceType.INVOICE,
      referenceId: invoice.id,
      entries: [
        { accountId: ar.id, amount, type: LedgerEntryType.DEBIT },
        { accountId: revenue.id, amount, type: LedgerEntryType.CREDIT },
      ],
    });
  }

  async postPaymentReceived(payment: Payment, invoice: Invoice): Promise<void> {
    const cash = await this.requireAccount('1000');
    const ar = await this.requireAccount('1100');
    const liability = await this.requireAccount('2000');
    const amount = payment.amount;

    if (invoice.type === InvoiceType.SECURITY_DEPOSIT) {
      await this.ledgerService.postTransaction({
        idempotencyKey: `payment:${payment.id}`,
        description: `Security deposit payment ${payment.id}`,
        referenceType: LedgerReferenceType.SECURITY_DEPOSIT,
        referenceId: payment.id,
        entries: [
          { accountId: cash.id, amount, type: LedgerEntryType.DEBIT },
          { accountId: liability.id, amount, type: LedgerEntryType.CREDIT },
        ],
      });
      return;
    }

    await this.ledgerService.postTransaction({
      idempotencyKey: `payment:${payment.id}`,
      description: `Payment for invoice ${invoice.invoiceNumber}`,
      referenceType: LedgerReferenceType.PAYMENT,
      referenceId: payment.id,
      entries: [
        { accountId: cash.id, amount, type: LedgerEntryType.DEBIT },
        { accountId: ar.id, amount, type: LedgerEntryType.CREDIT },
      ],
    });
  }

  async postRefund(payment: Payment, invoice: Invoice, amount?: string): Promise<void> {
    const cash = await this.requireAccount('1000');
    const ar = await this.requireAccount('1100');
    const liability = await this.requireAccount('2000');
    const refundAmount = amount ?? payment.amount;

    if (invoice.type === InvoiceType.SECURITY_DEPOSIT) {
      await this.ledgerService.postTransaction({
        idempotencyKey: `refund:${payment.id}`,
        description: `Security deposit refund ${payment.id}`,
        referenceType: LedgerReferenceType.REFUND,
        referenceId: payment.id,
        entries: [
          { accountId: liability.id, amount: refundAmount, type: LedgerEntryType.DEBIT },
          { accountId: cash.id, amount: refundAmount, type: LedgerEntryType.CREDIT },
        ],
      });
      return;
    }

    await this.ledgerService.postTransaction({
      idempotencyKey: `refund:${payment.id}`,
      description: `Refund for invoice ${invoice.invoiceNumber}`,
      referenceType: LedgerReferenceType.REFUND,
      referenceId: payment.id,
      entries: [
        { accountId: ar.id, amount: refundAmount, type: LedgerEntryType.DEBIT },
        { accountId: cash.id, amount: refundAmount, type: LedgerEntryType.CREDIT },
      ],
    });
  }

  private revenueAccountCodeForInvoiceType(type: InvoiceType): string {
    switch (type) {
      case InvoiceType.LATE_FEE:
        return '4000';
      case InvoiceType.SECURITY_DEPOSIT:
        return '2000';
      case InvoiceType.MAINTENANCE:
        return '5000';
      default:
        return '3000';
    }
  }

  private async requireAccount(code: string) {
    const account = await this.ledgerAccountRepository.findByCode(code);
    if (!account) {
      throw new NotFoundException(`Ledger account ${code} not found`);
    }
    return account;
  }
}
