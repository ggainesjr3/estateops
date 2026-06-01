import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Configuration,
  CountryCode,
  PlaidApi,
  PlaidEnvironments,
  Products,
} from 'plaid';
import { PaymentMethodType } from '@estateops/shared';
import { encryptField, decryptField } from '../../../common/crypto/field-encryption';
import { TenantContext } from '../../../tenant/tenant.context';
import { PaymentMethod } from '../entities/payment-method.entity';
import { PaymentMethodRepository } from '../repositories/payment-method.repository';

@Injectable()
export class PlaidService {
  private plaidClient: PlaidApi | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly paymentMethodRepository: PaymentMethodRepository,
  ) {}

  async createLinkToken(tenantId: string): Promise<{ linkToken: string }> {
    const client = this.getClient();
    const response = await client.linkTokenCreate({
      user: { client_user_id: `${TenantContext.getOrgId()}:${tenantId}` },
      client_name: 'EstateOps',
      products: [Products.Auth],
      country_codes: [CountryCode.Us],
      language: 'en',
      webhook: undefined,
    });
    if (!response.data.link_token) {
      throw new BadRequestException('Failed to create Plaid link token');
    }
    return { linkToken: response.data.link_token };
  }

  async exchangePublicToken(
    tenantId: string,
    publicToken: string,
    accountId: string,
    bankLast4: string,
  ): Promise<PaymentMethod> {
    const client = this.getClient();
    const exchange = await client.itemPublicTokenExchange({
      public_token: publicToken,
    });
    const accessToken = exchange.data.access_token;
    const encrypted = encryptField(accessToken, this.encryptionKey());

    await this.paymentMethodRepository.clearDefaultForTenant(tenantId);
    return this.paymentMethodRepository.create({
      tenantId,
      stripePaymentMethodId: `plaid:${accountId}`,
      type: PaymentMethodType.ACH,
      bankLast4,
      cardLast4: null,
      isDefault: true,
      plaidAccessTokenEncrypted: encrypted,
      verifiedAt: null,
    });
  }

  async verifyBankAccount(paymentMethodId: string): Promise<PaymentMethod> {
    const method = await this.paymentMethodRepository.findByIdOrFail(paymentMethodId);
    if (!method.plaidAccessTokenEncrypted) {
      throw new BadRequestException('Payment method has no Plaid token');
    }
    const accessToken = decryptField(
      method.plaidAccessTokenEncrypted,
      this.encryptionKey(),
    );
    const client = this.getClient();
    const auth = await client.authGet({ access_token: accessToken });
    if (!auth.data.accounts.length) {
      throw new BadRequestException('No linked bank accounts found');
    }
    return this.paymentMethodRepository.update(paymentMethodId, {
      verifiedAt: new Date(),
    });
  }

  private getClient(): PlaidApi {
    if (!this.plaidClient) {
      const clientId = this.configService.getOrThrow<string>('plaid.clientId');
      const secret = this.configService.getOrThrow<string>('plaid.secret');
      const envName = this.configService.get<string>('plaid.env') ?? 'sandbox';
      const basePath =
        envName === 'production'
          ? PlaidEnvironments.production
          : envName === 'development'
            ? PlaidEnvironments.development
            : PlaidEnvironments.sandbox;
      const configuration = new Configuration({
        basePath,
        baseOptions: {
          headers: {
            'PLAID-CLIENT-ID': clientId,
            'PLAID-SECRET': secret,
          },
        },
      });
      this.plaidClient = new PlaidApi(configuration);
    }
    return this.plaidClient;
  }

  private encryptionKey(): string {
    return this.configService.getOrThrow<string>('paymentsEncryption.key');
  }
}
