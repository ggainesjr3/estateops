import { serverApi } from '@web/lib/api/endpoints-server';
import { DelinquencyReportClient } from './delinquency-report-client';

export default async function DelinquencyReportPage() {
  let initialData = null;
  let serverError: string | null = null;

  try {
    initialData = await serverApi.reports.delinquency();
  } catch (e) {
    serverError = e instanceof Error ? e.message : 'Failed to load delinquency report';
  }

  return <DelinquencyReportClient initialData={initialData} serverError={serverError} />;
}
