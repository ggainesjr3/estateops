import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GraphApiError, GraphResponse, withGraphRetry } from '../utils/graph-retry.util';

interface TokenResponse {
  access_token: string;
  expires_in: number;
}

@Injectable()
export class SharePointGraphClient {
  private readonly logger = new Logger(SharePointGraphClient.name);
  private accessToken: string | null = null;
  private tokenExpiresAt = 0;

  constructor(private readonly config: ConfigService) {}

  async request<T>(
    method: string,
    path: string,
    options?: { body?: unknown; headers?: Record<string, string> },
  ): Promise<T> {
    return withGraphRetry(
      `${method} ${path}`,
      () => this.rawRequest<T>(method, path, options),
      this.logger,
    );
  }

  private async rawRequest<T>(
    method: string,
    path: string,
    options?: { body?: unknown; headers?: Record<string, string> },
  ): Promise<GraphResponse<T>> {
    const token = await this.getAccessToken();
    const url = path.startsWith('http')
      ? path
      : `https://graph.microsoft.com/v1.0${path}`;

    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(options?.headers ?? {}),
      },
      body: options?.body !== undefined ? JSON.stringify(options.body) : undefined,
    });

    const text = await response.text();
    let data: T;
    try {
      data = text ? (JSON.parse(text) as T) : ({} as T);
    } catch {
      data = { raw: text } as T;
    }

    return {
      ok: response.ok,
      status: response.status,
      data,
      headers: response.headers,
    };
  }

  async uploadBinary(url: string, buffer: Buffer, mimeType: string): Promise<Response> {
    const token = await this.getAccessToken();
    return fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': mimeType,
      },
      body: buffer,
    });
  }

  driveRoot(): string {
    const siteId = this.config.get<string>('storage.sharepoint.siteId');
    const driveId = this.config.get<string>('storage.sharepoint.driveId');
    if (driveId) {
      return `/drives/${driveId}`;
    }
    return `/sites/${siteId}/drive`;
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt - 60_000) {
      return this.accessToken;
    }

    const tenantId = this.config.get<string>('storage.sharepoint.tenantId');
    const clientId = this.config.get<string>('storage.sharepoint.clientId');
    const clientSecret = this.config.get<string>('storage.sharepoint.clientSecret');

    const body = new URLSearchParams({
      client_id: clientId ?? '',
      client_secret: clientSecret ?? '',
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials',
    });

    const response = await fetch(
      `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      },
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new GraphApiError('Failed to obtain Graph access token', response.status, errText);
    }

    const json = (await response.json()) as TokenResponse;
    this.accessToken = json.access_token;
    this.tokenExpiresAt = Date.now() + json.expires_in * 1000;
    return this.accessToken;
  }
}
