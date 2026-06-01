import { serverApi } from '@web/lib/api/endpoints-server';
import { MaintenanceReportClient } from './maintenance-report-client';

export default async function MaintenanceReportPage() {
  let initialData = null;
  let serverError: string | null = null;
  const to = new Date();
  const from = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth() - 11, 1));

  try {
    initialData = await serverApi.reports.maintenance({
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10),
    });
  } catch (e) {
    serverError = e instanceof Error ? e.message : 'Failed to load maintenance report';
  }

  return <MaintenanceReportClient initialData={initialData} serverError={serverError} />;
}
