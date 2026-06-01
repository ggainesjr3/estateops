'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@web/lib/utils';

const links = [
  { href: '/accounting/dashboard', label: 'Dashboard' },
  { href: '/accounting/invoices', label: 'Invoices' },
  { href: '/accounting/ledger', label: 'Ledger' },
  { href: '/accounting/trial-balance', label: 'Trial balance' },
  { href: '/accounting/rent-roll', label: 'Rent roll' },
];

export function AccountingNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-1 border-b pb-3">
      {links.map(({ href, label }) => {
        const active =
          pathname === href ||
          (href === '/accounting/invoices' && pathname.startsWith('/accounting/invoices'));
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
