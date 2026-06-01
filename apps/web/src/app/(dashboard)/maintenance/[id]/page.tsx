import { serverApi } from '@web/lib/api/endpoints-server';
import { MaintenanceTicketDetailClient } from './ticket-detail-client';

export default async function MaintenanceTicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let initial: Awaited<ReturnType<typeof serverApi.maintenance.tickets.get>> | null =
    null;
  let serverError: string | null = null;

  try {
    initial = await serverApi.maintenance.tickets.get(id);
  } catch (e) {
    serverError = e instanceof Error ? e.message : 'Failed to load ticket';
  }

  return (
    <MaintenanceTicketDetailClient
      ticketId={id}
      initialTicket={initial}
      serverError={serverError}
    />
  );
}
