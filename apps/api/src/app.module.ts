import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';
import { AuthCoreModule } from './auth/auth-core.module';
import { HealthModule } from './health/health.module';
import { TenantModule } from './tenant/tenant.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { OrganizationMembershipsModule } from './modules/organization-memberships/organization-memberships.module';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';
import { PropertiesModule } from './modules/properties/properties.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { LeasesModule } from './modules/leases/leases.module';
import { LedgerModule } from './modules/ledger/ledger.module';
import redisConfig from './config/redis.config';
import authConfig from './config/auth.config';
import stripeConfig from './config/stripe.config';
import plaidConfig from './config/plaid.config';
import paymentsEncryptionConfig from './config/payments-encryption.config';
import openaiConfig from './config/openai.config';
import storageConfig from './config/storage.config';
import notificationConfig from './config/notification.config';
import zoomConfig from './config/zoom.config';
import realtimeConfig from './config/realtime.config';
import emailConfig from './config/email.config';
import smsConfig from './config/sms.config';
import { BillingModule } from './modules/billing/billing.module';
import { QueueModule } from './queues/queue.module';
import { AccountingModule } from './modules/accounting/accounting.module';
import { MaintenanceModule } from './modules/maintenance/maintenance.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ZoomModule } from './modules/zoom/zoom.module';
import { RealtimeModule } from './realtime/realtime.module';
import { AdminModule } from './modules/admin/admin.module';
import { ReportsModule } from './modules/reports/reports.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        databaseConfig,
        jwtConfig,
        authConfig,
        redisConfig,
        stripeConfig,
        plaidConfig,
        paymentsEncryptionConfig,
        openaiConfig,
        storageConfig,
        notificationConfig,
        emailConfig,
        smsConfig,
        zoomConfig,
        realtimeConfig,
      ],
      envFilePath: ['.env.local', '.env', '../../.env.local', '../../.env'],
    }),
    TenantModule,
    AuthCoreModule,
    DatabaseModule,
    HealthModule,
    OrganizationsModule,
    UsersModule,
    AuthModule,
    OrganizationMembershipsModule,
    AuditLogsModule,
    PropertiesModule,
    TenantsModule,
    LeasesModule,
    LedgerModule,
    BillingModule,
    QueueModule,
    AccountingModule,
    MaintenanceModule,
    DocumentsModule,
    NotificationsModule,
    ZoomModule,
    RealtimeModule,
    AdminModule,
    ReportsModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: JwtAuthGuard }],
})
export class AppModule {}
