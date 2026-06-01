import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import realtimeConfig from '../config/realtime.config';
import { OrganizationMembership } from '../modules/organization-memberships/entities/organization-membership.entity';
import { Property } from '../modules/properties/entities/property.entity';
import { Tenant } from '../modules/tenants/entities/tenant.entity';
import { NotificationsModule } from '../modules/notifications/notifications.module';
import { TenantModule } from '../tenant/tenant.module';
import { PresenceController } from './controllers/presence.controller';
import { WsGateway } from './gateways/ws.gateway';
import { EventsService } from './services/events.service';
import { WsAuthService } from './services/ws-auth.service';
import { WsConnectionService } from './services/ws-connection.service';
import { WsPresenceService } from './services/ws-presence.service';
import { WsRoomService } from './services/ws-room.service';

@Module({
  imports: [
    ConfigModule.forFeature(realtimeConfig),
    TenantModule,
    TypeOrmModule.forFeature([OrganizationMembership, Property, Tenant]),
    forwardRef(() => NotificationsModule),
  ],
  controllers: [PresenceController],
  providers: [
    WsGateway,
    EventsService,
    WsAuthService,
    WsConnectionService,
    WsRoomService,
    WsPresenceService,
  ],
  exports: [EventsService],
})
export class RealtimeModule {}
