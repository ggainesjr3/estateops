import { Body, Controller, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { MembershipRole } from '@estateops/shared';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { PlaidExchangeDto } from './dto/plaid-exchange.dto';
import { PlaidService } from './services/plaid.service';

@ApiTags('plaid')
@ApiBearerAuth()
@Controller('plaid')
@UseGuards(RolesGuard)
export class PlaidController {
  constructor(private readonly plaidService: PlaidService) {}

  @Post('link-token/:tenantId')
  @Roles(
    MembershipRole.ORG_ADMIN,
    MembershipRole.PROPERTY_MANAGER,
    MembershipRole.TENANT,
  )
  createLinkToken(@Param('tenantId', ParseUUIDPipe) tenantId: string) {
    return this.plaidService.createLinkToken(tenantId);
  }

  @Post('exchange')
  @Roles(
    MembershipRole.ORG_ADMIN,
    MembershipRole.PROPERTY_MANAGER,
    MembershipRole.TENANT,
  )
  exchange(@Body() dto: PlaidExchangeDto) {
    return this.plaidService.exchangePublicToken(
      dto.tenantId,
      dto.publicToken,
      dto.accountId,
      dto.bankLast4,
    );
  }

  @Post('payment-methods/:paymentMethodId/verify')
  @Roles(
    MembershipRole.ORG_ADMIN,
    MembershipRole.PROPERTY_MANAGER,
    MembershipRole.TENANT,
  )
  verify(@Param('paymentMethodId', ParseUUIDPipe) paymentMethodId: string) {
    return this.plaidService.verifyBankAccount(paymentMethodId);
  }
}
