import { serverApi } from '@web/lib/api/endpoints-server';
import { VendorsPageClient } from './vendors-client';

export default async function VendorsPage() {
  let initialVendors: Awaited<ReturnType<typeof serverApi.vendors.list>>['items'] = [];
  let initialTickets: Awaited<
    ReturnType<typeof serverApi.maintenance.tickets.list>
  >['items'] = [];
  let serverError: string | null = null;

  try {
    const [vendors, tickets] = await Promise.all([
      serverApi.vendors.list({ limit: '100' }),
      serverApi.maintenance.tickets.list({ limit: '100' }),
    ]);
    initialVendors = vendors.items;
    initialTickets = tickets.items;
  } catch (e) {
    serverError = e instanceof Error ? e.message : 'Failed to load vendors';
  }

  return (
    <VendorsPageClient
      initialVendors={initialVendors}
      initialTickets={initialTickets}
      serverError={serverError}
    />
  );
}
