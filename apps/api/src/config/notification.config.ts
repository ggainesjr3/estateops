import { registerAs } from '@nestjs/config';

export default registerAs('notification', () => ({
  vapidPublicKey: process.env.VAPID_PUBLIC_KEY ?? '',
  vapidPrivateKey: process.env.VAPID_PRIVATE_KEY ?? '',
  vapidSubject: process.env.VAPID_SUBJECT ?? 'mailto:noreply@estateops.local',
  expoAccessToken: process.env.EXPO_ACCESS_TOKEN ?? '',
  sendgridWebhookSecret: process.env.SENDGRID_WEBHOOK_VERIFICATION_KEY ?? '',
  twilioWebhookAuthToken: process.env.TWILIO_AUTH_TOKEN ?? '',
  websocketEnabled: process.env.NOTIFICATION_WEBSOCKET_ENABLED === 'true',
}));
