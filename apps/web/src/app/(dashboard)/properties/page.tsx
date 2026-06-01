import { PropertiesPageClient } from './properties-client';
import { enrichProperties, serverApi } from '@web/lib/api/endpoints-server';

export default async function PropertiesPage() {
  let initialData: Awaited<ReturnType<typeof enrichProperties>> = [];
  let error: string | null = null;

  try {
    const page = await serverApi.properties.list({ limit: '50' });
    initialData = await enrichProperties(page.items);
  } catch (e) {
    error = e instanceof Error ? e.message : 'Failed to load properties';
  }

  return <PropertiesPageClient initialData={initialData} serverError={error} />;
}
