import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import zoomConfig from '../../config/zoom.config';
import { QueueModule } from '../../queues/queue.module';
import { StorageModule } from '../storage/storage.module';
import { AiModule } from '../ai/ai.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { User } from '../users/entities/user.entity';
import { MeetingArchive } from './entities/meeting-archive.entity';
import { MeetingArchiveRepository } from './repositories/meeting-archive.repository';
import { ZoomApiService } from './services/zoom-api.service';
import { ZoomProcessingHandler } from './services/zoom-processing.handler';
import { ZoomWebhookService } from './services/zoom-webhook.service';
import { ZoomService } from './zoom.service';
import { ZoomWebhookController } from './zoom-webhook.controller';
import { MeetingsController } from './meetings.controller';

@Module({
  imports: [
    ConfigModule.forFeature(zoomConfig),
    StorageModule,
    AiModule,
    forwardRef(() => QueueModule),
    forwardRef(() => NotificationsModule),
    TypeOrmModule.forFeature([MeetingArchive, User]),
  ],
  controllers: [ZoomWebhookController, MeetingsController],
  providers: [
    MeetingArchiveRepository,
    ZoomApiService,
    ZoomProcessingHandler,
    ZoomWebhookService,
    ZoomService,
  ],
  exports: [ZoomService, ZoomProcessingHandler, ZoomWebhookService],
})
export class ZoomModule {}
