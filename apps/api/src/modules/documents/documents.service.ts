import { Injectable, NotFoundException } from '@nestjs/common';
import { DocumentEntityType, DocumentStorageProvider } from '@estateops/shared';
import { AuditLogService } from '../audit-logs/audit-log.service';
import { TenantContext } from '../../tenant/tenant.context';
import { StorageService } from '../storage/storage.service';
import {
  CreateUploadUrlDto,
  DocumentResponseDto,
  DownloadUrlResponseDto,
  RegisterDocumentDto,
  UploadUrlResponseDto,
} from './dto/document.dto';
import { toDocumentResponseDto } from './mappers/document.mapper';
import { DocumentRepository } from './repositories/document.repository';
import { resolveDocumentFolderPath } from './utils/document-folder.util';

@Injectable()
export class DocumentsService {
  constructor(
    private readonly documentRepository: DocumentRepository,
    private readonly storageService: StorageService,
    private readonly auditLog: AuditLogService,
  ) {}

  async createUploadUrl(dto: CreateUploadUrlDto): Promise<UploadUrlResponseDto> {
    const orgId = TenantContext.getOrgId();
    const folderPath = resolveDocumentFolderPath(orgId, dto.entityType, {
      propertyId: dto.propertyId,
      tenantId: dto.tenantId,
    });

    const session = await this.storageService.createUploadSession(
      folderPath,
      dto.fileName,
      dto.mimeType,
    );

    await this.auditLog.log({
      action: 'document.upload_url_created',
      entityType: 'document',
      entityId: dto.entityId,
      newValue: {
        entityType: dto.entityType,
        fileName: dto.fileName,
        folderPath,
        provider: session.provider,
      },
    });

    return {
      uploadUrl: session.uploadUrl,
      expiresAt: session.expiresAt,
      provider: session.provider,
      folderPath: session.folderPath,
      fileName: session.fileName,
    };
  }

  async register(dto: RegisterDocumentDto): Promise<DocumentResponseDto> {
    const orgId = TenantContext.getOrgId();
    const folderPath = resolveDocumentFolderPath(orgId, dto.entityType, {
      propertyId: dto.propertyId,
      tenantId: dto.tenantId,
    });

    const storageProvider =
      this.storageService.activeProvider === 's3'
        ? DocumentStorageProvider.S3
        : DocumentStorageProvider.SHAREPOINT;

    const doc = await this.documentRepository.create({
      entityType: dto.entityType,
      entityId: dto.entityId,
      fileName: dto.fileName,
      fileSize: String(dto.fileSize),
      mimeType: dto.mimeType,
      folderPath,
      sharepointItemId: dto.storageItemId,
      sharepointWebUrl: dto.webUrl ?? null,
      storageProvider,
      uploadedBy: TenantContext.getUserId(),
    });

    await this.auditLog.log({
      action: 'document.registered',
      entityType: 'document',
      entityId: doc.id,
      newValue: {
        entityType: dto.entityType,
        linkedEntityId: dto.entityId,
        fileName: dto.fileName,
        storageItemId: dto.storageItemId,
        storageProvider,
      },
    });

    return toDocumentResponseDto(doc);
  }

  async getDownloadUrl(id: string): Promise<DownloadUrlResponseDto> {
    const doc = await this.documentRepository.findActiveById(id);
    if (!doc?.sharepointItemId) {
      throw new NotFoundException('Document not found');
    }

    const signed = await this.storageService.getSignedDownloadUrl(doc.sharepointItemId);

    await this.auditLog.log({
      action: 'document.download_url_issued',
      entityType: 'document',
      entityId: doc.id,
      newValue: { expiresAt: signed.expiresAt },
    });

    return {
      downloadUrl: signed.downloadUrl,
      expiresAt: signed.expiresAt,
    };
  }

  async remove(id: string): Promise<void> {
    const doc = await this.documentRepository.findActiveById(id);
    if (!doc) {
      throw new NotFoundException('Document not found');
    }

    await this.documentRepository.softDeleteDocument(id);

    await this.auditLog.log({
      action: 'document.deleted',
      entityType: 'document',
      entityId: doc.id,
      oldValue: {
        fileName: doc.fileName,
        entityType: doc.entityType,
        linkedEntityId: doc.entityId,
      },
    });
  }

  async listByEntity(
    entityType: DocumentEntityType,
    entityId: string,
  ): Promise<DocumentResponseDto[]> {
    const docs = await this.documentRepository.findByEntity(entityType, entityId);
    return docs.map(toDocumentResponseDto);
  }
}
