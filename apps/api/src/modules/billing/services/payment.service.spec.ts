jest.mock('typeorm', () => ({
  Repository: class Repository {},
}));

jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

jest.mock('../entities/invoice.entity', () => ({ Invoice: class Invoice {} }));
jest.mock('../entities/payment.entity', () => ({ Payment: class Payment {} }));
jest.mock('../repositories/invoice.repository', () => ({
  InvoiceRepository: class InvoiceRepository {},
}));
jest.mock('../repositories/payment.repository', () => ({
  PaymentRepository: class PaymentRepository {},
}));
jest.mock('../repositories/payment-method.repository', () => ({
  PaymentMethodRepository: class PaymentMethodRepository {},
}));
jest.mock('../../../queues/services/queue-producer.service', () => ({
  QueueProducerService: class QueueProducerService {},
}));
jest.mock('./stripe-client.service', () => ({
  StripeClientService: class StripeClientService {},
}));
jest.mock('./ledger-posting.service', () => ({
  LedgerPostingService: class LedgerPostingService {},
}));

import { BadRequestException } from '@nestjs/common';
import {
  InvoiceStatus,
  InvoiceType,
  PaymentInstrument,
  PaymentTransactionStatus,
} from '@estateops/shared';
import { runWithTenant } from '../../../test/tenant-test.util';
import { PaymentService } from './payment.service';

const orgId = '11111111-1111-1111-1111-111111111111';
const userId = '22222222-2222-2222-2222-222222222222';
const invoiceId = '33333333-3333-3333-3333-333333333333';
const paymentId = '44444444-4444-4444-4444-444444444444';

describe('PaymentService', () => {
  let service: PaymentService;
  let paymentRepository: {
    findByIdempotencyKey: jest.Mock;
    findByIdOrFail: jest.Mock;
    findByStripePaymentIntentId: jest.Mock;
    create: jest.Mock;
    findById: jest.Mock;
  };
  let invoiceRepository: {
    findByIdOrFail: jest.Mock;
    update: jest.Mock;
    findById: jest.Mock;
  };
  let paymentMethodRepository: Record<string, jest.Mock>;
  let stripeClient: { getStripe: jest.Mock; getWebhookSecret: jest.Mock };
  let ledgerPostingService: {
    postPaymentReceived: jest.Mock;
    postRefund: jest.Mock;
  };
  let queueProducer: { enqueueAutopay: jest.Mock };
  let paymentOrm: { save: jest.Mock };
  let stripeMock: {
    paymentIntents: {
      create: jest.Mock;
      retrieve: jest.Mock;
    };
    webhooks: { constructEvent: jest.Mock };
    refunds: { create: jest.Mock };
  };

  const invoice = {
    id: invoiceId,
    orgId,
    leaseId: '55555555-5555-5555-5555-555555555555',
    tenantId: '66666666-6666-6666-6666-666666666666',
    invoiceNumber: 'INV-202605-00001',
    type: InvoiceType.RENT,
    status: InvoiceStatus.SENT,
    amountDue: '1000.00',
    amountPaid: '0.00',
    dueDate: '2026-06-24',
    sentAt: new Date(),
    paidAt: null,
    voidedAt: null,
    createdBy: userId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    stripeMock = {
      paymentIntents: {
        create: jest.fn().mockResolvedValue({
          id: 'pi_test',
          client_secret: 'cs_test',
          status: 'requires_payment_method',
        }),
        retrieve: jest.fn(),
      },
      webhooks: {
        constructEvent: jest.fn(),
      },
      refunds: { create: jest.fn().mockResolvedValue({ id: 're_test' }) },
    };
    stripeClient = {
      getStripe: jest.fn().mockReturnValue(stripeMock),
      getWebhookSecret: jest.fn().mockReturnValue('whsec_test'),
    };

    paymentRepository = {
      findByIdempotencyKey: jest.fn().mockResolvedValue(null),
      findByIdOrFail: jest.fn(),
      findByStripePaymentIntentId: jest.fn(),
      create: jest.fn().mockImplementation(async (dto: Record<string, unknown>) => ({
        id: paymentId,
        ...dto,
      })),
      findById: jest.fn(),
    };

    invoiceRepository = {
      findByIdOrFail: jest.fn().mockResolvedValue(invoice),
      update: jest.fn().mockResolvedValue(invoice),
      findById: jest.fn().mockResolvedValue(invoice),
    };

    paymentMethodRepository = {};
    ledgerPostingService = {
      postPaymentReceived: jest.fn().mockResolvedValue(undefined),
      postRefund: jest.fn().mockResolvedValue(undefined),
    };
    queueProducer = { enqueueAutopay: jest.fn() };
    paymentOrm = { save: jest.fn().mockImplementation(async (p: unknown) => p) };

    service = new PaymentService(
      paymentRepository as never,
      invoiceRepository as never,
      paymentMethodRepository as never,
      stripeClient as never,
      ledgerPostingService as never,
      queueProducer as never,
      paymentOrm as never,
    );
  });

  const run = <T>(fn: () => Promise<T>) => runWithTenant(orgId, userId, fn);

  it('returns existing payment intent when idempotency key matches', async () => {
    const existing = {
      id: paymentId,
      orgId,
      invoiceId,
      tenantId: invoice.tenantId,
      stripePaymentIntentId: 'pi_existing',
      stripeChargeId: null,
      method: PaymentInstrument.CARD,
      status: PaymentTransactionStatus.PENDING,
      amount: '500.00',
      idempotencyKey: 'idem-1',
      failureReason: null,
      processedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    paymentRepository.findByIdempotencyKey.mockResolvedValue(existing);
    stripeMock.paymentIntents.retrieve.mockResolvedValue({
      id: 'pi_existing',
      client_secret: 'cs_existing',
    });

    const result = await run(() =>
      service.createPaymentIntent({
        invoiceId,
        amount: '500.00',
        method: PaymentInstrument.CARD,
        idempotencyKey: 'idem-1',
      }),
    );

    expect(stripeMock.paymentIntents.create).not.toHaveBeenCalled();
    expect(result.clientSecret).toBe('cs_existing');
    expect(result.payment.id).toBe(paymentId);
  });

  it('passes idempotency key to Stripe on create', async () => {
    await run(() =>
      service.createPaymentIntent({
        invoiceId,
        amount: '500.00',
        method: PaymentInstrument.CARD,
        idempotencyKey: 'idem-new',
      }),
    );

    expect(stripeMock.paymentIntents.create).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 50000, currency: 'usd' }),
      { idempotencyKey: 'idem-new' },
    );
  });

  it('verifies webhook signature via constructEvent', async () => {
    const event = {
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_test', metadata: { orgId }, latest_charge: 'ch_1' } },
    };
    stripeMock.webhooks.constructEvent.mockReturnValue(event);
    paymentRepository.findByStripePaymentIntentId.mockResolvedValue({
      id: paymentId,
      orgId,
      invoiceId,
      tenantId: invoice.tenantId,
      stripePaymentIntentId: 'pi_test',
      status: PaymentTransactionStatus.PENDING,
      amount: '500.00',
      invoice,
    });

    await service.handleStripeWebhook(Buffer.from('{}'), 'sig_test');

    expect(stripeMock.webhooks.constructEvent).toHaveBeenCalledWith(
      expect.any(Buffer),
      'sig_test',
      'whsec_test',
    );
    expect(ledgerPostingService.postPaymentReceived).toHaveBeenCalled();
  });

  it('rejects invalid webhook signatures', async () => {
    stripeMock.webhooks.constructEvent.mockImplementation(() => {
      throw new Error('bad sig');
    });
    await expect(
      service.handleStripeWebhook(Buffer.from('{}'), 'bad'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('posts ledger on successful payment confirmation', async () => {
    const payment = {
      id: paymentId,
      orgId,
      invoiceId,
      tenantId: invoice.tenantId,
      stripePaymentIntentId: 'pi_test',
      status: PaymentTransactionStatus.PENDING,
      amount: '1000.00',
      idempotencyKey: 'idem-2',
      method: PaymentInstrument.CARD,
      stripeChargeId: null,
      failureReason: null,
      processedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    paymentRepository.findByIdOrFail.mockResolvedValue(payment);
    stripeMock.paymentIntents.retrieve.mockResolvedValue({
      id: 'pi_test',
      status: 'succeeded',
      latest_charge: 'ch_123',
    });

    await run(() => service.confirmPayment(paymentId));

    expect(ledgerPostingService.postPaymentReceived).toHaveBeenCalledWith(
      expect.objectContaining({ status: PaymentTransactionStatus.SUCCEEDED }),
      invoice,
    );
  });
});
