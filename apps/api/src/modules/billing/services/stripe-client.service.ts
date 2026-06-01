import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class StripeClientService {
  private client: Stripe | null = null;

  constructor(private readonly configService: ConfigService) {}

  getStripe(): Stripe {
    if (!this.client) {
      const secretKey = this.configService.getOrThrow<string>('stripe.secretKey');
      this.client = new Stripe(secretKey, { apiVersion: '2025-02-24.acacia' });
    }
    return this.client;
  }

  getWebhookSecret(): string {
    return this.configService.getOrThrow<string>('stripe.webhookSecret');
  }
}
