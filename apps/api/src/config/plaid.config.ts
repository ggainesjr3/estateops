import { registerAs } from '@nestjs/config';

export default registerAs('plaid', () => ({
  clientId: process.env.PLAID_CLIENT_ID ?? '',
  secret: process.env.PLAID_SECRET ?? '',
  env: process.env.PLAID_ENV ?? 'sandbox',
}));
