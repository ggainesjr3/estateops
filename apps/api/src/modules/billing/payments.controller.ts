import { randomUUID } from 'crypto';
import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Public } from '../../auth/decorators/public.decorator';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { MembershipRole } from '@estateops/shared';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { RefundPaymentDto } from './dto/refund-payment.dto';
import { PaymentService } from './services/payment.service';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('intents')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(
    MembershipRole.ORG_ADMIN,
    MembershipRole.PROPERTY_MANAGER,
    MembershipRole.ACCOUNTANT,
    MembershipRole.TENANT,
  )
  createIntent(@Body() dto: CreatePaymentIntentDto) {
    return this.paymentService.createPaymentIntent(dto);
  }

  @Post(':paymentId/confirm')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(
    MembershipRole.ORG_ADMIN,
    MembershipRole.PROPERTY_MANAGER,
    MembershipRole.ACCOUNTANT,
    MembershipRole.TENANT,
  )
  confirm(@Param('paymentId', ParseUUIDPipe) paymentId: string) {
    return this.paymentService.confirmPayment(paymentId);
  }

  @Post(':paymentId/refund')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(MembershipRole.ORG_ADMIN, MembershipRole.ACCOUNTANT)
  refund(
    @Param('paymentId', ParseUUIDPipe) paymentId: string,
    @Body() dto: RefundPaymentDto,
  ) {
    const idempotencyKey = dto.idempotencyKey ?? `refund:${paymentId}:${randomUUID()}`;
    return this.paymentService.refundPayment(paymentId, idempotencyKey, dto.amount);
  }

  @Post('invoices/:invoiceId/autopay')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(
    MembershipRole.ORG_ADMIN,
    MembershipRole.PROPERTY_MANAGER,
    MembershipRole.ACCOUNTANT,
  )
  scheduleAutopay(@Param('invoiceId', ParseUUIDPipe) invoiceId: string) {
    return this.paymentService.scheduleAutopay(invoiceId);
  }

  @Public()
  @Post('webhooks/stripe')
  stripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    const rawBody = req.rawBody;
    if (!rawBody || !signature) {
      throw new BadRequestException('Missing raw body or Stripe signature');
    }
    return this.paymentService.handleStripeWebhook(rawBody, signature);
  }
}
