import { registerAs } from '@nestjs/config';

export default registerAs('paymentsEncryption', () => ({
  key: process.env.PAYMENTS_ENCRYPTION_KEY ?? '',
}));
