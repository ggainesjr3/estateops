export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('estateops_token');
}

export function getCurrentUserRole(): string | null {
  const token = getAccessToken();
  if (!token) return null;

  try {
    const payload = JSON.parse(atob(token.split('.')[1] ?? '')) as { role?: string };
    return payload.role ?? null;
  } catch {
    return null;
  }
}

export function isOrgAdminRole(role: string | null): boolean {
  return role === 'org_admin' || role === 'super_admin';
}
