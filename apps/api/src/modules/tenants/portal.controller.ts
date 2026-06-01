import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MembershipRole } from '@estateops/shared';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { PortalMeResponseDto } from './dto/portal-response.dto';
import { TenantPortalGuard } from './guards/tenant-portal.guard';
import { PortalService } from './portal.service';

@ApiTags('tenant-portal')
@ApiBearerAuth()
@Controller('portal')
@UseGuards(RolesGuard, TenantPortalGuard)
@Roles(MembershipRole.TENANT)
export class PortalController {
  constructor(private readonly portalService: PortalService) {}

  @Get('me')
  @ApiOperation({ summary: 'Tenant portal — own profile, lease, and payment history' })
  @ApiOkResponse({ type: PortalMeResponseDto })
  getMe(): Promise<PortalMeResponseDto> {
    return this.portalService.getMe();
  }
}
