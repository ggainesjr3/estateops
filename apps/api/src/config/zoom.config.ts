import { registerAs } from '@nestjs/config';

export default registerAs('zoom', () => ({
  clientId: process.env.ZOOM_CLIENT_ID ?? '',
  clientSecret: process.env.ZOOM_CLIENT_SECRET ?? '',
  accountId: process.env.ZOOM_ACCOUNT_ID ?? '',
  webhookSecret: process.env.ZOOM_WEBHOOK_SECRET ?? '',
  defaultOrgId: process.env.ZOOM_DEFAULT_ORG_ID ?? '',
  /** JSON map of Zoom account_id -> estateops org UUID */
  accountOrgMapJson: process.env.ZOOM_ACCOUNT_ORG_MAP ?? '{}',
}));
