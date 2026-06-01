import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import type { Socket } from 'socket.io';
import { WS_SOCKET_META_TTL_SEC, wsRedisKeys } from '../constants/redis-keys';
import type { WsAuthenticatedUser, WsSocketMeta } from '../types/ws-connection.types';

@Injectable()
export class WsConnectionService implements OnModuleDestroy {
  private readonly logger = new Logger(WsConnectionService.name);
  private readonly redis: Redis;
  private readonly localSockets = new Map<string, WsSocketMeta>();

  constructor(config: ConfigService) {
    const host = config.get<string>('redis.host') ?? 'localhost';
    const port = config.get<number>('redis.port') ?? 6379;
    const password = config.get<string>('redis.password');
    this.redis = new Redis({ host, port, password });
  }

  async register(socket: Socket, user: WsAuthenticatedUser): Promise<void> {
    const meta: WsSocketMeta = { socketId: socket.id, user };
    this.localSockets.set(socket.id, meta);
    socket.data.user = user;

    const payload = JSON.stringify({
      userId: user.userId,
      orgId: user.orgId,
      role: user.role,
      tenantId: user.tenantId,
    });

    await this.redis
      .multi()
      .set(wsRedisKeys.socketMeta(socket.id), payload, 'EX', WS_SOCKET_META_TTL_SEC)
      .sadd(wsRedisKeys.userSockets(user.userId), socket.id)
      .exec();
  }

  get(socket: Socket): WsSocketMeta | undefined {
    const local = this.localSockets.get(socket.id);
    if (local) return local;
    const user = socket.data.user as WsAuthenticatedUser | undefined;
    if (user) {
      return { socketId: socket.id, user };
    }
    return undefined;
  }

  async unregister(socket: Socket): Promise<WsAuthenticatedUser | null> {
    const meta = this.localSockets.get(socket.id);
    this.localSockets.delete(socket.id);

    const raw = await this.redis.get(wsRedisKeys.socketMeta(socket.id));
    await this.redis.del(wsRedisKeys.socketMeta(socket.id));

    const parsed = meta?.user ?? this.parseMeta(raw);
    if (parsed?.userId) {
      await this.redis.srem(wsRedisKeys.userSockets(parsed.userId), socket.id);
    }

    return meta?.user ?? (parsed ? { userId: parsed.userId, orgId: parsed.orgId, role: parsed.role, tenantId: parsed.tenantId } : null);
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit();
  }

  private parseMeta(raw: string | null): {
    userId: string;
    orgId: string;
    role: WsAuthenticatedUser['role'];
    tenantId?: string;
  } | null {
    if (!raw) return null;
    try {
      return JSON.parse(raw) as {
        userId: string;
        orgId: string;
        role: WsAuthenticatedUser['role'];
        tenantId?: string;
      };
    } catch {
      this.logger.warn('Failed to parse ws socket meta from Redis');
      return null;
    }
  }
}
