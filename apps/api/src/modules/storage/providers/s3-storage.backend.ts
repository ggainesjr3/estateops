import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { DocumentStorageProvider } from '@estateops/shared';
import {
  SignedDownloadResult,
  StorageBackend,
  StoredFileResult,
  UploadSessionResult,
} from '../interfaces/storage-backend.interface';

@Injectable()
export class S3StorageBackend implements StorageBackend {
  readonly provider = DocumentStorageProvider.S3;
  private client: S3Client | null = null;

  constructor(private readonly config: ConfigService) {}

  async ensureFolder(_folderPath: string): Promise<void> {
    // S3 uses key prefixes; no explicit folder creation required.
  }

  async uploadFile(
    folderPath: string,
    fileName: string,
    buffer: Buffer,
    mimeType: string,
  ): Promise<StoredFileResult> {
    const key = this.objectKey(folderPath, fileName);
    await this.getClient().send(
      new PutObjectCommand({
        Bucket: this.bucket(),
        Key: key,
        Body: buffer,
        ContentType: mimeType,
      }),
    );

    const download = await this.getSignedDownloadUrl(key);
    return {
      id: key,
      webUrl: `s3://${this.bucket()}/${key}`,
      downloadUrl: download.downloadUrl,
      size: buffer.length,
    };
  }

  async uploadStream(
    folderPath: string,
    fileName: string,
    mimeType: string,
    contentLength: number,
    stream: ReadableStream<Uint8Array>,
  ): Promise<StoredFileResult> {
    const chunks: Buffer[] = [];
    const reader = stream.getReader();
    let total = 0;
    while (total < contentLength) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(Buffer.from(value));
      total += value.length;
    }
    const buffer = Buffer.concat(chunks);
    return this.uploadFile(folderPath, fileName, buffer, mimeType);
  }

  async createUploadSession(
    folderPath: string,
    fileName: string,
    mimeType: string,
  ): Promise<UploadSessionResult> {
    const key = this.objectKey(folderPath, fileName);
    const ttl = this.config.get<number>('storage.uploadUrlTtlSeconds') ?? 3600;
    const command = new PutObjectCommand({
      Bucket: this.bucket(),
      Key: key,
      ContentType: mimeType,
    });
    const uploadUrl = await getSignedUrl(this.getClient(), command, { expiresIn: ttl });

    return {
      uploadUrl,
      expiresAt: new Date(Date.now() + ttl * 1000).toISOString(),
      provider: this.provider,
      folderPath,
      fileName,
    };
  }

  async getSignedDownloadUrl(fileId: string): Promise<SignedDownloadResult> {
    const ttl = this.config.get<number>('storage.downloadUrlTtlSeconds') ?? 3600;
    const getCmd = new GetObjectCommand({
      Bucket: this.bucket(),
      Key: fileId,
    });
    const downloadUrl = await getSignedUrl(this.getClient(), getCmd, { expiresIn: ttl });

    return {
      downloadUrl,
      expiresAt: new Date(Date.now() + ttl * 1000).toISOString(),
    };
  }

  async deleteFile(fileId: string): Promise<void> {
    await this.getClient().send(
      new DeleteObjectCommand({
        Bucket: this.bucket(),
        Key: fileId,
      }),
    );
  }

  private getClient(): S3Client {
    if (!this.client) {
      const endpoint = this.config.get<string>('storage.s3.endpoint');
      this.client = new S3Client({
        region: this.config.get<string>('storage.s3.region') ?? 'us-east-1',
        endpoint: endpoint || undefined,
        forcePathStyle: this.config.get<boolean>('storage.s3.forcePathStyle') ?? false,
        credentials: {
          accessKeyId: this.config.get<string>('storage.s3.accessKeyId') ?? '',
          secretAccessKey: this.config.get<string>('storage.s3.secretAccessKey') ?? '',
        },
      });
    }
    return this.client;
  }

  private bucket(): string {
    return this.config.get<string>('storage.s3.bucket') ?? '';
  }

  private objectKey(folderPath: string, fileName: string): string {
    const prefix = folderPath.replace(/\/+$/, '');
    return `${prefix}/${fileName}`;
  }
}
