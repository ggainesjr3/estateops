import './test-processor-setup';
import { WebhookProcessor } from './webhook.processor';
describe('WebhookProcessor', () => {
  it('delivers webhook payload', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 });
    const processor = new WebhookProcessor(
      { recordFailure: jest.fn() } as never,
      { recordCompleted: jest.fn(), recordFailed: jest.fn() } as never,
    );

    const result = await processor.process({
      id: '1',
      name: 'deliver',
      data: {
        url: 'https://example.com/hook',
        body: { ok: true },
        idempotencyKey: 'idem-1',
      },
    } as never);

    expect(result.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://example.com/hook',
      expect.objectContaining({ method: 'POST' }),
    );
  });
});
