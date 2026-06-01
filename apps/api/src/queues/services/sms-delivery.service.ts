import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CommunicationChannel,
  CommunicationDirection,
} from '@estateops/shared';
import { CommunicationHistoryRepository } from '../../modules/tenants/repositories/communication-history.repository';

export interface SmsDeliveryInput {
  to: string;
  message: string;
  tenantId: string;
  orgId: string;
  sentByUserId: string;
}

@Injectable()
export class SmsDeliveryService {
  private readonly logger = new Logger(SmsDeliveryService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly communicationRepository: CommunicationHistoryRepository,
  ) {}

  async send(input: SmsDeliveryInput): Promise<{ sid: string; communicationId: string }> {
    const sid = await this.sendViaTwilio(input.to, input.message);
    const record = await this.communicationRepository.create({
      tenantId: input.tenantId,
      channel: CommunicationChannel.SMS,
      direction: CommunicationDirection.OUTBOUND,
      subject: null,
      body: input.message,
      sentByUserId: input.sentByUserId,
      sentAt: new Date(),
    });
    this.logger.log(`SMS logged for tenant ${input.tenantId} sid=${sid}`);
    return { sid, communicationId: record.id };
  }

  private async sendViaTwilio(to: string, message: string): Promise<string> {
    const accountSid = this.configService.get<string>('sms.twilioAccountSid');
    const authToken = this.configService.get<string>('sms.twilioAuthToken');
    const from = this.configService.get<string>('sms.twilioFromNumber');
    if (!accountSid || !authToken || !from) {
      this.logger.warn(`Twilio not configured; stub SMS to ${to}`);
      return `twilio-stub-${Date.now()}`;
    }
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const body = new URLSearchParams({ To: to, From: from, Body: message });
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Twilio failed (${response.status}): ${text}`);
    }
    const json = (await response.json()) as { sid: string };
    return json.sid;
  }
}
