import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentsModule } from '../documents/documents.module';
import { LeasesModule } from '../leases/leases.module';
import { TenantCommunicationHistory } from './entities/tenant-communication-history.entity';
import { TenantEmergencyContact } from './entities/tenant-emergency-contact.entity';
import { TenantPayment } from './entities/tenant-payment.entity';
import { Tenant } from './entities/tenant.entity';
import { TenantPortalGuard } from './guards/tenant-portal.guard';
import { PortalController } from './portal.controller';
import { PortalService } from './portal.service';
import { CommunicationHistoryRepository } from './repositories/communication-history.repository';
import { EmergencyContactRepository } from './repositories/emergency-contact.repository';
import { PaymentRepository } from './repositories/payment.repository';
import { TenantRepository } from './repositories/tenant.repository';
import { CommunicationQueueService } from './services/communication-queue.service';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';

@Module({
  imports: [
    LeasesModule,
    DocumentsModule,
    TypeOrmModule.forFeature([
      Tenant,
      TenantEmergencyContact,
      TenantCommunicationHistory,
      TenantPayment,
    ]),
  ],
  controllers: [TenantsController, PortalController],
  providers: [
    TenantsService,
    PortalService,
    TenantRepository,
    EmergencyContactRepository,
    CommunicationHistoryRepository,
    PaymentRepository,
    CommunicationQueueService,
    TenantPortalGuard,
  ],
  exports: [TenantsService, TenantRepository, CommunicationHistoryRepository],
})
export class TenantsModule {}
