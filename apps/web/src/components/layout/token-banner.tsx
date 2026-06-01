'use client';

import { useEffect } from 'react';
import { Button } from '@web/components/ui/button';
import { Input } from '@web/components/ui/input';
import { useUiStore } from '@web/stores/ui-store';

export function TokenBanner() {
  const { accessToken, setAccessToken } = useUiStore();

  useEffect(() => {
    const stored = localStorage.getItem('estateops_token');
    if (stored && !accessToken) {
      setAccessToken(stored);
    }
  }, [accessToken, setAccessToken]);

  if (accessToken) {
    return null;
  }

  return (
    <div className="border-b bg-amber-50 px-4 py-3 text-sm text-amber-950">
      <p className="font-medium">API access token required</p>
      <p className="mt-1 text-amber-800">
        Paste a JWT from the API (must include org_id and sub claims).
      </p>
      <form
        className="mt-3 flex max-w-xl flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const token = String(fd.get('token') ?? '').trim();
          if (token) setAccessToken(token);
        }}
      >
        <Input name="token" placeholder="Bearer token…" className="bg-white" />
        <Button type="submit" size="sm">
          Save token
        </Button>
      </form>
    </div>
  );
}
