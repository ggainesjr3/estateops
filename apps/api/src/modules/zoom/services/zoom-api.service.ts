import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { withZoomRetry } from '../utils/zoom-retry.util';

interface ZoomTokenResponse {
  access_token: string;
  expires_in: number;
}

@Injectable()
export class ZoomApiService {
  private readonly logger = new Logger(ZoomApiService.name);
  private accessToken: string | null = null;
  private tokenExpiresAt = 0;

  constructor(private readonly config: ConfigService) {}

  async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt - 60_000) {
      return this.accessToken;
    }

    const clientId = this.config.get<string>('zoom.clientId');
    const clientSecret = this.config.get<string>('zoom.clientSecret');
    const accountId = this.config.get<string>('zoom.accountId');

    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const body = new URLSearchParams({
      grant_type: 'account_credentials',
      account_id: accountId ?? '',
    });

    const json = await withZoomRetry('oauth', async () => {
      const response = await fetch('https://zoom.us/oauth/token', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${basic}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });
      if (!response.ok) {
        const err = new Error(`Zoom OAuth failed: ${response.status}`);
        (err as { status?: number }).status = response.status;
        throw err;
      }
      return (await response.json()) as ZoomTokenResponse;
    });

    this.accessToken = json.access_token;
    this.tokenExpiresAt = Date.now() + json.expires_in * 1000;
    this.logger.debug('Zoom access token refreshed');
    return this.accessToken;
  }

  async downloadAsStream(
    downloadUrl: string,
  ): Promise<{ stream: ReadableStream<Uint8Array>; contentLength: number; mimeType: string }> {
    const token = await this.getAccessToken();

    return withZoomRetry('download', async () => {
      const response = await fetch(downloadUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const err = new Error(`Zoom download failed: ${response.status}`);
        (err as { status?: number }).status = response.status;
        throw err;
      }
      if (!response.body) {
        throw new Error('Zoom download returned empty body');
      }
      const contentLength = parseInt(response.headers.get('content-length') ?? '0', 10);
      const mimeType = response.headers.get('content-type') ?? 'application/octet-stream';
      return {
        stream: response.body,
        contentLength: contentLength > 0 ? contentLength : 0,
        mimeType,
      };
    });
  }

  async downloadAsText(downloadUrl: string): Promise<string> {
    const token = await this.getAccessToken();
    return withZoomRetry('downloadText', async () => {
      const response = await fetch(downloadUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const err = new Error(`Zoom download failed: ${response.status}`);
        (err as { status?: number }).status = response.status;
        throw err;
      }
      return response.text();
    });
  }
}
