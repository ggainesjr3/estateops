import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import type { HealthCheckResponse } from '@estateops/shared';
import { APP_NAME } from '@estateops/shared';
import { RedisHealthIndicator } from './redis-health.indicator';

@Controller('api/health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly redis: RedisHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  async check() {
    return this.health.check([() => this.redis.isHealthy('redis')]);
  }

  @Get('live')
  live(): HealthCheckResponse {
    return {
      status: 'ok',
      service: APP_NAME,
      timestamp: new Date().toISOString(),
    };
  }
}
