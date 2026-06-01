import { getApiBaseUrl } from './config';

export async function downloadAuthenticatedCsv(
  path: string,
  filename: string,
): Promise<void> {
  const token =
    typeof window !== 'undefined'
      ? localStorage.getItem('estateops_token')
      : null;
  if (!token) {
    throw new Error('Sign in required to export.');
  }

  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Export failed (${res.status})`);
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
