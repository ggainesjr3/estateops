import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentStorageProvider } from '@estateops/shared';
import {
  SignedDownloadResult,
  StorageBackend,
  StoredFileResult,
  UploadSessionResult,
} from '../interfaces/storage-backend.interface';
import { SharePointGraphClient } from './sharepoint-graph.client';

interface DriveItem {
  id: string;
  name: string;
  size: number;
  webUrl: string;
  '@microsoft.graph.downloadUrl'?: string;
}

interface UploadSession {
  uploadUrl: string;
  expirationDateTime: string;
}

interface SharingLink {
  link: { webUrl: string };
}

@Injectable()
export class SharePointStorageBackend implements StorageBackend {
  readonly provider = DocumentStorageProvider.SHAREPOINT;

  constructor(
    private readonly graph: SharePointGraphClient,
    private readonly config: ConfigService,
  ) {}

  async ensureFolder(folderPath: string): Promise<void> {
    const segments = folderPath.split('/').filter(Boolean);
    for (let i = 0; i < segments.length; i++) {
      const parentSegments = segments.slice(0, i);
      const folderName = segments[i]!;
      const childrenUrl =
        parentSegments.length === 0
          ? `${this.graph.driveRoot()}/root/children`
          : `${this.graph.driveRoot()}/root:/${this.buildPath(parentSegments)}:/children`;

      try {
        await this.graph.request<DriveItem>('POST', childrenUrl, {
          body: {
            name: folderName,
            folder: {},
            '@microsoft.graph.conflictBehavior': 'fail',
          },
        });
      } catch (err) {
        const status = (err as { status?: number }).status;
        if (status !== 409) {
          try {
            const existingPath = this.buildPath(segments.slice(0, i + 1));
            await this.graph.request<DriveItem>(
              'GET',
              `${this.graph.driveRoot()}/root:/${existingPath}`,
            );
          } catch {
            throw err;
          }
        }
      }
    }
  }

  private static readonly STREAM_CHUNK_SIZE = 5 * 1024 * 1024;

  async uploadStream(
    folderPath: string,
    fileName: string,
    mimeType: string,
    contentLength: number,
    stream: ReadableStream<Uint8Array>,
  ): Promise<StoredFileResult> {
    await this.ensureFolder(folderPath);
    const path = this.buildPath([...folderPath.split('/').filter(Boolean), fileName]);
    const session = await this.graph.request<UploadSession>(
      'POST',
      `${this.graph.driveRoot()}/root:/${path}:/createUploadSession`,
      {
        body: {
          item: {
            '@microsoft.graph.conflictBehavior': 'replace',
            name: fileName,
          },
        },
      },
    );

    const reader = stream.getReader();
    let uploaded = 0;
    let item: DriveItem | null = null;

    while (uploaded < contentLength) {
      const end = Math.min(uploaded + SharePointStorageBackend.STREAM_CHUNK_SIZE, contentLength) - 1;
      const chunkSize = end - uploaded + 1;
      const chunk = new Uint8Array(chunkSize);
      let offset = 0;
      while (offset < chunkSize) {
        const { done, value } = await reader.read();
        if (done) break;
        const slice = value.subarray(0, chunkSize - offset);
        chunk.set(slice, offset);
        offset += slice.length;
      }
      if (offset === 0) break;

      const rangeEnd = uploaded + offset - 1;
      const response = await fetch(session.uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Length': String(offset),
          'Content-Range': `bytes ${uploaded}-${rangeEnd}/${contentLength}`,
        },
        body: chunk.subarray(0, offset),
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`SharePoint stream upload failed: ${response.status} ${err}`);
      }

      if (response.status === 201 || response.status === 200) {
        item = (await response.json()) as DriveItem;
      }
      uploaded += offset;
    }

    if (!item) {
      const itemPath = `${this.graph.driveRoot()}/root:/${path}`;
      item = await this.graph.request<DriveItem>('GET', itemPath);
    }

    const download = await this.getSignedDownloadUrl(item.id);
    return {
      id: item.id,
      webUrl: item.webUrl,
      downloadUrl: download.downloadUrl,
      size: item.size ?? contentLength,
    };
  }

  async uploadFile(
    folderPath: string,
    fileName: string,
    buffer: Buffer,
    mimeType: string,
  ): Promise<StoredFileResult> {
    await this.ensureFolder(folderPath);
    const itemPath = `${this.graph.driveRoot()}/root:/${this.buildPath([...folderPath.split('/').filter(Boolean), fileName])}:/content`;

    const response = await this.graph.uploadBinary(
      `https://graph.microsoft.com/v1.0${itemPath}`,
      buffer,
      mimeType,
    );

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`SharePoint upload failed: ${response.status} ${err}`);
    }

    const item = (await response.json()) as DriveItem;
    const download = await this.getSignedDownloadUrl(item.id);
    return {
      id: item.id,
      webUrl: item.webUrl,
      downloadUrl: download.downloadUrl,
      size: item.size ?? buffer.length,
    };
  }

  async createUploadSession(
    folderPath: string,
    fileName: string,
    _mimeType: string,
  ): Promise<UploadSessionResult> {
    await this.ensureFolder(folderPath);
    const path = this.buildPath([...folderPath.split('/').filter(Boolean), fileName]);
    const session = await this.graph.request<UploadSession>(
      'POST',
      `${this.graph.driveRoot()}/root:/${path}:/createUploadSession`,
      {
        body: {
          item: {
            '@microsoft.graph.conflictBehavior': 'replace',
            name: fileName,
          },
        },
      },
    );

    return {
      uploadUrl: session.uploadUrl,
      expiresAt: session.expirationDateTime,
      provider: this.provider,
      folderPath,
      fileName,
    };
  }

  async getSignedDownloadUrl(fileId: string): Promise<SignedDownloadResult> {
    const ttl = this.config.get<number>('storage.downloadUrlTtlSeconds') ?? 3600;
    const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();

    const link = await this.graph.request<SharingLink>(
      'POST',
      `${this.graph.driveRoot()}/items/${fileId}/createLink`,
      {
        body: {
          type: 'view',
          scope: 'organization',
          expirationDateTime: expiresAt,
        },
      },
    );

    return {
      downloadUrl: link.link.webUrl,
      expiresAt,
    };
  }

  async deleteFile(fileId: string): Promise<void> {
    await this.graph.request('DELETE', `${this.graph.driveRoot()}/items/${fileId}`);
  }

  private buildPath(segments: string[]): string {
    return segments.map((s) => encodeURIComponent(s)).join('/');
  }
}
