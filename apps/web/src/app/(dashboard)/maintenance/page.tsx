import { serverApi } from '@web/lib/api/endpoints-server';
import { MaintenancePageClient } from './maintenance-client';

export default async function MaintenancePage() {
  let initialTickets: Awaited<ReturnType<typeof serverApi.maintenance.tickets.list>>['items'] =
    [];
  let initialProperties: Awaited<
    ReturnType<typeof serverApi.properties.list>
  >['items'] = [];
  let serverError: string | null = null;

  try {
    const [tickets, properties] = await Promise.all([
      serverApi.maintenance.tickets.list({ limit: '100' }),
      serverApi.properties.list({ limit: '100' }),
    ]);
    initialTickets = tickets.items;
    initialProperties = properties.items;
  } catch (e) {
    serverError = e instanceof Error ? e.message : 'Failed to load maintenance';
  }

  return (
    <MaintenancePageClient
      initialTickets={initialTickets}
      initialProperties={initialProperties}
      serverError={serverError}
    />
  );
}
