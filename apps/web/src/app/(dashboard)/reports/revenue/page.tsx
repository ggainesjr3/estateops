import { serverApi } from '@web/lib/api/endpoints-server';
import { RevenueReportClient } from './revenue-report-client';

export default async function RevenueReportPage() {
  let initialData = null;
  let serverError: string | null = null;
  const to = new Date();
  const from = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth() - 11, 1));

  try {
    initialData = await serverApi.reports.revenue({
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10),
    });
  } catch (e) {
    serverError = e instanceof Error ? e.message : 'Failed to load revenue report';
  }

  return <RevenueReportClient initialData={initialData} serverError={serverError} />;
}
