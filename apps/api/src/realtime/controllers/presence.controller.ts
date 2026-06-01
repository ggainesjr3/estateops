import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MembershipRole } from '@estateops/shared';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { CurrentOrg } from '../../tenant/decorators/current-org.decorator';
import { OnlinePresenceResponseDto } from '../dto/presence.dto';
import { WsPresenceService } from '../services/ws-presence.service';

@ApiTags('presence')
@ApiBearerAuth()
@Controller('presence')
@UseGuards(RolesGuard)
export class PresenceController {
  constructor(private readonly presence: WsPresenceService) {}

  @Get('online')
  @Roles(MembershipRole.ORG_ADMIN)
  @ApiOperation({ summary: 'List online user IDs in the current organization (admin only)' })
  @ApiOkResponse({ type: OnlinePresenceResponseDto })
  async listOnline(@CurrentOrg() orgId: string): Promise<OnlinePresenceResponseDto> {
    const userIds = await this.presence.listOnlineUserIds(orgId);
    return { userIds };
  }
}
