jest.mock('typeorm', () => ({ Repository: class Repository {} }));
jest.mock('@nestjs/typeorm', () => ({ InjectRepository: () => () => undefined }));
jest.mock('../../modules/billing/entities/invoice.entity', () => ({ Invoice: class Invoice {} }));
jest.mock('../../modules/ledger/ledger.service', () => ({ LedgerService: class LedgerService {} }));
jest.mock('../../modules/billing/services/payment.service', () => ({
  PaymentService: class PaymentService {},
}));
jest.mock('./org-job-context.service', () => ({
  OrgJobContextService: class OrgJobContextService {},
}));

import { LedgerReferenceType } from '@estateops/shared';
import { AccountingJobHandler } from './accounting-job.handler';

describe('AccountingJobHandler (accounting processor)', () => {
  it('delegates post_transaction with idempotency key', async () => {
    const ledgerService = { postTransaction: jest.fn().mockResolvedValue({ id: 'tx-1' }) };
    const paymentService = { processAutopay: jest.fn() };
    const orgJobContext = {
      runAsOrg: jest.fn((_org: string, fn: () => Promise<void>) => fn()),
      resolveActor: jest.fn(),
    };
    const handler = new AccountingJobHandler(
      orgJobContext as never,
      ledgerService as never,
      paymentService as never,
      { find: jest.fn() } as never,
    );

    await handler.handle({
      type: 'post_transaction',
      orgId: 'org-1',
      idempotencyKey: 'ledger:1',
      transaction: {
        idempotencyKey: 'ignored',
        description: 'Test',
        referenceType: LedgerReferenceType.PAYMENT,
        entries: [],
      },
    });

    expect(ledgerService.postTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ idempotencyKey: 'ledger:1' }),
    );
  });
});
