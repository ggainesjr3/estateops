import { DocumentStorageProvider } from '@estateops/shared';

export interface StoredFileResult {
  id: string;
  webUrl: string;
  downloadUrl: string;
  size: number;
}

export interface UploadSessionResult {
  uploadUrl: string;
  expiresAt: string;
  provider: DocumentStorageProvider;
  folderPath: string;
  fileName: string;
}

export interface SignedDownloadResult {
  downloadUrl: string;
  expiresAt: string;
}

export interface StorageBackend {
  readonly provider: DocumentStorageProvider;

  ensureFolder(folderPath: string): Promise<void>;

  uploadFile(
    folderPath: string,
    fileName: string,
    buffer: Buffer,
    mimeType: string,
  ): Promise<StoredFileResult>;

  /** Chunked upload for large files (e.g. Zoom recordings) without full-memory buffering. */
  uploadStream(
    folderPath: string,
    fileName: string,
    mimeType: string,
    contentLength: number,
    stream: ReadableStream<Uint8Array>,
  ): Promise<StoredFileResult>;

  createUploadSession(
    folderPath: string,
    fileName: string,
    mimeType: string,
  ): Promise<UploadSessionResult>;

  getSignedDownloadUrl(fileId: string): Promise<SignedDownloadResult>;

  deleteFile(fileId: string): Promise<void>;
}
