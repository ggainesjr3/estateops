'use client';

import { getApiBaseUrl } from './config';
import type { ApiError } from './errors';

export type ClientFetchOptions = RequestInit & {
  token?: string | null;
};

export async function clientFetch<T>(
  path: string,
  options: ClientFetchOptions = {},
): Promise<T> {
  const { token, ...init } = options;
  const authToken =
    token ??
    (typeof window !== 'undefined'
      ? localStorage.getItem('estateops_token')
      : null);

  if (!authToken) {
    throw new Error('Sign in required. Set access token in settings or localStorage.');
  }

  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
      ...init.headers,
    },
  });

  if (res.status === 401 && typeof window !== 'undefined') {
    localStorage.removeItem('estateops_token');
    localStorage.removeItem('estateops_refresh_token');
    window.location.href = '/login';
    throw new Error('Session expired. Please sign in again.');
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as ApiError;
    throw new Error(
      Array.isArray(body.message)
        ? body.message.join(', ')
        : (body.message ?? `Request failed (${res.status})`),
    );
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}
