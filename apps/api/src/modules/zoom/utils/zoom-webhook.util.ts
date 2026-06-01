import { createHmac, timingSafeEqual } from 'crypto';

export function verifyZoomWebhookSignature(
  secret: string,
  timestamp: string,
  rawBody: string,
  signatureHeader: string,
): boolean {
  if (!secret || !timestamp || !signatureHeader) return false;

  const message = `v0:${timestamp}:${rawBody}`;
  const expected = createHmac('sha256', secret).update(message).digest('hex');
  const received = signatureHeader.startsWith('v0=')
    ? signatureHeader.slice(3)
    : signatureHeader;

  try {
    const a = Buffer.from(expected, 'hex');
    const b = Buffer.from(received, 'hex');
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return expected === received;
  }
}

export function zoomUrlValidationResponse(
  secret: string,
  plainToken: string,
): { plainToken: string; encryptedToken: string } {
  const encryptedToken = createHmac('sha256', secret).update(plainToken).digest('hex');
  return { plainToken, encryptedToken };
}
