import { serverApi } from '@web/lib/api/endpoints-server';
import { RentRollClient } from './rent-roll-client';

export default async function RentRollPage() {
  let initial: Awaited<ReturnType<typeof serverApi.accounting.rentRoll>> | null = null;
  let serverError: string | null = null;
  try {
    initial = await serverApi.accounting.rentRoll();
  } catch (e) {
    serverError = e instanceof Error ? e.message : 'Failed to load rent roll';
  }

  return <RentRollClient initialData={initial} serverError={serverError} />;
}
