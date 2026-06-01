import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export interface NotificationBroadcastPayload {
  type: string;
  orgId: string;
  userId: string;
  notificationId: string;
  subject: string | null;
  body: string;
  referenceType: string | null;
  referenceId: string | null;
  createdAt: string;
}

const CHANNEL = 'estateops:notifications';

@Injectable()
export class NotificationBroadcastService implements OnModuleDestroy {
  private readonly logger = new Logger(NotificationBroadcastService.name);
  private publisher: Redis | null = null;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('redis.host');
    const port = this.configService.get<number>('redis.port');
    if (host && port) {
      this.publisher = new Redis({ host, port, maxRetriesPerRequest: 1 });
    }
  }

  async publish(payload: NotificationBroadcastPayload): Promise<void> {
    const message = JSON.stringify(payload);
    if (this.publisher) {
      await this.publisher.publish(CHANNEL, message);
    }
    this.logger.debug(`Broadcast ${payload.type} to user ${payload.userId}`);
  }

  onModuleDestroy(): void {
    this.publisher?.disconnect();
  }
}
