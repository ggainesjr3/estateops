import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import storageConfig from '../../config/storage.config';
import { STORAGE_BACKEND } from './storage.service';
import { SharePointGraphClient } from './providers/sharepoint-graph.client';
import { SharePointStorageBackend } from './providers/sharepoint-storage.backend';
import { S3StorageBackend } from './providers/s3-storage.backend';
import { StorageService } from './storage.service';

@Module({
  imports: [ConfigModule.forFeature(storageConfig)],
  providers: [
    SharePointGraphClient,
    SharePointStorageBackend,
    S3StorageBackend,
    {
      provide: STORAGE_BACKEND,
      useFactory: (
        config: ConfigService,
        sharepoint: SharePointStorageBackend,
        s3: S3StorageBackend,
      ) => {
        const provider = config.get<string>('storage.provider') ?? 'sharepoint';
        return provider === 's3' ? s3 : sharepoint;
      },
      inject: [ConfigService, SharePointStorageBackend, S3StorageBackend],
    },
    StorageService,
  ],
  exports: [StorageService, SharePointGraphClient],
})
export class StorageModule {}
