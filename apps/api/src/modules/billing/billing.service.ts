import { BadRequestException, Injectable } from '@nestjs/common';
import { PaymentInstrument, PaymentMethodType } from '@estateops/shared';
import { TenantContext } from '../../tenant/tenant.context';
import { subtractMoney } from './billing-amount.util';
import { CreatePaymentIntentResult, PaymentService } from './services/payment.service';
import { PaymentMethodRepository } from './repositories/payment-method.repository';
import { InvoiceRepository } from './repositories/invoice.repository';
import { StripeClientService } from './services/stripe-client.service';

export interface AddPaymentMethodInput {
  stripePaymentMethodId: string;
  tenantId: string;
  isDefault?: boolean;
}

@Injectable()
export class BillingService {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly paymentMethodRepository: PaymentMethodRepository,
    private readonly invoiceRepository: InvoiceRepository,
    private readonly stripeClient: StripeClientService,
  ) {}

  async createPaymentIntent(
    invoiceId: string,
    paymentMethodId: string,
    orgId: string,
  ): Promise<CreatePaymentIntentResult> {
    const actorUserId = TenantContext.getUserId();
    return TenantContext.run({ orgId, userId: actorUserId }, async () => {
      const invoice = await this.invoiceRepository.findByIdOrFail(invoiceId);
      const remaining = subtractMoney(invoice.amountDue, invoice.amountPaid);
      const idempotencyKey = `pi:${invoiceId}:${paymentMethodId}`;

      return this.paymentService.createPaymentIntent({
        invoiceId,
        amount: remaining,
        method: PaymentInstrument.CARD,
        idempotencyKey,
        stripePaymentMethodId: paymentMethodId,
      });
    });
  }

  async payInvoice(
    invoiceId: string,
    paymentMethodId: string,
  ): Promise<CreatePaymentIntentResult> {
    const orgId = TenantContext.getOrgId();
    return this.createPaymentIntent(invoiceId, paymentMethodId, orgId);
  }

  handleStripeWebhook(rawBody: Buffer, signature: string): Promise<void> {
    return this.paymentService.handleStripeWebhook(rawBody, signature);
  }

  async refundPayment(
    paymentId: string,
    amount?: string,
    idempotencyKey?: string,
  ): Promise<unknown> {
    const key = idempotencyKey ?? `refund:${paymentId}:${amount ?? 'full'}`;
    return this.paymentService.refundPayment(paymentId, key, amount);
  }

  async addPaymentMethod(input: AddPaymentMethodInput) {
    const stripe = this.stripeClient.getStripe();
    const pm = await stripe.paymentMethods.retrieve(input.stripePaymentMethodId);

    if (pm.type !== 'card' && pm.type !== 'us_bank_account') {
      throw new BadRequestException('Unsupported payment method type');
    }

    const type =
      pm.type === 'us_bank_account' ? PaymentMethodType.ACH : PaymentMethodType.CARD;

    if (input.isDefault) {
      await this.paymentMethodRepository.clearDefaultForTenant(input.tenantId);
    }

    return this.paymentMethodRepository.create({
      tenantId: input.tenantId,
      stripePaymentMethodId: input.stripePaymentMethodId,
      type,
      cardLast4: pm.card?.last4 ?? null,
      bankLast4: pm.us_bank_account?.last4 ?? null,
      isDefault: input.isDefault ?? false,
      verifiedAt: pm.type === 'card' ? new Date() : null,
    });
  }
}
