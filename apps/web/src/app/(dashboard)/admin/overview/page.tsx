import { serverApi } from '@web/lib/api/endpoints-server';
import { AdminOverviewClient } from './admin-overview-client';

export default async function AdminOverviewPage() {
  let initialStats = null;
  let initialHealth = null;
  let initialAuditLogs = null;
  let serverError: string | null = null;

  try {
    const [stats, health, auditPage] = await Promise.all([
      serverApi.admin.stats(),
      serverApi.admin.systemHealth(),
      serverApi.admin.auditLogs({ limit: '10' }),
    ]);
    initialStats = stats;
    initialHealth = health;
    initialAuditLogs = auditPage.items;
  } catch (e) {
    serverError = e instanceof Error ? e.message : 'Failed to load admin overview';
  }

  return (
    <AdminOverviewClient
      initialStats={initialStats}
      initialHealth={initialHealth}
      initialAuditLogs={initialAuditLogs}
      serverError={serverError}
    />
  );
}
