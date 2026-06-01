import { serverApi } from '@web/lib/api/endpoints-server';
import { RentRollReportClient } from './rent-roll-report-client';

export default async function RentRollReportPage() {
  let initialData = null;
  let serverError: string | null = null;

  try {
    initialData = await serverApi.reports.rentRoll(new Date().toISOString().slice(0, 10));
  } catch (e) {
    serverError = e instanceof Error ? e.message : 'Failed to load rent roll report';
  }

  return <RentRollReportClient initialData={initialData} serverError={serverError} />;
}
