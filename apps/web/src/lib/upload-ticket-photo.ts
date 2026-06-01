import { api } from '@web/lib/api/endpoints';

export async function uploadTicketPhoto(
  ticketId: string,
  propertyId: string,
  file: File,
  token?: string,
): Promise<void> {
  const session = await api.documents.uploadUrl(
    {
      entityType: 'maintenance_ticket',
      entityId: ticketId,
      propertyId,
      fileName: file.name,
      mimeType: file.type || 'application/octet-stream',
    },
    token,
  );

  const put = await fetch(session.uploadUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
  });
  if (!put.ok) {
    throw new Error(`Upload failed (${put.status})`);
  }

  const storageItemId = `${session.folderPath}/${session.fileName}`;
  const doc = await api.documents.register(
    {
      entityType: 'maintenance_ticket',
      entityId: ticketId,
      propertyId,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type || 'application/octet-stream',
      storageItemId,
      webUrl: session.uploadUrl.split('?')[0],
    },
    token,
  );

  const download = await api.documents.download(doc.id, token);
  const storageProvider = session.provider === 's3' ? 's3' : 'sharepoint';

  await api.maintenance.tickets.addAttachment(
    ticketId,
    {
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type || 'application/octet-stream',
      storageUrl: download.downloadUrl,
      storageProvider,
    },
    token,
  );
}
