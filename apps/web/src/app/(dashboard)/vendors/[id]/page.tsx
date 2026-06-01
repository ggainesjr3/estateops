import { serverApi } from '@web/lib/api/endpoints-server';
import { VendorDetailClient } from './vendor-detail-client';

export default async function VendorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let vendor: Awaited<ReturnType<typeof serverApi.vendors.get>> | null = null;
  let tickets: Awaited<ReturnType<typeof serverApi.vendors.tickets>>['items'] = [];
  let propertyNames: Record<string, string> = {};
  let serverError: string | null = null;

  try {
    const [v, t, props] = await Promise.all([
      serverApi.vendors.get(id),
      serverApi.vendors.tickets(id, { limit: '100' }),
      serverApi.properties.list({ limit: '100' }),
    ]);
    vendor = v;
    tickets = t.items;
    propertyNames = Object.fromEntries(props.items.map((p) => [p.id, p.name]));
  } catch (e) {
    serverError = e instanceof Error ? e.message : 'Failed to load vendor';
  }

  return (
    <VendorDetailClient
      vendorId={id}
      initialVendor={vendor}
      initialTickets={tickets}
      propertyNames={propertyNames}
      serverError={serverError}
    />
  );
}
