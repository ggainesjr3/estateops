import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { MembershipRole } from '@estateops/shared';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { TenantContext } from '../../tenant/tenant.context';
import { AdminService } from './admin.service';
import { ListAuditLogsQueryDto, UpdateUserRoleDto } from './dto/admin-query.dto';

const ADMIN_ROLES = [MembershipRole.SUPER_ADMIN, MembershipRole.ORG_ADMIN];

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(RolesGuard)
@Roles(...ADMIN_ROLES)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  getStats() {
    return this.adminService.getOrgStats(TenantContext.getOrgId());
  }

  @Get('users')
  getUsers() {
    return this.adminService.getUsers(TenantContext.getOrgId());
  }

  @Patch('users/:id/role')
  updateUserRole(
    @Param('id', ParseUUIDPipe) userId: string,
    @Body() dto: UpdateUserRoleDto,
  ) {
    return this.adminService.updateUserRole(
      TenantContext.getOrgId(),
      userId,
      dto.role,
    );
  }

  @Patch('users/:id/deactivate')
  deactivateUser(@Param('id', ParseUUIDPipe) userId: string) {
    return this.adminService.deactivateUser(TenantContext.getOrgId(), userId);
  }

  @Get('audit-logs')
  getAuditLogs(@Query() query: ListAuditLogsQueryDto) {
    return this.adminService.getAuditLogs(TenantContext.getOrgId(), query);
  }

  @Get('system-health')
  getSystemHealth() {
    return this.adminService.getSystemHealth();
  }

  @Get('queues')
  getQueues() {
    return this.adminService.getQueues();
  }
}
