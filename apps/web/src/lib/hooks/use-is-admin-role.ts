'use client';

import { useUiStore } from '@web/stores/ui-store';

const ADMIN_ROLES = new Set(['org_admin', 'accountant']);

export function useIsAdminRole(): boolean {
  const token = useUiStore((s) => s.accessToken);
  if (!token) {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('estateops_token');
      if (stored) return parseRole(stored);
    }
    return false;
  }
  return parseRole(token);
}

function parseRole(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1] ?? '')) as { role?: string };
    return payload.role ? ADMIN_ROLES.has(payload.role) : false;
  } catch {
    return false;
  }
}
