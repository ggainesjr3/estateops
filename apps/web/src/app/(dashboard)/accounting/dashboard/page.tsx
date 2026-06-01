import { serverApi } from '@web/lib/api/endpoints-server';
import { AccountingDashboardClient } from './dashboard-client';

export default async function AccountingDashboardPage() {
  let initial = null;
  let serverError: string | null = null;
  try {
    initial = await serverApi.accounting.dashboard();
  } catch (e) {
    serverError = e instanceof Error ? e.message : 'Failed to load dashboard';
  }

  return (
    <AccountingDashboardClient initialData={initial} serverError={serverError} />
  );
}
