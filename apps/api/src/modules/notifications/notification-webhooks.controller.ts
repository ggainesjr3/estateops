import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import { ApiExcludeController, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { NotificationWebhookService } from './services/notification-webhook.service';

@ApiTags('notification-webhooks')
@ApiExcludeController()
@Controller('notifications/webhooks')
export class NotificationWebhooksController {
  constructor(private readonly webhooks: NotificationWebhookService) {}

  @Post('sendgrid')
  @HttpCode(HttpStatus.OK)
  async sendGrid(
    @Body() body: unknown,
    @Headers('x-twilio-email-event-webhook-signature') _sig?: string,
  ): Promise<{ received: boolean }> {
    await this.webhooks.handleSendGridEvents(body);
    return { received: true };
  }

  @Post('twilio')
  @HttpCode(HttpStatus.OK)
  async twilio(
    @Body() body: Record<string, string>,
    @Req() req: Request,
  ): Promise<{ received: boolean }> {
    await this.webhooks.handleTwilioStatus(body, req);
    return { received: true };
  }
}
