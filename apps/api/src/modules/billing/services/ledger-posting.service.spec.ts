jest.mock('../../ledger/ledger.service', () => ({
  LedgerService: class LedgerService {},
}));
jest.mock('../../ledger/repositories/ledger-account.repository', () => ({
  LedgerAccountRepository: class LedgerAccountRepository {},
}));

import {
  InvoiceType,
  LedgerEntryType,
  LedgerReferenceType,
} from '@estateops/shared';
import { runWithTenant } from '../../../test/tenant-test.util';
import { LedgerPostingService } from './ledger-posting.service';
import { Invoice } from '../entities/invoice.entity';
import { Payment } from '../entities/payment.entity';

const orgId = '11111111-1111-1111-1111-111111111111';
const userId = '22222222-2222-2222-2222-222222222222';

describe('LedgerPostingService', () => {
  let service: LedgerPostingService;
  let ledgerService: { postTransaction: jest.Mock };
  let ledgerAccountRepository: { findByCode: jest.Mock };

  const accounts = {
    '1000': { id: 'cash-id', code: '1000' },
    '1100': { id: 'ar-id', code: '1100' },
    '2000': { id: 'liability-id', code: '2000' },
    '3000': { id: 'revenue-id', code: '3000' },
    '4000': { id: 'late-id', code: '4000' },
  };

  beforeEach(() => {
    ledgerService = { postTransaction: jest.fn().mockResolvedValue({ id: 'tx-1' }) };
    ledgerAccountRepository = {
      findByCode: jest.fn().mockImplementation(async (code: string) => accounts[code as keyof typeof accounts]),
    };
    service = new LedgerPostingService(
      ledgerService as never,
      ledgerAccountRepository as never,
    );
  });

  const run = <T>(fn: () => Promise<T>) => runWithTenant(orgId, userId, fn);

  it('posts balanced rent payment entries (cash debit, AR credit)', async () => {
    const invoice = {
      id: 'inv-1',
      invoiceNumber: 'INV-1',
      type: InvoiceType.RENT,
      amountDue: '1200.00',
    } as Invoice;
    const payment = { id: 'pay-1', amount: '1200.00' } as Payment;

    await run(() => service.postPaymentReceived(payment, invoice));

    expect(ledgerService.postTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        idempotencyKey: 'payment:pay-1',
        referenceType: LedgerReferenceType.PAYMENT,
        entries: [
          { accountId: 'cash-id', amount: '1200.00', type: LedgerEntryType.DEBIT },
          { accountId: 'ar-id', amount: '1200.00', type: LedgerEntryType.CREDIT },
        ],
      }),
    );
  });

  it('posts security deposit to liability account', async () => {
    const invoice = {
      id: 'inv-2',
      invoiceNumber: 'INV-2',
      type: InvoiceType.SECURITY_DEPOSIT,
      amountDue: '500.00',
    } as Invoice;
    const payment = { id: 'pay-2', amount: '500.00' } as Payment;

    await run(() => service.postPaymentReceived(payment, invoice));

    expect(ledgerService.postTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        referenceType: LedgerReferenceType.SECURITY_DEPOSIT,
        entries: [
          { accountId: 'cash-id', amount: '500.00', type: LedgerEntryType.DEBIT },
          { accountId: 'liability-id', amount: '500.00', type: LedgerEntryType.CREDIT },
        ],
      }),
    );
  });

  it('posts late fee accrual to late fee revenue', async () => {
    const invoice = {
      id: 'inv-3',
      invoiceNumber: 'INV-3',
      type: InvoiceType.LATE_FEE,
      amountDue: '50.00',
    } as Invoice;

    await run(() => service.postInvoiceAccrual(invoice));

    expect(ledgerService.postTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        referenceType: LedgerReferenceType.INVOICE,
        entries: [
          { accountId: 'ar-id', amount: '50.00', type: LedgerEntryType.DEBIT },
          { accountId: 'late-id', amount: '50.00', type: LedgerEntryType.CREDIT },
        ],
      }),
    );
  });
});
