import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthModule } from '../../health/health.module';
import { QueueModule } from '../../queues/queue.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { Payment } from '../billing/entities/payment.entity';
import { Lease } from '../leases/entities/lease.entity';
import { MaintenanceTicket } from '../maintenance/entities/maintenance-ticket.entity';
import { OrganizationMembership } from '../organization-memberships/entities/organization-membership.entity';
import { Property } from '../properties/entities/property.entity';
import { Unit } from '../properties/entities/unit.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { User } from '../users/entities/user.entity';
import { AuditLog } from '../audit-logs/entities/audit-log.entity';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Property,
      Unit,
      Tenant,
      Lease,
      MaintenanceTicket,
      OrganizationMembership,
      AuditLog,
      Payment,
    ]),
    AuditLogsModule,
    QueueModule,
    HealthModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
