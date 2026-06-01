import { Controller, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { MembershipRole } from '@estateops/shared';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { InvoiceService } from './services/invoice.service';

@ApiTags('invoices')
@ApiBearerAuth()
@Controller('invoices')
@UseGuards(RolesGuard)
export class InvoicesController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Post('leases/:leaseId/rent')
  @Roles(
    MembershipRole.ORG_ADMIN,
    MembershipRole.PROPERTY_MANAGER,
    MembershipRole.ACCOUNTANT,
  )
  createRent(@Param('leaseId', ParseUUIDPipe) leaseId: string) {
    return this.invoiceService.createRentInvoices(leaseId);
  }

  @Post('leases/:leaseId/late-fee')
  @Roles(
    MembershipRole.ORG_ADMIN,
    MembershipRole.PROPERTY_MANAGER,
    MembershipRole.ACCOUNTANT,
  )
  createLateFee(@Param('leaseId', ParseUUIDPipe) leaseId: string) {
    return this.invoiceService.createLateFeeInvoice(leaseId);
  }

  @Post(':invoiceId/void')
  @Roles(
    MembershipRole.ORG_ADMIN,
    MembershipRole.PROPERTY_MANAGER,
    MembershipRole.ACCOUNTANT,
  )
  voidInvoice(@Param('invoiceId', ParseUUIDPipe) invoiceId: string) {
    return this.invoiceService.voidInvoice(invoiceId);
  }
}
