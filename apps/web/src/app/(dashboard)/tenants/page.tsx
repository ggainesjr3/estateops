import { enrichTenants, serverApi } from '@web/lib/api/endpoints-server';
import { TenantsPageClient } from './tenants-client';

export default async function TenantsPage() {
  let initialData: Awaited<ReturnType<typeof enrichTenants>> = [];
  let error: string | null = null;

  try {
    const page = await serverApi.tenants.list({ limit: '50' });
    initialData = await enrichTenants(page.items);
  } catch (e) {
    error = e instanceof Error ? e.message : 'Failed to load tenants';
  }

  return <TenantsPageClient initialData={initialData} serverError={error} />;
}
