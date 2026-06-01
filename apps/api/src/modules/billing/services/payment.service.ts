import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  InvoiceStatus,
  PaymentInstrument,
  PaymentTransactionStatus,
} from '@estateops/shared';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import Stripe from 'stripe';
import { TenantContext } from '../../../tenant/tenant.context';
import { Invoice } from '../entities/invoice.entity';
import { Payment } from '../entities/payment.entity';
import {
  addMoney,
  assertPayableAmount,
  compareMoney,
  subtractMoney,
} from '../billing-amount.util';
import { InvoiceRepository } from '../repositories/invoice.repository';
import { PaymentMethodRepository } from '../repositories/payment-method.repository';
import { PaymentRepository } from '../repositories/payment.repository';
import { LedgerPostingService } from './ledger-posting.service';
import { StripeClientService } from './stripe-client.service';
import { QueueProducerService } from '../../../queues/services/queue-producer.service';

export interface CreatePaymentIntentInput {
  invoiceId: string;
  amount: string;
  method: PaymentInstrument;
  idempotencyKey: string;
  stripePaymentMethodId?: string;
}

export interface CreatePaymentIntentResult {
  payment: Payment;
  clientSecret: string | null;
}

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly invoiceRepository: InvoiceRepository,
    private readonly paymentMethodRepository: PaymentMethodRepository,
    private readonly stripeClient: StripeClientService,
    private readonly ledgerPostingService: LedgerPostingService,
    private readonly queueProducer: QueueProducerService,
    @InjectRepository(Payment)
    private readonly paymentOrm: Repository<Payment>,
  ) {}

  async createPaymentIntent(
    input: CreatePaymentIntentInput,
  ): Promise<CreatePaymentIntentResult> {
    const existing = await this.paymentRepository.findByIdempotencyKey(
      input.idempotencyKey,
    );
    if (existing?.stripePaymentIntentId) {
      const intent = await this.stripeClient
        .getStripe()
        .paymentIntents.retrieve(existing.stripePaymentIntentId);
      return {
        payment: existing,
        clientSecret: intent.client_secret,
      };
    }

    const invoice = await this.invoiceRepository.findByIdOrFail(input.invoiceId);
    this.assertInvoicePayable(invoice);
    assertPayableAmount(input.amount, invoice.amountDue, invoice.amountPaid);

    const orgId = TenantContext.getOrgId();
    let payment = existing;
    if (!payment) {
      payment = await this.paymentRepository.create({
        orgId,
        invoiceId: invoice.id,
        tenantId: invoice.tenantId,
        method: input.method,
        status: PaymentTransactionStatus.PENDING,
        amount: input.amount,
        idempotencyKey: input.idempotencyKey,
        stripePaymentIntentId: null,
        stripeChargeId: null,
        failureReason: null,
        processedAt: null,
      });
    }

    const amountCents = Math.round(parseFloat(input.amount) * 100);
    const stripe = this.stripeClient.getStripe();
    const intent = await stripe.paymentIntents.create(
      {
        amount: amountCents,
        currency: 'usd',
        payment_method: input.stripePaymentMethodId,
        confirm: Boolean(input.stripePaymentMethodId),
        metadata: {
          orgId,
          invoiceId: invoice.id,
          paymentId: payment.id,
          tenantId: invoice.tenantId,
        },
      },
      { idempotencyKey: input.idempotencyKey },
    );

    payment.stripePaymentIntentId = intent.id;
    payment.status =
      intent.status === 'succeeded'
        ? PaymentTransactionStatus.SUCCEEDED
        : intent.status === 'processing'
          ? PaymentTransactionStatus.PROCESSING
          : PaymentTransactionStatus.PENDING;
    await this.paymentOrm.save(payment);

    if (intent.status === 'succeeded') {
      await this.applySuccessfulPayment(payment, invoice, intent);
    }

    return { payment, clientSecret: intent.client_secret };
  }

  async confirmPayment(paymentId: string): Promise<Payment> {
    const payment = await this.paymentRepository.findByIdOrFail(paymentId);
    if (!payment.stripePaymentIntentId) {
      throw new BadRequestException('Payment has no Stripe payment intent');
    }

    const stripe = this.stripeClient.getStripe();
    const intent = await stripe.paymentIntents.retrieve(payment.stripePaymentIntentId);

    const invoice = await this.invoiceRepository.findByIdOrFail(payment.invoiceId);

    if (intent.status === 'succeeded') {
      return this.applySuccessfulPayment(payment, invoice, intent);
    }
    if (intent.status === 'processing') {
      payment.status = PaymentTransactionStatus.PROCESSING;
      await this.paymentOrm.save(payment);
      return payment;
    }
    if (intent.status === 'requires_payment_method' || intent.status === 'canceled') {
      payment.status = PaymentTransactionStatus.FAILED;
      payment.failureReason = intent.last_payment_error?.message ?? intent.status;
      await this.paymentOrm.save(payment);
      return payment;
    }

    return payment;
  }

  async processAutopay(invoiceId: string, orgId: string, actorUserId: string): Promise<void> {
    await TenantContext.run({ orgId, userId: actorUserId }, async () => {
      const invoice = await this.invoiceRepository.findByIdOrFail(invoiceId);
      this.assertInvoicePayable(invoice);

      const method = await this.paymentMethodRepository.findDefaultForTenant(
        invoice.tenantId,
      );
      if (!method?.stripePaymentMethodId) {
        this.logger.warn(`No default payment method for tenant ${invoice.tenantId}`);
        return;
      }

      const remaining = subtractMoney(invoice.amountDue, invoice.amountPaid);
      if (compareMoney(remaining, '0.00') <= 0) {
        return;
      }

      const idempotencyKey = `autopay:${invoice.id}:${new Date().toISOString().slice(0, 10)}`;
      await this.createPaymentIntent({
        invoiceId: invoice.id,
        amount: remaining,
        method:
          method.type === 'ach' ? PaymentInstrument.ACH : PaymentInstrument.CARD,
        idempotencyKey,
        stripePaymentMethodId: method.stripePaymentMethodId,
      });
    });
  }

  async scheduleAutopay(invoiceId: string): Promise<void> {
    const invoice = await this.invoiceRepository.findByIdOrFail(invoiceId);
    await this.queueProducer.enqueueAutopay(
      invoice.id,
      invoice.orgId,
      invoice.createdBy,
    );
  }

  async handleStripeWebhook(rawBody: Buffer, signature: string): Promise<void> {
    const stripe = this.stripeClient.getStripe();
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        this.stripeClient.getWebhookSecret(),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid signature';
      throw new BadRequestException(`Webhook signature verification failed: ${message}`);
    }

    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.onPaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;
      case 'payment_intent.payment_failed':
        await this.onPaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;
      case 'charge.refunded':
        await this.onChargeRefunded(event.data.object as Stripe.Charge);
        break;
      case 'charge.dispute.created':
        await this.onChargeDisputeCreated(event.data.object as Stripe.Dispute);
        break;
      default:
        this.logger.debug(`Unhandled Stripe event ${event.type}`);
    }
  }

  async refundPayment(
    paymentId: string,
    idempotencyKey: string,
  ): Promise<Payment> {
    const payment = await this.paymentRepository.findByIdOrFail(paymentId);
    if (payment.status !== PaymentTransactionStatus.SUCCEEDED) {
      throw new UnprocessableEntityException('Only succeeded payments can be refunded');
    }
    if (!payment.stripePaymentIntentId) {
      throw new BadRequestException('Payment has no Stripe payment intent');
    }

    const stripe = this.stripeClient.getStripe();
    const intent = await stripe.paymentIntents.retrieve(payment.stripePaymentIntentId);
    const chargeId =
      typeof intent.latest_charge === 'string'
        ? intent.latest_charge
        : intent.latest_charge?.id;

    if (!chargeId) {
      throw new BadRequestException('No charge found for refund');
    }

    const refundParams: Stripe.RefundCreateParams = { charge: chargeId };
    if (amount) {
      refundParams.amount = Math.round(parseFloat(amount) * 100);
    }

    await stripe.refunds.create(refundParams, { idempotencyKey });

    return this.markRefunded(payment, amount);
  }

  private async onPaymentIntentSucceeded(intent: Stripe.PaymentIntent): Promise<void> {
    const payment = await this.paymentRepository.findByStripePaymentIntentId(intent.id);
    if (!payment || payment.status === PaymentTransactionStatus.SUCCEEDED) {
      return;
    }
    const orgId = intent.metadata.orgId ?? payment.orgId;
    const actorUserId = intent.metadata.actorUserId ?? payment.invoice?.createdBy;
    if (!actorUserId) {
      const invoice = payment.invoice ?? (await this.loadInvoice(payment.invoiceId));
      await TenantContext.run({ orgId, userId: invoice.createdBy }, async () => {
        await this.applySuccessfulPayment(payment, invoice, intent);
      });
      return;
    }
    await TenantContext.run({ orgId, userId: actorUserId }, async () => {
      const invoice = await this.invoiceRepository.findByIdOrFail(payment.invoiceId);
      await this.applySuccessfulPayment(payment, invoice, intent);
    });
  }

  private async onPaymentIntentFailed(intent: Stripe.PaymentIntent): Promise<void> {
    const payment = await this.paymentRepository.findByStripePaymentIntentId(intent.id);
    if (!payment) return;
    payment.status = PaymentTransactionStatus.FAILED;
    payment.failureReason = intent.last_payment_error?.message ?? 'Payment failed';
    await this.paymentOrm.save(payment);
  }

  private async onChargeDisputeCreated(dispute: Stripe.Dispute): Promise<void> {
    const chargeId =
      typeof dispute.charge === 'string' ? dispute.charge : dispute.charge?.id;
    if (!chargeId) return;

    const payment = await this.paymentRepository.findByStripeChargeId(chargeId);
    if (!payment || payment.status === PaymentTransactionStatus.DISPUTED) {
      return;
    }

    payment.status = PaymentTransactionStatus.DISPUTED;
    payment.failureReason = dispute.reason ?? 'Charge disputed';
    await this.paymentOrm.save(payment);
  }

  private async onChargeRefunded(charge: Stripe.Charge): Promise<void> {
    const paymentIntentId =
      typeof charge.payment_intent === 'string'
        ? charge.payment_intent
        : charge.payment_intent?.id;
    if (!paymentIntentId) return;
    const payment = await this.paymentRepository.findByStripePaymentIntentId(
      paymentIntentId,
    );
    if (!payment) return;
    const orgId = payment.orgId;
    const invoice = payment.invoice ?? (await this.loadInvoice(payment.invoiceId));
    await TenantContext.run({ orgId, userId: invoice.createdBy }, async () => {
      await this.markRefunded(payment);
    });
  }

  private async applySuccessfulPayment(
    payment: Payment,
    invoice: Invoice,
    intent: Stripe.PaymentIntent,
  ): Promise<Payment> {
    if (payment.status === PaymentTransactionStatus.SUCCEEDED) {
      return payment;
    }

    const chargeId =
      typeof intent.latest_charge === 'string'
        ? intent.latest_charge
        : intent.latest_charge?.id ?? null;

    payment.status = PaymentTransactionStatus.SUCCEEDED;
    payment.stripeChargeId = chargeId;
    payment.processedAt = new Date();
    payment.failureReason = null;
    await this.paymentOrm.save(payment);

    const newPaid = addMoney(invoice.amountPaid, payment.amount);
    const fullyPaid = compareMoney(newPaid, invoice.amountDue) >= 0;
    await this.invoiceRepository.update(invoice.id, {
      amountPaid: newPaid,
      status: fullyPaid ? InvoiceStatus.PAID : InvoiceStatus.PARTIAL,
      paidAt: fullyPaid ? new Date() : invoice.paidAt,
    });

    await this.ledgerPostingService.postPaymentReceived(payment, invoice);
    return payment;
  }

  private async markRefunded(payment: Payment, refundAmount?: string): Promise<Payment> {
    if (payment.status === PaymentTransactionStatus.REFUNDED) {
      return payment;
    }
    const invoice = await this.invoiceRepository.findByIdOrFail(payment.invoiceId);
    const reversedAmount = refundAmount ?? payment.amount;
    payment.status = PaymentTransactionStatus.REFUNDED;
    await this.paymentOrm.save(payment);

    const newPaid = subtractMoney(invoice.amountPaid, reversedAmount);
    await this.invoiceRepository.update(invoice.id, {
      amountPaid: compareMoney(newPaid, '0.00') < 0 ? '0.00' : newPaid,
      status: InvoiceStatus.SENT,
      paidAt: null,
    });

    await this.ledgerPostingService.postRefund(payment, invoice, reversedAmount);
    return payment;
  }

  private assertInvoicePayable(invoice: Invoice): void {
    if (invoice.status === InvoiceStatus.VOID || invoice.status === InvoiceStatus.PAID) {
      throw new UnprocessableEntityException('Invoice is not payable');
    }
  }

  private async loadInvoice(invoiceId: string): Promise<Invoice> {
    const invoice = await this.invoiceRepository.findById(invoiceId);
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }
}
