'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@web/lib/utils';

const links = [
  { href: '/admin/overview', label: 'Overview' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/audit-logs', label: 'Audit logs' },
  { href: '/admin/queues', label: 'Queues' },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-1 border-b pb-3">
      {links.map(({ href, label }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              active
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
