import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { BullModule } from '@nestjs/bullmq';
import { MiddlewareConsumer, Module, NestModule, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import emailConfig from '../config/email.config';
import smsConfig from '../config/sms.config';
import jwtConfig from '../config/jwt.config';
import { AuthCoreModule } from '../auth/auth-core.module';
import { TenantModule } from '../tenant/tenant.module';
import { BillingModule } from '../modules/billing/billing.module';
import { Invoice } from '../modules/billing/entities/invoice.entity';
import { LeasesModule } from '../modules/leases/leases.module';
import { Lease } from '../modules/leases/entities/lease.entity';
import { AiModule } from '../modules/ai/ai.module';
import { NotificationsModule } from '../modules/notifications/notifications.module';
import { ZoomModule } from '../modules/zoom/zoom.module';
import { MaintenanceTicket } from '../modules/maintenance/entities/maintenance-ticket.entity';
import { TicketUpdate } from '../modules/maintenance/entities/ticket-update.entity';
import { OrganizationMembership } from '../modules/organization-memberships/entities/organization-membership.entity';
import { TicketStateMachineService } from '../modules/maintenance/ticket-state-machine.service';
import { Organization } from '../modules/organizations/entities/organization.entity';
import { LedgerModule } from '../modules/ledger/ledger.module';
import { TenantsModule } from '../modules/tenants/tenants.module';
import {
  ACCOUNTING_QUEUE,
  AI_PROCESSING_QUEUE,
  ALL_QUEUE_NAMES,
  EMAIL_QUEUE,
  LEASE_PROCESSING_QUEUE,
  MAINTENANCE_TRIAGE_QUEUE,
  SMS_QUEUE,
  WEBHOOK_QUEUE,
  ZOOM_PROCESSING_QUEUE,
} from './constants/queue-names';
import { DEFAULT_QUEUE_JOB_OPTIONS } from './constants/job-options';
import { FailedJob } from './entities/failed-job.entity';
import { QueueAdminAuthMiddleware } from './admin/queue-admin-auth.middleware';
import { AccountingProcessor } from './processors/accounting.processor';
import { AiProcessingProcessor } from './processors/ai-processing.processor';
import { EmailProcessor } from './processors/email.processor';
import { LeaseProcessingProcessor } from './processors/lease-processing.processor';
import { MaintenanceTriageProcessor } from './processors/maintenance-triage.processor';
import { SmsProcessor } from './processors/sms.processor';
import { WebhookProcessor } from './processors/webhook.processor';
import { ZoomProcessingProcessor } from './processors/zoom-processing.processor';
import { NotificationDeliveryProcessor } from './processors/notification-delivery.processor';
import { QueueMetricsController } from './queue-metrics.controller';
import { AccountingJobHandler } from './services/accounting-job.handler';
import { EmailDeliveryService } from './services/email-delivery.service';
import { FailedJobService } from './services/failed-job.service';
import { LeaseProcessingHandler } from './services/lease-processing.handler';
import { MaintenanceSlaAlertService } from './services/maintenance-sla-alert.service';
import { MaintenanceTriageService } from './services/maintenance-triage.service';
import { OrgJobContextService } from './services/org-job-context.service';
import { QueueMetricsService } from './services/queue-metrics.service';
import { QueueProducerService } from './services/queue-producer.service';
import { QueueShutdownService } from './services/queue-shutdown.service';
import { SchedulerService } from './services/scheduler.service';
import { SmsDeliveryService } from './services/sms-delivery.service';

const queueRegistrations = ALL_QUEUE_NAMES.map((name) =>
  BullModule.registerQueue({
    name,
    defaultJobOptions: DEFAULT_QUEUE_JOB_OPTIONS,
  }),
);

const bullBoardFeatures = ALL_QUEUE_NAMES.map((name) => ({
  name,
  adapter: BullMQAdapter,
}));

@Module({
  imports: [
    ConfigModule.forFeature(emailConfig),
    ConfigModule.forFeature(smsConfig),
    ConfigModule.forFeature(jwtConfig),
    AuthCoreModule,
    TenantModule,
    forwardRef(() => BillingModule),
    forwardRef(() => LeasesModule),
    LedgerModule,
    forwardRef(() => TenantsModule),
    AiModule,
    forwardRef(() => NotificationsModule),
    forwardRef(() => ZoomModule),
    TypeOrmModule.forFeature([
      FailedJob,
      Organization,
      OrganizationMembership,
      Lease,
      Invoice,
      MaintenanceTicket,
      TicketUpdate,
    ]),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('redis.host'),
          port: config.get<number>('redis.port'),
        },
      }),
    }),
    ...queueRegistrations,
    BullBoardModule.forRoot({
      route: '/admin/queues',
      adapter: ExpressAdapter,
    }),
    BullBoardModule.forFeature(...bullBoardFeatures),
  ],
  controllers: [QueueMetricsController],
  providers: [
    FailedJobService,
    OrgJobContextService,
    QueueMetricsService,
    QueueShutdownService,
    QueueProducerService,
    SchedulerService,
    EmailDeliveryService,
    SmsDeliveryService,
    LeaseProcessingHandler,
    AccountingJobHandler,
    TicketStateMachineService,
    MaintenanceTriageService,
    MaintenanceSlaAlertService,
    EmailProcessor,
    SmsProcessor,
    AccountingProcessor,
    LeaseProcessingProcessor,
    MaintenanceTriageProcessor,
    WebhookProcessor,
    AiProcessingProcessor,
    ZoomProcessingProcessor,
    NotificationDeliveryProcessor,
    QueueAdminAuthMiddleware,
  ],
  exports: [BullModule, QueueProducerService, SchedulerService, OrgJobContextService],
})
export class QueueModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(QueueAdminAuthMiddleware).forRoutes('admin/queues', 'admin/queues/(.*)');
  }
}
