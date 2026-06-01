'use client';

import Link from 'next/link';
import type { MaintenanceTicketListItem } from '@web/lib/api/types';
import { PriorityBadge } from './priority-badge';
import { SlaIndicator } from './sla-indicator';
import { TradeIcon } from './trade-icon';

export function TicketKanbanCard({ ticket }: { ticket: MaintenanceTicketListItem }) {
  return (
    <Link
      href={`/maintenance/${ticket.id}`}
      className="block rounded-lg border bg-card p-3 shadow-sm transition-shadow hover:shadow-md active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="line-clamp-2 text-sm font-medium leading-snug">{ticket.title}</p>
        <TradeIcon trade={ticket.trade} className="shrink-0" />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <PriorityBadge priority={ticket.priority} />
        <SlaIndicator slaDueAt={ticket.slaDueAt} status={ticket.status} compact />
      </div>
      {ticket.vendorName && (
        <p className="mt-2 truncate text-xs text-muted-foreground">{ticket.vendorName}</p>
      )}
    </Link>
  );
}
