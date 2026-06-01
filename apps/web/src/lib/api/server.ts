import { cookies } from 'next/headers';
import { getApiBaseUrl } from './config';
import type { ApiError } from './errors';

export async function getServerAccessToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return (
    cookieStore.get('estateops_token')?.value ??
    process.env.ESTATEOPS_ACCESS_TOKEN ??
    process.env.NEXT_PUBLIC_ESTATEOPS_ACCESS_TOKEN
  );
}

export async function serverFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const token = await getServerAccessToken();
  if (!token) {
    throw new Error(
      'Missing API token. Set estateops_token cookie or ESTATEOPS_ACCESS_TOKEN.',
    );
  }

  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...init?.headers,
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as ApiError;
    throw new Error(body.message ?? `API error ${res.status}`);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}
