import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QueueModule } from '../../queues/queue.module';
import { PropertiesModule } from '../properties/properties.module';
import { MaintenanceTicket } from './entities/maintenance-ticket.entity';
import { TicketAttachment } from './entities/ticket-attachment.entity';
import { TicketUpdate } from './entities/ticket-update.entity';
import { Vendor } from './entities/vendor.entity';
import { VendorInvoice } from './entities/vendor-invoice.entity';
import { MaintenanceTicketsController } from './maintenance-tickets.controller';
import { MaintenanceTicketsService } from './maintenance-tickets.service';
import { MaintenanceTicketRepository } from './repositories/maintenance-ticket.repository';
import { TicketAttachmentRepository } from './repositories/ticket-attachment.repository';
import { TicketUpdateRepository } from './repositories/ticket-update.repository';
import { VendorRepository } from './repositories/vendor.repository';
import { VendorInvoiceRepository } from './repositories/vendor-invoice.repository';
import { MaintenanceSlaSchedulerService } from './services/maintenance-sla-scheduler.service';
import { TicketStateMachineService } from './ticket-state-machine.service';
import { VendorsController } from './vendors.controller';
import { VendorsService } from './vendors.service';

@Module({
  imports: [
    forwardRef(() => QueueModule),
    PropertiesModule,
    TypeOrmModule.forFeature([
      MaintenanceTicket,
      TicketUpdate,
      TicketAttachment,
      Vendor,
      VendorInvoice,
    ]),
  ],
  controllers: [MaintenanceTicketsController, VendorsController],
  providers: [
    MaintenanceTicketsService,
    VendorsService,
    TicketStateMachineService,
    MaintenanceTicketRepository,
    TicketUpdateRepository,
    TicketAttachmentRepository,
    VendorRepository,
    VendorInvoiceRepository,
    MaintenanceSlaSchedulerService,
  ],
  exports: [
    MaintenanceTicketsService,
    MaintenanceTicketRepository,
    TicketStateMachineService,
  ],
})
export class MaintenanceModule {}
