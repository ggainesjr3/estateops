import { createHmac } from 'crypto';
import {
  verifyZoomWebhookSignature,
  zoomUrlValidationResponse,
} from './zoom-webhook.util';

describe('zoom-webhook.util', () => {
  const secret = 'test-secret';
  const timestamp = '1700000000';
  const body = '{"event":"recording.completed"}';

  it('verifies valid v0 signature', () => {
    const message = `v0:${timestamp}:${body}`;
    const hash = createHmac('sha256', secret).update(message).digest('hex');
    expect(verifyZoomWebhookSignature(secret, timestamp, body, `v0=${hash}`)).toBe(true);
  });

  it('rejects invalid signature', () => {
    expect(verifyZoomWebhookSignature(secret, timestamp, body, 'v0=deadbeef')).toBe(false);
  });

  it('returns encrypted token for URL validation', () => {
    const result = zoomUrlValidationResponse(secret, 'plain-token');
    expect(result.plainToken).toBe('plain-token');
    expect(result.encryptedToken).toHaveLength(64);
  });
});
