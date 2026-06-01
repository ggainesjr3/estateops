import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QueueModule } from '../../queues/queue.module';
import { Tenant } from '../tenants/entities/tenant.entity';
import { Lease } from './entities/lease.entity';
import { LeaseTenant } from './entities/lease-tenant.entity';
import { LeaseVersion } from './entities/lease-version.entity';
import { LeaseStateMachineService } from './lease-state-machine.service';
import { LeasesController } from './leases.controller';
import { LeasesService } from './leases.service';
import { LeaseRepository } from './repositories/lease.repository';
import { LeaseTenantRepository } from './repositories/lease-tenant.repository';
import { LeaseVersionRepository } from './repositories/lease-version.repository';
import { LeaseExpirationScheduler } from './services/lease-expiration.scheduler';

@Module({
  imports: [
    forwardRef(() => QueueModule),
    TypeOrmModule.forFeature([Lease, LeaseTenant, LeaseVersion, Tenant]),
  ],
  controllers: [LeasesController],
  providers: [
    LeasesService,
    LeaseStateMachineService,
    LeaseRepository,
    LeaseTenantRepository,
    LeaseVersionRepository,
    LeaseExpirationScheduler,
  ],
  exports: [LeasesService, LeaseRepository, LeaseTenantRepository],
})
export class LeasesModule {}
