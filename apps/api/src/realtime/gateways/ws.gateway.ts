import { Inject, Logger, UnauthorizedException, forwardRef } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { WsClientEvents } from '@estateops/shared';
import type { Server, Socket } from 'socket.io';
import { TenantContext } from '../../tenant/tenant.context';
import { NotificationService } from '../../modules/notifications/services/notification.service';
import { EventsService } from '../services/events.service';
import { WsAuthService } from '../services/ws-auth.service';
import { WsConnectionService } from '../services/ws-connection.service';
import { WsPresenceService } from '../services/ws-presence.service';
import { WsRoomService } from '../services/ws-room.service';

@WebSocketGateway({
  cors: {
    origin: process.env.WS_CORS_ORIGIN ?? process.env.CORS_ORIGIN ?? 'http://localhost:3000',
    credentials: true,
  },
  pingInterval: 30_000,
  pingTimeout: 10_000,
})
export class WsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(WsGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly auth: WsAuthService,
    private readonly connections: WsConnectionService,
    private readonly rooms: WsRoomService,
    private readonly presence: WsPresenceService,
    private readonly events: EventsService,
    @Inject(forwardRef(() => NotificationService))
    private readonly notifications: NotificationService,
  ) {}

  afterInit(server: Server): void {
    this.events.setServer(server);
    this.logger.log('WebSocket gateway initialized (ping interval 30s)');
  }

  async handleConnection(@ConnectedSocket() client: Socket): Promise<void> {
    try {
      const user = await this.auth.authenticate(client);
      await this.connections.register(client, user);
      const joined = await this.rooms.joinRooms(client, user);
      await this.presence.markOnline(user.orgId, user.userId);

      const presenceInterval = setInterval(() => {
        void this.presence.heartbeat(user.orgId, user.userId);
      }, 25_000);
      client.on('disconnect', () => clearInterval(presenceInterval));

      this.logger.log(
        `WS connect socket=${client.id} user=${user.userId} org=${user.orgId} rooms=${joined.length}`,
      );
    } catch (err) {
      const message =
        err instanceof UnauthorizedException ? err.message : 'Unauthorized';
      this.logger.warn(`WS auth rejected socket=${client.id}: ${message}`);
      client.emit('exception', { statusCode: 401, message });
      client.disconnect(true);
    }
  }

  async handleDisconnect(@ConnectedSocket() client: Socket): Promise<void> {
    const user = await this.connections.unregister(client);
    if (user) {
      await this.presence.markOffline(user.orgId, user.userId);
      this.logger.log(`WS disconnect socket=${client.id} user=${user.userId} org=${user.orgId}`);
    } else {
      this.logger.log(`WS disconnect socket=${client.id} (unauthenticated)`);
    }
  }

  @SubscribeMessage(WsClientEvents.NOTIFICATIONS_MARK_READ)
  async markNotificationRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { notificationId?: string },
  ): Promise<{ ok: boolean }> {
    const meta = this.connections.get(client);
    if (!meta) {
      throw new UnauthorizedException('Not authenticated');
    }
    if (!body?.notificationId) {
      return { ok: false };
    }

    await TenantContext.run(
      { orgId: meta.user.orgId, userId: meta.user.userId },
      () => this.notifications.markRead(body.notificationId!, meta.user.userId),
    );

    return { ok: true };
  }
}
