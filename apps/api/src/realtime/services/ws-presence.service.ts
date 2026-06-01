import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { wsRedisKeys } from '../constants/redis-keys';

@Injectable()
export class WsPresenceService implements OnModuleDestroy {
  private readonly redis: Redis;
  private readonly presenceTtlMs: number;

  constructor(config: ConfigService) {
    const host = config.get<string>('redis.host') ?? 'localhost';
    const port = config.get<number>('redis.port') ?? 6379;
    const password = config.get<string>('redis.password');
    this.redis = new Redis({ host, port, password });
    this.presenceTtlMs = config.get<number>('realtime.presenceTtlMs') ?? 90_000;
  }

  async markOnline(orgId: string, userId: string): Promise<void> {
    const now = Date.now();
    await this.redis.zadd(wsRedisKeys.presenceOrg(orgId), now, userId);
  }

  async markOffline(orgId: string, userId: string): Promise<void> {
    await this.redis.zrem(wsRedisKeys.presenceOrg(orgId), userId);
  }

  async heartbeat(orgId: string, userId: string): Promise<void> {
    await this.markOnline(orgId, userId);
  }

  async listOnlineUserIds(orgId: string): Promise<string[]> {
    const minScore = Date.now() - this.presenceTtlMs;
    await this.redis.zremrangebyscore(wsRedisKeys.presenceOrg(orgId), 0, minScore - 1);
    return this.redis.zrangebyscore(wsRedisKeys.presenceOrg(orgId), minScore, '+inf');
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit();
  }
}
