'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  Building2,
  Calculator,
  FileBarChart,
  FileText,
  HardHat,
  LogOut,
  Menu,
  Shield,
  Users,
  Wrench,
  X,
} from 'lucide-react';
import { Button } from '@web/components/ui/button';
import { PwaInstallBanner } from '@web/components/pwa/pwa-install-banner';
import { getCurrentUserRole, isOrgAdminRole } from '@web/lib/auth/decode-token';
import { cn } from '@web/lib/utils';
import { useUiStore } from '@web/stores/ui-store';

const APP_NAME = 'EstateOps';

const nav = [
  { href: '/properties', label: 'Properties', icon: Building2 },
  { href: '/tenants', label: 'Tenants', icon: Users },
  { href: '/leases', label: 'Leases', icon: FileText },
  { href: '/accounting/dashboard', label: 'Accounting', icon: Calculator },
  { href: '/reports', label: 'Reports', icon: FileBarChart },
  { href: '/maintenance', label: 'Maintenance', icon: Wrench },
  { href: '/vendors', label: 'Vendors', icon: HardHat },
];

const adminNavItem = { href: '/admin/overview', label: 'Admin', icon: Shield };

const bottomNav = nav.filter((item) =>
  ['/properties', '/tenants', '/maintenance', '/accounting/dashboard'].includes(item.href),
);

function isNavActive(pathname: string, href: string): boolean {
  if (href.startsWith('/accounting')) return pathname.startsWith('/accounting');
  if (href.startsWith('/admin')) return pathname.startsWith('/admin');
  if (href.startsWith('/reports')) return pathname.startsWith('/reports');
  if (href === '/maintenance') return pathname.startsWith('/maintenance');
  if (href === '/vendors') return pathname.startsWith('/vendors');
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [showAdmin, setShowAdmin] = useState(false);
  const { sidebarOpen, setSidebarOpen, toggleSidebar, setAccessToken } =
    useUiStore();

  useEffect(() => {
    setShowAdmin(isOrgAdminRole(getCurrentUserRole()));
  }, []);

  function handleSignOut() {
    localStorage.removeItem('estateops_token');
    localStorage.removeItem('estateops_refresh_token');
    setAccessToken(null);
    setSidebarOpen(false);
    router.replace('/login');
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b bg-background px-4 py-3 md:hidden">
        <Button variant="ghost" size="icon" onClick={toggleSidebar} aria-label="Open menu">
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
        <span className="font-semibold">{APP_NAME}</span>
        <div className="w-9" aria-hidden />
      </header>

      <PwaInstallBanner />

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-72 max-w-[85vw] flex-col border-r bg-card shadow-lg transition-transform duration-200 md:static md:z-auto md:w-64 md:max-w-none md:translate-x-0 md:shadow-none',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        )}
      >
        <div className="flex h-14 items-center justify-between border-b px-4 font-semibold">
          <span>{APP_NAME}</span>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
          {nav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setSidebarOpen(false)}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                isNavActive(pathname, href)
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          ))}
          {showAdmin && (
            <Link
              href={adminNavItem.href}
              onClick={() => setSidebarOpen(false)}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                isNavActive(pathname, adminNavItem.href)
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <Shield className="h-4 w-4 shrink-0" />
              {adminNavItem.label}
            </Link>
          )}
        </nav>
        <div className="border-t p-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </aside>

      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          aria-label="Close menu"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <main className="flex-1 overflow-x-hidden p-4 pb-20 sm:p-6 md:pb-6 lg:p-8">
        {children}
      </main>

      <nav
        className="fixed bottom-0 left-0 right-0 z-20 border-t bg-background md:hidden"
        aria-label="Primary navigation"
      >
        <div className="mx-auto flex max-w-lg items-stretch justify-around">
          {bottomNav.map(({ href, label, icon: Icon }) => {
            const active = isNavActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex min-w-0 flex-1 flex-col items-center gap-0.5 px-1 py-2 text-[10px] font-medium transition-colors',
                  active ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="truncate">{label.split(' ')[0]}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
