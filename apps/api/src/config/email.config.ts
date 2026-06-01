import { registerAs } from '@nestjs/config';

export default registerAs('email', () => ({
  sendgridApiKey: process.env.SENDGRID_API_KEY ?? '',
  sesRegion: process.env.AWS_SES_REGION ?? 'us-east-1',
  fromAddress: process.env.EMAIL_FROM_ADDRESS ?? 'noreply@estateops.local',
}));
