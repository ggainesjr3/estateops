import { serverApi } from '@web/lib/api/endpoints-server';
import { LeasesPageClient } from './leases-client';

export default async function LeasesPage() {
  let initialItems: Awaited<ReturnType<typeof serverApi.leases.list>>['items'] = [];
  let error: string | null = null;

  try {
    const page = await serverApi.leases.list({ limit: '50' });
    initialItems = page.items;
  } catch (e) {
    error = e instanceof Error ? e.message : 'Failed to load leases';
  }

  return <LeasesPageClient initialItems={initialItems} serverError={error} />;
}
