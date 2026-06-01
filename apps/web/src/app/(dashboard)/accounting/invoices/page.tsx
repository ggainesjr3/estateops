import { serverApi } from '@web/lib/api/endpoints-server';
import { InvoicesPageClient } from './invoices-client';

export default async function InvoicesPage() {
  let initial = null;
  let properties: Awaited<ReturnType<typeof serverApi.properties.list>>['items'] = [];
  let serverError: string | null = null;
  try {
    const [inv, props] = await Promise.all([
      serverApi.accounting.invoices.list({ limit: '25' }),
      serverApi.properties.list({ limit: '100' }),
    ]);
    initial = inv;
    properties = props.items;
  } catch (e) {
    serverError = e instanceof Error ? e.message : 'Failed to load invoices';
  }

  return (
    <InvoicesPageClient
      initialData={initial}
      properties={properties}
      serverError={serverError}
    />
  );
}
