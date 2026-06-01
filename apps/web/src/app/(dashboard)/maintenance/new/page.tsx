import { serverApi } from '@web/lib/api/endpoints-server';
import { NewMaintenanceTicketClient } from './new-ticket-client';

export default async function NewMaintenanceTicketPage() {
  let properties: Awaited<ReturnType<typeof serverApi.properties.list>>['items'] = [];
  let serverError: string | null = null;

  try {
    const page = await serverApi.properties.list({ limit: '100' });
    properties = page.items;
  } catch (e) {
    serverError = e instanceof Error ? e.message : 'Failed to load properties';
  }

  return (
    <NewMaintenanceTicketClient properties={properties} serverError={serverError} />
  );
}
