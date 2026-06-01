'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUserRole, isOrgAdminRole } from '@web/lib/auth/decode-token';

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    setMounted(true);
    const role = getCurrentUserRole();
    const isAdmin = isOrgAdminRole(role);
    setAllowed(isAdmin);
    if (!isAdmin) {
      router.replace('/properties');
    }
  }, [router]);

  if (!mounted || !allowed) {
    return (
      <p className="text-sm text-muted-foreground">Checking access…</p>
    );
  }

  return <>{children}</>;
}
