import {
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Req,
} from '@nestjs/common';
import { ApiExcludeController, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { ZoomWebhookService } from './services/zoom-webhook.service';

@ApiTags('zoom-webhooks')
@ApiExcludeController()
@Controller('webhooks/zoom')
export class ZoomWebhookController {
  private readonly logger = new Logger(ZoomWebhookController.name);

  constructor(private readonly webhooks: ZoomWebhookService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async handle(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('x-zm-request-timestamp') timestamp?: string,
    @Headers('x-zm-signature') signature?: string,
  ): Promise<Record<string, unknown>> {
    const rawBody = req.rawBody?.toString('utf8') ?? JSON.stringify(req.body ?? {});

    const body = this.webhooks.verifyAndParse(timestamp, signature, rawBody);

    if (body.event === 'endpoint.url_validation' && body.payload?.plainToken) {
      return this.webhooks.handleValidation(body.payload.plainToken);
    }

    void this.webhooks.handleEvent(body).catch((err) => {
      this.logger.error('Zoom webhook handler error', err);
    });

    return { received: true };
  }
}
