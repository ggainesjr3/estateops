import { AdminGuard } from '@web/components/admin/admin-guard';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return <AdminGuard>{children}</AdminGuard>;
}
