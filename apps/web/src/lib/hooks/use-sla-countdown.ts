'use client';

import { useEffect, useState } from 'react';
import { formatSlaRemaining } from '@web/lib/maintenance-styles';

export function useSlaCountdown(slaDueAt: string | null): string {
  const [label, setLabel] = useState(() => formatSlaRemaining(slaDueAt));

  useEffect(() => {
    setLabel(formatSlaRemaining(slaDueAt));
    const id = setInterval(() => setLabel(formatSlaRemaining(slaDueAt)), 60_000);
    return () => clearInterval(id);
  }, [slaDueAt]);

  return label;
}
