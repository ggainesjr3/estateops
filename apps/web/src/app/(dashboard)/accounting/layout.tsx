import { AccountingNav } from '@web/components/accounting/accounting-nav';
import { AccountingErrorBoundary } from '@web/components/accounting/accounting-error-boundary';

export default function AccountingLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="space-y-6">
      <AccountingNav />
      <AccountingErrorBoundary>{children}</AccountingErrorBoundary>
    </div>
  );
}
