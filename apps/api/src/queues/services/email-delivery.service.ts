import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface EmailDeliveryInput {
  to: string;
  subject: string;
  templateId: string;
  variables: Record<string, string>;
}

export interface EmailDeliveryResult {
  provider: 'sendgrid' | 'ses' | 'log';
  messageId: string;
}

@Injectable()
export class EmailDeliveryService {
  private readonly logger = new Logger(EmailDeliveryService.name);

  constructor(private readonly configService: ConfigService) {}

  async send(input: EmailDeliveryInput): Promise<EmailDeliveryResult> {
    const sendgridKey = this.configService.get<string>('email.sendgridApiKey');
    if (sendgridKey) {
      return this.sendViaSendGrid(input, sendgridKey);
    }
    return this.sendViaSesFallback(input);
  }

  private async sendViaSendGrid(
    input: EmailDeliveryInput,
    apiKey: string,
  ): Promise<EmailDeliveryResult> {
    const body = {
      personalizations: [{ to: [{ email: input.to }], dynamic_template_data: input.variables }],
      from: { email: this.configService.get<string>('email.fromAddress') },
      template_id: input.templateId,
      subject: input.subject,
    };
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`SendGrid failed (${response.status}): ${text}`);
    }
    const messageId = response.headers.get('x-message-id') ?? `sg-${Date.now()}`;
    this.logger.log(`Email sent via SendGrid to ${input.to} template=${input.templateId}`);
    return { provider: 'sendgrid', messageId };
  }

  private async sendViaSesFallback(input: EmailDeliveryInput): Promise<EmailDeliveryResult> {
    const region = this.configService.get<string>('email.sesRegion');
    this.logger.warn(
      `SendGrid unavailable; SES fallback stub for ${input.to} (${region}) subject="${input.subject}"`,
    );
    const messageId = `ses-stub-${Date.now()}`;
    return { provider: 'ses', messageId };
  }
}
