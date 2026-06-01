jest.mock('./repositories/document.repository', () => ({
  DocumentRepository: class DocumentRepository {},
}));
jest.mock('../storage/storage.service', () => ({
  StorageService: class StorageService {},
}));
jest.mock('../audit-logs/audit-log.service', () => ({
  AuditLogService: class AuditLogService {},
}));

import { DocumentEntityType, DocumentStorageProvider } from '@estateops/shared';
import { DocumentsService } from './documents.service';
import { StorageService } from '../storage/storage.service';
import { DocumentRepository } from './repositories/document.repository';
import { AuditLogService } from '../audit-logs/audit-log.service';

jest.mock('../../tenant/tenant.context', () => ({
  TenantContext: {
    getOrgId: () => 'org-1',
    getUserId: () => 'user-1',
  },
}));

describe('DocumentsService', () => {
  it('createUploadUrl returns session and logs audit', async () => {
    const storage = {
      createUploadSession: jest.fn().mockResolvedValue({
        uploadUrl: 'https://upload.test',
        expiresAt: '2026-01-01T00:00:00Z',
        provider: DocumentStorageProvider.SHAREPOINT,
        folderPath: 'org-1/Meetings',
        fileName: 'notes.pdf',
      }),
      activeProvider: 'sharepoint',
    } as unknown as StorageService;

    const auditLog = { log: jest.fn().mockResolvedValue(undefined) } as unknown as AuditLogService;
    const service = new DocumentsService({} as DocumentRepository, storage, auditLog);

    const result = await service.createUploadUrl({
      entityType: DocumentEntityType.MEETING,
      entityId: 'meeting-1',
      fileName: 'notes.pdf',
      mimeType: 'application/pdf',
    });

    expect(result.uploadUrl).toBe('https://upload.test');
    expect(auditLog.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'document.upload_url_created' }),
    );
  });
});
