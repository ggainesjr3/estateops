'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import {
  ActivityTimeline,
  AiClassificationCard,
  AssignPanel,
  AttachmentsGrid,
  TicketActionButtons,
  TicketDetailHeader,
  VendorInvoicesSection,
} from '@web/components/maintenance/ticket-detail-panels';
import { Button } from '@web/components/ui/button';
import { api } from '@web/lib/api/endpoints';
import type { MaintenanceTicketDetail, MaintenanceTicketStatus } from '@web/lib/api/types';
import {
  useApproveVendorInvoice,
  useAssignMaintenanceTicket,
  useMaintenanceTicket,
  usePayVendorInvoice,
  useTransitionMaintenanceTicket,
} from '@web/lib/queries/use-maintenance';
import { useVendorsList } from '@web/lib/queries/use-vendors';
import { useMaintenanceRealtime } from '@web/lib/realtime/use-maintenance-realtime';
import { useUiStore } from '@web/stores/ui-store';

export function MaintenanceTicketDetailClient({
  ticketId,
  initialTicket,
  serverError,
}: {
  ticketId: string;
  initialTicket: MaintenanceTicketDetail | null;
  serverError: string | null;
}) {
  const token = useUiStore((s) => s.accessToken);
  const { data: ticket, isLoading, error } = useMaintenanceTicket(
    ticketId,
    initialTicket ?? undefined,
  );
  const { data: vendors = [] } = useVendorsList({}, {});
  const transition = useTransitionMaintenanceTicket(ticketId);
  const assign = useAssignMaintenanceTicket(ticketId);
  const approve = useApproveVendorInvoice(ticketId);
  const pay = usePayVendorInvoice(ticketId);

  useMaintenanceRealtime(ticketId);

  const handleDownload = async (attachmentId: string, fileName: string) => {
    const att = ticket?.attachments.find((a) => a.id === attachmentId);
    if (att?.storageUrl) {
      window.open(att.storageUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    try {
      const dl = await api.documents.download(attachmentId, token ?? undefined);
      window.open(dl.downloadUrl, '_blank', 'noopener,noreferrer');
    } catch {
      window.open(fileName, '_blank');
    }
  };

  if (isLoading && !ticket) {
    return <p className="text-sm text-muted-foreground">Loading ticket…</p>;
  }

  if (!ticket) {
    return (
      <p className="text-sm text-destructive">
        {error?.message ?? serverError ?? 'Ticket not found'}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" className="-ml-2 w-fit" asChild>
        <Link href="/maintenance">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to board
        </Link>
      </Button>

      <TicketDetailHeader ticket={ticket} />

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Actions</h2>
        <TicketActionButtons
          ticket={ticket}
          loading={transition.isPending}
          onTransition={(status: MaintenanceTicketStatus, note?: string) =>
            transition.mutate({ status, note })
          }
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <AssignPanel
          vendors={vendors}
          vendorId={ticket.assignedVendorId}
          staffId={ticket.assignedStaffId}
          loading={assign.isPending}
          onAssignVendor={(vendorId) =>
            assign.mutate({ vendorId, staffId: ticket.assignedStaffId })
          }
          onAssignStaff={(staffId) =>
            assign.mutate({ vendorId: ticket.assignedVendorId, staffId })
          }
        />
        <AiClassificationCard ai={ticket.aiClassification} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ActivityTimeline updates={ticket.updates} />
        <AttachmentsGrid
          attachments={ticket.attachments}
          onDownload={handleDownload}
        />
      </div>

      <VendorInvoicesSection
        invoices={ticket.vendorInvoices}
        loading={approve.isPending || pay.isPending}
        onApprove={(invoiceId) => approve.mutate(invoiceId)}
        onPay={(invoiceId) => pay.mutate(invoiceId)}
      />
    </div>
  );
}
