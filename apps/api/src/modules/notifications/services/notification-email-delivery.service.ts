import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SendEmailCommand, SESClient } from '@aws-sdk/client-ses';

export interface NotificationEmailPayload {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface NotificationEmailResult {
  provider: 'sendgrid' | 'ses' | 'log';
  messageId: string;
}

@Injectable()
export class NotificationEmailDeliveryService {
  private readonly logger = new Logger(NotificationEmailDeliveryService.name);
  private sesClient: SESClient | null = null;

  constructor(private readonly configService: ConfigService) {}

  async send(input: NotificationEmailPayload): Promise<NotificationEmailResult> {
    const sendgridKey = this.configService.get<string>('email.sendgridApiKey');
    if (sendgridKey) {
      return this.sendViaSendGrid(input, sendgridKey);
    }
    return this.sendViaSes(input);
  }

  private async sendViaSendGrid(
    input: NotificationEmailPayload,
    apiKey: string,
  ): Promise<NotificationEmailResult> {
    const from = this.configService.get<string>('email.fromAddress');
    const body = {
      personalizations: [{ to: [{ email: input.to }] }],
      from: { email: from },
      subject: input.subject,
      content: [
        { type: 'text/plain', value: input.text },
        { type: 'text/html', value: input.html },
      ],
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
    return { provider: 'sendgrid', messageId };
  }

  private async sendViaSes(input: NotificationEmailPayload): Promise<NotificationEmailResult> {
    const region = this.configService.get<string>('email.sesRegion') ?? 'us-east-1';
    const from = this.configService.get<string>('email.fromAddress');
    if (!this.sesClient) {
      this.sesClient = new SESClient({ region });
    }
    try {
      const result = await this.sesClient.send(
        new SendEmailCommand({
          Source: from,
          Destination: { ToAddresses: [input.to] },
          Message: {
            Subject: { Data: input.subject },
            Body: {
              Html: { Data: input.html },
              Text: { Data: input.text },
            },
          },
        }),
      );
      const messageId = result.MessageId ?? `ses-${Date.now()}`;
      this.logger.log(`Email sent via SES to ${input.to}`);
      return { provider: 'ses', messageId };
    } catch (e) {
      this.logger.warn(
        `SES failed (${e instanceof Error ? e.message : e}); logging email to ${input.to}`,
      );
      return { provider: 'log', messageId: `log-${Date.now()}` };
    }
  }
}
