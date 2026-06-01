import { ConfigService } from '@nestjs/config';
import { SharePointGraphClient } from './sharepoint-graph.client';

describe('SharePointGraphClient', () => {
  const config = {
    get: jest.fn((key: string) => {
      const map: Record<string, string> = {
        'storage.sharepoint.tenantId': 'tenant-1',
        'storage.sharepoint.clientId': 'client-1',
        'storage.sharepoint.clientSecret': 'secret-1',
        'storage.sharepoint.siteId': 'site-1',
        'storage.sharepoint.driveId': '',
      };
      return map[key];
    }),
  } as unknown as ConfigService;

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  it('obtains token and performs Graph GET with retry on 429', async () => {
    const fetchMock = global.fetch as jest.Mock;
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'token-abc', expires_in: 3600 }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: { get: (name: string) => (name === 'Retry-After' ? '0' : null) },
        text: async () => JSON.stringify({ error: 'throttled' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: () => null },
        text: async () => JSON.stringify({ id: 'item-1', name: 'file.pdf' }),
      });

    const client = new SharePointGraphClient(config);
    const result = await client.request<{ id: string; name: string }>(
      'GET',
      '/sites/site-1/drive/items/item-1',
    );

    expect(result.id).toBe('item-1');
    expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(3);
  });
});
