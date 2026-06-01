import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organization } from '../modules/organizations/entities/organization.entity';
import { User } from '../modules/users/entities/user.entity';
import { AuthProvider } from '../modules/auth/entities/auth-provider.entity';
import { RefreshToken } from '../modules/auth/entities/refresh-token.entity';
import { OrganizationMembership } from '../modules/organization-memberships/entities/organization-membership.entity';
import { AuditLog } from '../modules/audit-logs/entities/audit-log.entity';
import { Building } from '../modules/properties/entities/building.entity';
import { Property } from '../modules/properties/entities/property.entity';
import { Unit } from '../modules/properties/entities/unit.entity';
import { Lease } from '../modules/leases/entities/lease.entity';
import { LeaseTenant } from '../modules/leases/entities/lease-tenant.entity';
import { LeaseVersion } from '../modules/leases/entities/lease-version.entity';
import { TenantCommunicationHistory } from '../modules/tenants/entities/tenant-communication-history.entity';
import { TenantEmergencyContact } from '../modules/tenants/entities/tenant-emergency-contact.entity';
import { TenantPayment } from '../modules/tenants/entities/tenant-payment.entity';
import { Tenant } from '../modules/tenants/entities/tenant.entity';
import { LedgerAccount } from '../modules/ledger/entities/ledger-account.entity';
import { LedgerEntry } from '../modules/ledger/entities/ledger-entry.entity';
import { LedgerTransaction } from '../modules/ledger/entities/ledger-transaction.entity';
import { Invoice } from '../modules/billing/entities/invoice.entity';
import { Payment } from '../modules/billing/entities/payment.entity';
import { PaymentMethod } from '../modules/billing/entities/payment-method.entity';
import { FailedJob } from '../queues/entities/failed-job.entity';
import { AiCallLog } from '../modules/ai/entities/ai-call-log.entity';
import { MaintenanceTicket } from '../modules/maintenance/entities/maintenance-ticket.entity';
import { TicketUpdate } from '../modules/maintenance/entities/ticket-update.entity';
import { TicketAttachment } from '../modules/maintenance/entities/ticket-attachment.entity';
import { Vendor } from '../modules/maintenance/entities/vendor.entity';
import { VendorInvoice } from '../modules/maintenance/entities/vendor-invoice.entity';
import { Document } from '../modules/documents/entities/document.entity';
import { NotificationTemplate } from '../modules/notifications/entities/notification-template.entity';
import { Notification } from '../modules/notifications/entities/notification.entity';
import { NotificationOptOut } from '../modules/notifications/entities/notification-opt-out.entity';
import { NotificationPushSubscription } from '../modules/notifications/entities/notification-push-subscription.entity';
import { NotificationDeliveryEvent } from '../modules/notifications/entities/notification-delivery-event.entity';
import { MeetingArchive } from '../modules/zoom/entities/meeting-archive.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres' as const,
        host: configService.get<string>('database.host'),
        port: configService.get<number>('database.port'),
        username: configService.get<string>('database.username'),
        password: configService.get<string>('database.password'),
        database: configService.get<string>('database.database'),
        entities: [
          Organization,
          User,
          AuthProvider,
          RefreshToken,
          OrganizationMembership,
          AuditLog,
          Property,
          Building,
          Unit,
          Tenant,
          TenantEmergencyContact,
          TenantCommunicationHistory,
          Lease,
          LeaseTenant,
          LeaseVersion,
          TenantPayment,
          LedgerAccount,
          LedgerTransaction,
          LedgerEntry,
          Invoice,
          Payment,
          PaymentMethod,
          FailedJob,
          AiCallLog,
          MaintenanceTicket,
          TicketUpdate,
          TicketAttachment,
          Vendor,
          VendorInvoice,
          Document,
          NotificationTemplate,
          Notification,
          NotificationOptOut,
          NotificationPushSubscription,
          NotificationDeliveryEvent,
          MeetingArchive,
        ],
        synchronize: false,
        migrationsRun: false,
      }),
    }),
  ],
})
export class DatabaseModule {}
