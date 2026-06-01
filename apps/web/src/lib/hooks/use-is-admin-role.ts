'use client';

import { useEffect, useState } from 'react';
import { useUiStore } from '@web/stores/ui-store';

const ADMIN_ROLES = new Set(['org_admin', 'accountant']);

function parseRole(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1] ?? '')) as { role?: string };
    return payload.role ? ADMIN_ROLES.has(payload.role) : false;
  } catch {
    return false;
  }
}

export function useIsAdminRole(): boolean {
  const accessToken = useUiStore((s) => s.accessToken);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const token =
      accessToken ??
      (typeof window !== 'undefined' ? localStorage.getItem('estateops_token') : null);
    setIsAdmin(token ? parseRole(token) : false);
  }, [accessToken]);

  return isAdmin;
}
