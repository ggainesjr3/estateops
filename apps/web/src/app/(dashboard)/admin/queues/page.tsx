import { serverApi } from '@web/lib/api/endpoints-server';
import { AdminQueuesClient } from './admin-queues-client';

export default async function AdminQueuesPage() {
  let initialQueues = null;
  let serverError: string | null = null;

  try {
    initialQueues = await serverApi.admin.queues();
  } catch (e) {
    serverError = e instanceof Error ? e.message : 'Failed to load queues';
  }

  return <AdminQueuesClient initialQueues={initialQueues} serverError={serverError} />;
}
