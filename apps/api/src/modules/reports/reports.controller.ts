import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { MembershipRole } from '@estateops/shared';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { TenantContext } from '../../tenant/tenant.context';
import { ReportDateRangeQueryDto, RentRollReportQueryDto } from './dto/reports-query.dto';
import { ReportsService } from './reports.service';

const REPORT_ROLES = [
  MembershipRole.ORG_ADMIN,
  MembershipRole.PROPERTY_MANAGER,
  MembershipRole.ACCOUNTANT,
];

@ApiTags('reports')
@ApiBearerAuth()
@Controller('reports')
@UseGuards(RolesGuard)
@Roles(...REPORT_ROLES)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('occupancy')
  occupancyReport(@Query() query: ReportDateRangeQueryDto) {
    return this.reportsService.occupancyReport(TenantContext.getOrgId(), {
      propertyId: query.propertyId,
      from: query.from,
      to: query.to,
    });
  }

  @Get('revenue')
  revenueReport(@Query() query: ReportDateRangeQueryDto) {
    return this.reportsService.revenueReport(TenantContext.getOrgId(), {
      propertyId: query.propertyId,
      from: query.from,
      to: query.to,
    });
  }

  @Get('maintenance')
  maintenanceReport(@Query() query: ReportDateRangeQueryDto) {
    return this.reportsService.maintenanceReport(TenantContext.getOrgId(), {
      propertyId: query.propertyId,
      from: query.from,
      to: query.to,
    });
  }

  @Get('rent-roll')
  rentRollReport(@Query() query: RentRollReportQueryDto) {
    const asOf = query.asOf ? new Date(`${query.asOf}T12:00:00.000Z`) : undefined;
    return this.reportsService.rentRollReport(TenantContext.getOrgId(), asOf);
  }

  @Get('delinquency')
  delinquencyReport() {
    return this.reportsService.delinquencyReport(TenantContext.getOrgId());
  }
}
