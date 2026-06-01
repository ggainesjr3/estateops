import { DocumentResponseDto } from '../dto/document.dto';
import { Document } from '../entities/document.entity';

export function toDocumentResponseDto(doc: Document): DocumentResponseDto {
  return {
    id: doc.id,
    entityType: doc.entityType,
    entityId: doc.entityId,
    fileName: doc.fileName,
    fileSize: doc.fileSize,
    mimeType: doc.mimeType,
    folderPath: doc.folderPath,
    sharepointItemId: doc.sharepointItemId,
    sharepointWebUrl: doc.sharepointWebUrl,
    storageProvider: doc.storageProvider,
    createdAt: doc.createdAt.toISOString(),
  };
}
