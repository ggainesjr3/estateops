import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Invoice } from '../billing/entities/invoice.entity';
import { Lease } from '../leases/entities/lease.entity';
import { MaintenanceTicket } from '../maintenance/entities/maintenance-ticket.entity';
import { Property } from '../properties/entities/property.entity';
import { Unit } from '../properties/entities/unit.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Property,
      Unit,
      Lease,
      Invoice,
      MaintenanceTicket,
      Tenant,
    ]),
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
