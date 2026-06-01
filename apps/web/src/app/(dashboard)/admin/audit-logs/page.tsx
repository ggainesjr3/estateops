import { serverApi } from '@web/lib/api/endpoints-server';
import { AdminAuditLogsClient } from './admin-audit-logs-client';

export default async function AdminAuditLogsPage() {
  let initialData = null;
  let serverError: string | null = null;

  try {
    initialData = await serverApi.admin.auditLogs({ limit: '20' });
  } catch (e) {
    serverError = e instanceof Error ? e.message : 'Failed to load audit logs';
  }

  return <AdminAuditLogsClient initialData={initialData} serverError={serverError} />;
}
