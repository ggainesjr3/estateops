import { registerAs } from '@nestjs/config';

export default registerAs('realtime', () => ({
  corsOrigin: process.env.WS_CORS_ORIGIN ?? process.env.CORS_ORIGIN ?? 'http://localhost:3000',
  presenceTtlMs: parseInt(process.env.WS_PRESENCE_TTL_MS ?? '90000', 10),
}));
