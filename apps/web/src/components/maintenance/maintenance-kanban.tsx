'use client';

import { useEffect, useRef, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { MaintenanceTicketStatus } from '@web/lib/api/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@web/components/ui/dialog';
import { Button } from '@web/components/ui/button';
import { Input } from '@web/components/ui/input';
import { Label } from '@web/components/ui/label';
import type { MaintenanceTicketListItem } from '@web/lib/api/types';
import {
  KANBAN_STATUSES,
  STATUS_LABELS,
  canTransition,
  requiresReopenNote,
} from '@web/lib/maintenance-state-machine';
import { useIsMobile } from '@web/lib/hooks/use-is-mobile';
import { TicketKanbanCard } from './ticket-kanban-card';

function SortableTicket({
  ticket,
}: {
  ticket: MaintenanceTicketListItem;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: ticket.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
      {...attributes}
      {...listeners}
      className="touch-manipulation"
    >
      <TicketKanbanCard ticket={ticket} />
    </div>
  );
}

function KanbanColumn({
  status,
  tickets,
  className,
}: {
  status: MaintenanceTicketStatus;
  tickets: MaintenanceTicketListItem[];
  className?: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col rounded-lg border bg-muted/30 ${className ?? ''} ${
        isOver ? 'ring-2 ring-primary/40' : ''
      }`}
    >
      <div className="sticky top-0 z-10 border-b bg-muted/50 px-3 py-2">
        <h3 className="text-sm font-semibold">{STATUS_LABELS[status]}</h3>
        <p className="text-xs text-muted-foreground">{tickets.length}</p>
      </div>
      <SortableContext items={tickets.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="flex min-h-[120px] flex-col gap-2 p-2">
          {tickets.map((t) => (
            <SortableTicket key={t.id} ticket={t} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

function MobileKanbanBoard({
  byStatus,
}: {
  byStatus: Record<MaintenanceTicketStatus, MaintenanceTicketListItem[]>;
}) {
  const [columnIndex, setColumnIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const status = KANBAN_STATUSES[columnIndex]!;

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ left: columnIndex * el.clientWidth, behavior: 'smooth' });
  }, [columnIndex]);

  function onScroll() {
    const el = scrollRef.current;
    if (!el || !el.clientWidth) return;
    const index = Math.round(el.scrollLeft / el.clientWidth);
    if (index !== columnIndex && index >= 0 && index < KANBAN_STATUSES.length) {
      setColumnIndex(index);
    }
  }

  return (
    <div className="space-y-3 md:hidden">
      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={columnIndex === 0}
          onClick={() => setColumnIndex((i) => Math.max(0, i - 1))}
          aria-label="Previous column"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0 flex-1 text-center">
          <p className="truncate text-sm font-semibold">{STATUS_LABELS[status]}</p>
          <p className="text-xs text-muted-foreground">
            {columnIndex + 1} of {KANBAN_STATUSES.length} · {byStatus[status].length} tickets
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={columnIndex === KANBAN_STATUSES.length - 1}
          onClick={() => setColumnIndex((i) => Math.min(KANBAN_STATUSES.length - 1, i + 1))}
          aria-label="Next column"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {KANBAN_STATUSES.map((colStatus) => (
          <div key={colStatus} className="w-full shrink-0 snap-center pr-0">
            <div className="flex flex-col gap-2">
              {byStatus[colStatus].length === 0 ? (
                <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  No tickets in {STATUS_LABELS[colStatus]}
                </p>
              ) : (
                byStatus[colStatus].map((ticket) => (
                  <TicketKanbanCard key={ticket.id} ticket={ticket} />
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-center gap-1.5">
        {KANBAN_STATUSES.map((colStatus, i) => (
          <button
            key={colStatus}
            type="button"
            aria-label={STATUS_LABELS[colStatus]}
            className={`h-2 w-2 rounded-full transition-colors ${
              i === columnIndex ? 'bg-primary' : 'bg-muted-foreground/30'
            }`}
            onClick={() => setColumnIndex(i)}
          />
        ))}
      </div>
    </div>
  );
}

export function MaintenanceKanban({
  tickets,
  onTransition,
}: {
  tickets: MaintenanceTicketListItem[];
  onTransition: (ticketId: string, status: MaintenanceTicketStatus, note?: string) => void;
}) {
  const isMobile = useIsMobile();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pending, setPending] = useState<{
    ticket: MaintenanceTicketListItem;
    to: MaintenanceTicketStatus;
  } | null>(null);
  const [note, setNote] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const byStatus = KANBAN_STATUSES.reduce(
    (acc, s) => {
      acc[s] = tickets.filter((t) => t.status === s);
      return acc;
    },
    {} as Record<MaintenanceTicketStatus, MaintenanceTicketListItem[]>,
  );

  const activeTicket = activeId ? tickets.find((t) => t.id === activeId) : null;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const ticket = tickets.find((t) => t.id === event.active.id);
    const overId = String(event.over?.id ?? '');
    let toStatus: MaintenanceTicketStatus | undefined;
    if (KANBAN_STATUSES.includes(overId as MaintenanceTicketStatus)) {
      toStatus = overId as MaintenanceTicketStatus;
    } else {
      toStatus = tickets.find((t) => t.id === overId)?.status;
    }
    if (!ticket || !toStatus || ticket.status === toStatus) return;
    if (!canTransition(ticket.status, toStatus)) return;
    setPending({ ticket, to: toStatus });
    setNote('');
  };

  const confirm = () => {
    if (!pending) return;
    onTransition(
      pending.ticket.id,
      pending.to,
      requiresReopenNote(pending.ticket.status, pending.to) ? note : undefined,
    );
    setPending(null);
  };

  return (
    <>
      {isMobile ? (
        <MobileKanbanBoard byStatus={byStatus} />
      ) : (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex gap-3 overflow-x-auto pb-4">
            {KANBAN_STATUSES.map((status) => (
              <KanbanColumn
                key={status}
                status={status}
                tickets={byStatus[status]}
                className="min-w-[260px] max-w-[280px] flex-1"
              />
            ))}
          </div>
          <DragOverlay>
            {activeTicket ? (
              <div className="w-[260px] rotate-2 opacity-90">
                <TicketKanbanCard ticket={activeTicket} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      <Dialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm status change</DialogTitle>
            <DialogDescription>
              Move &ldquo;{pending?.ticket.title}&rdquo; from{' '}
              {pending && STATUS_LABELS[pending.ticket.status]} to{' '}
              {pending && STATUS_LABELS[pending.to]}?
            </DialogDescription>
          </DialogHeader>
          {pending && requiresReopenNote(pending.ticket.status, pending.to) && (
            <div className="space-y-2">
              <Label htmlFor="reopen-note">Reopen note (required)</Label>
              <Input
                id="reopen-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Reason for reopening"
              />
            </div>
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setPending(null)}>
              Cancel
            </Button>
            <Button onClick={confirm}>Confirm</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
