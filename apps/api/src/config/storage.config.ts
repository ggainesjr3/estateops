import { registerAs } from '@nestjs/config';

export type StorageProviderType = 'sharepoint' | 's3';

export default registerAs('storage', () => ({
  provider: (process.env.STORAGE_PROVIDER ?? 'sharepoint') as StorageProviderType,
  sharepoint: {
    tenantId: process.env.SHAREPOINT_TENANT_ID ?? '',
    clientId: process.env.SHAREPOINT_CLIENT_ID ?? '',
    clientSecret: process.env.SHAREPOINT_CLIENT_SECRET ?? '',
    siteId: process.env.SHAREPOINT_SITE_ID ?? '',
    driveId: process.env.SHAREPOINT_DRIVE_ID ?? '',
  },
  s3: {
    region: process.env.S3_REGION ?? 'us-east-1',
    bucket: process.env.S3_BUCKET ?? '',
    accessKeyId: process.env.S3_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? '',
    endpoint: process.env.S3_ENDPOINT ?? undefined,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
  },
  downloadUrlTtlSeconds: parseInt(process.env.STORAGE_DOWNLOAD_URL_TTL_SECONDS ?? '3600', 10),
  uploadUrlTtlSeconds: parseInt(process.env.STORAGE_UPLOAD_URL_TTL_SECONDS ?? '3600', 10),
}));
