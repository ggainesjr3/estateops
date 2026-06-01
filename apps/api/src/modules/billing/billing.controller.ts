import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
  forwardRef,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { MembershipRole } from '@estateops/shared';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { AccountingReportingService } from '../accounting/accounting-reporting.service';
import {
  CreateInvoiceDto,
  ListInvoicesQueryDto,
} from '../accounting/dto/accounting-query.dto';
import { CreatePaymentMethodDto } from './dto/create-payment-method.dto';
import { PayInvoiceDto } from './dto/pay-invoice.dto';
import { RefundPaymentDto } from './dto/refund-payment.dto';
import { BillingService } from './billing.service';

const BILLING_READ_ROLES = [
  MembershipRole.ORG_ADMIN,
  MembershipRole.PROPERTY_MANAGER,
  MembershipRole.ACCOUNTANT,
  MembershipRole.TENANT,
];

const BILLING_WRITE_ROLES = [
  MembershipRole.ORG_ADMIN,
  MembershipRole.PROPERTY_MANAGER,
  MembershipRole.ACCOUNTANT,
];

const PAY_ROLES = [...BILLING_READ_ROLES];

@ApiTags('billing')
@ApiBearerAuth()
@Controller('billing')
@UseGuards(RolesGuard)
export class BillingController {
  constructor(
    private readonly billingService: BillingService,
    @Inject(forwardRef(() => AccountingReportingService))
    private readonly accounting: AccountingReportingService,
  ) {}

  @Post('payment-methods')
  @Roles(...PAY_ROLES)
  addPaymentMethod(@Body() dto: CreatePaymentMethodDto) {
    return this.billingService.addPaymentMethod({
      stripePaymentMethodId: dto.stripePaymentMethodId,
      tenantId: dto.tenantId,
      isDefault: dto.isDefault,
    });
  }

  @Get('invoices')
  @Roles(...BILLING_READ_ROLES)
  listInvoices(@Query() query: ListInvoicesQueryDto) {
    return this.accounting.listInvoices(query);
  }

  @Post('invoices')
  @Roles(...BILLING_WRITE_ROLES)
  createInvoice(@Body() dto: CreateInvoiceDto) {
    return this.accounting.createInvoice(dto);
  }

  @Get('invoices/:id')
  @Roles(...BILLING_READ_ROLES)
  getInvoice(@Param('id', ParseUUIDPipe) id: string) {
    return this.accounting.getInvoiceDetail(id);
  }

  @Post('invoices/:id/pay')
  @Roles(...PAY_ROLES)
  payInvoice(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PayInvoiceDto,
  ) {
    return this.billingService.payInvoice(id, dto.paymentMethodId);
  }

  @Post('payments/:paymentId/refund')
  @Roles(MembershipRole.ORG_ADMIN, MembershipRole.ACCOUNTANT)
  refundPayment(
    @Param('paymentId', ParseUUIDPipe) paymentId: string,
    @Body() dto: RefundPaymentDto,
  ) {
    return this.billingService.refundPayment(paymentId, dto.amount, dto.idempotencyKey);
  }
}
