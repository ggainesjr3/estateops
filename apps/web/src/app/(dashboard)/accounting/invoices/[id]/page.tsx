import { serverApi } from '@web/lib/api/endpoints-server';
import { InvoiceDetailClient } from './invoice-detail-client';

export default async function InvoiceDetailPage({
  params,
}: {
  params: { id: string };
}) {
  let initial = null;
  let serverError: string | null = null;
  try {
    initial = await serverApi.accounting.invoices.get(params.id);
  } catch (e) {
    serverError = e instanceof Error ? e.message : 'Invoice not found';
  }

  return (
    <InvoiceDetailClient invoiceId={params.id} initialData={initial} serverError={serverError} />
  );
}
