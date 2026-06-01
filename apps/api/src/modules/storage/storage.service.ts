import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { StorageProviderType } from '../../config/storage.config';
import {
  orgFolderPaths,
  propertyFolderPaths,
  tenantFolderPath,
} from './constants/folder-paths';
import {
  SignedDownloadResult,
  StorageBackend,
  StoredFileResult,
  UploadSessionResult,
} from './interfaces/storage-backend.interface';

export const STORAGE_BACKEND = Symbol('STORAGE_BACKEND');

@Injectable()
export class StorageService {
  constructor(
    @Inject(STORAGE_BACKEND) private readonly backend: StorageBackend,
    private readonly config: ConfigService,
  ) {}

  get activeProvider(): StorageProviderType {
    return this.config.get<StorageProviderType>('storage.provider') ?? 'sharepoint';
  }

  async uploadFile(
    orgId: string,
    folderPath: string,
    fileName: string,
    buffer: Buffer,
    mimeType: string,
  ): Promise<StoredFileResult> {
    void orgId;
    return this.backend.uploadFile(folderPath, fileName, buffer, mimeType);
  }

  async uploadStream(
    orgId: string,
    folderPath: string,
    fileName: string,
    mimeType: string,
    contentLength: number,
    stream: ReadableStream<Uint8Array>,
  ): Promise<StoredFileResult> {
    void orgId;
    return this.backend.uploadStream(
      folderPath,
      fileName,
      mimeType,
      contentLength,
      stream,
    );
  }

  async createUploadSession(
    folderPath: string,
    fileName: string,
    mimeType: string,
  ): Promise<UploadSessionResult> {
    return this.backend.createUploadSession(folderPath, fileName, mimeType);
  }

  async getSignedDownloadUrl(fileId: string): Promise<SignedDownloadResult> {
    return this.backend.getSignedDownloadUrl(fileId);
  }

  async deleteFile(fileId: string): Promise<void> {
    return this.backend.deleteFile(fileId);
  }

  async createOrgFolderStructure(orgId: string): Promise<void> {
    for (const path of orgFolderPaths(orgId)) {
      await this.backend.ensureFolder(path);
    }
  }

  async createPropertyFolders(orgId: string, propertyId: string): Promise<void> {
    await this.backend.ensureFolder(`${orgId}/Properties/${propertyId}`);
    for (const path of propertyFolderPaths(orgId, propertyId)) {
      await this.backend.ensureFolder(path);
    }
  }

  async createTenantFolder(orgId: string, tenantId: string): Promise<void> {
    await this.backend.ensureFolder(tenantFolderPath(orgId, tenantId));
  }
}
