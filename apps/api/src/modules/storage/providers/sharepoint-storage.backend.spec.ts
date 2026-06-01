import { ConfigService } from '@nestjs/config';
import { DocumentStorageProvider } from '@estateops/shared';
import { SharePointGraphClient } from './sharepoint-graph.client';
import { SharePointStorageBackend } from './sharepoint-storage.backend';

describe('SharePointStorageBackend', () => {
  const graph = {
    driveRoot: jest.fn().mockReturnValue('/sites/site-1/drive'),
    request: jest.fn(),
    uploadBinary: jest.fn(),
  } as unknown as SharePointGraphClient;

  const config = {
    get: jest.fn((key: string) => {
      if (key === 'storage.downloadUrlTtlSeconds') return 3600;
      return undefined;
    }),
  } as unknown as ConfigService;

  let backend: SharePointStorageBackend;

  beforeEach(() => {
    jest.clearAllMocks();
    backend = new SharePointStorageBackend(graph, config);
  });

  it('createUploadSession returns Graph upload URL', async () => {
    (graph.request as jest.Mock).mockResolvedValue({
      uploadUrl: 'https://upload.example/session',
      expirationDateTime: '2026-12-31T00:00:00Z',
    });

    const session = await backend.createUploadSession(
      'org-1/Properties/p-1/Leases',
      'lease.pdf',
      'application/pdf',
    );

    expect(session.provider).toBe(DocumentStorageProvider.SHAREPOINT);
    expect(session.uploadUrl).toContain('https://upload.example');
    expect(graph.request).toHaveBeenCalled();
  });

  it('getSignedDownloadUrl creates organization sharing link', async () => {
    (graph.request as jest.Mock).mockResolvedValue({
      link: { webUrl: 'https://share.example/download' },
    });

    const result = await backend.getSignedDownloadUrl('item-99');
    expect(result.downloadUrl).toBe('https://share.example/download');
    expect(result.expiresAt).toBeDefined();
  });
});
