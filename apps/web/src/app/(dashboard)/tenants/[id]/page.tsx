import { notFound } from 'next/navigation';
import { serverApi } from '@web/lib/api/endpoints-server';
import { TenantDetailClient } from './tenant-detail-client';

export default async function TenantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  try {
    const tenant = await serverApi.tenants.get(id);
    return <TenantDetailClient tenant={tenant} />;
  } catch {
    notFound();
  }
}
