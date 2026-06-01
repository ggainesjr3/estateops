'use client';

import { format } from 'date-fns';
import { FileText } from 'lucide-react';
import { EmptyState } from '@web/components/shared/empty-state';
import { Skeleton } from '@web/components/ui/skeleton';
import { Button } from '@web/components/ui/button';
import type { DocumentRecord } from '@web/lib/api/types';
import { api } from '@web/lib/api/endpoints';
import { useUiStore } from '@web/stores/ui-store';

function formatFileSize(bytes: string): string {
  const n = Number(bytes);
  if (Number.isNaN(n)) return bytes;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function TenantDocumentsList({
  documents,
  isLoading,
}: {
  documents?: DocumentRecord[];
  isLoading: boolean;
}) {
  const token = useUiStore((s) => s.accessToken);

  async function handleDownload(doc: DocumentRecord) {
    const dl = await api.documents.download(doc.id, token ?? undefined);
    window.open(dl.downloadUrl, '_blank', 'noopener,noreferrer');
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (!documents?.length) {
    return (
      <EmptyState
        title="No documents"
        description="Leases, IDs, and other files linked to this tenant will appear here."
      />
    );
  }

  return (
    <ul className="divide-y rounded-md border">
      {documents.map((doc) => (
        <li
          key={doc.id}
          className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm"
        >
          <div className="flex min-w-0 items-start gap-3">
            <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <p className="truncate font-medium">{doc.fileName}</p>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(doc.fileSize)} ·{' '}
                {format(new Date(doc.createdAt), 'MMM d, yyyy')}
              </p>
            </div>
          </div>
          <Button type="button" size="sm" variant="outline" onClick={() => handleDownload(doc)}>
            Download
          </Button>
        </li>
      ))}
    </ul>
  );
}
