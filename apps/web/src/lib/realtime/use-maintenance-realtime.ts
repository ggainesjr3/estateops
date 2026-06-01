'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { WsServerEvents, type MaintenanceUpdatedPayload } from '@web/lib/realtime/ws-events';
import { subscribeWsEvent, useWebSocket } from '@web/lib/realtime/use-websocket';
import { queryKeys } from '@web/lib/queries/keys';

const CHANNEL_NAME = 'estateops-maintenance';

export function broadcastMaintenanceUpdate(ticketId?: string): void {
  if (typeof BroadcastChannel === 'undefined') return;
  const ch = new BroadcastChannel(CHANNEL_NAME);
  ch.postMessage({ type: 'ticket.updated', ticketId });
  ch.close();
}

function invalidateMaintenance(
  qc: ReturnType<typeof useQueryClient>,
  ticketId?: string,
  eventTicketId?: string,
): void {
  if (ticketId && eventTicketId && eventTicketId !== ticketId) return;
  qc.invalidateQueries({ queryKey: queryKeys.maintenance.all });
  if (ticketId) {
    qc.invalidateQueries({ queryKey: queryKeys.maintenance.detail(ticketId) });
  } else if (eventTicketId) {
    qc.invalidateQueries({ queryKey: queryKeys.maintenance.detail(eventTicketId) });
  }
}

export function useMaintenanceRealtime(ticketId?: string): void {
  const qc = useQueryClient();
  useWebSocket();

  useEffect(() => {
    const invalidate = (eventTicketId?: string) =>
      invalidateMaintenance(qc, ticketId, eventTicketId);

    const unsubWsUpdated = subscribeWsEvent(
      WsServerEvents.MAINTENANCE_UPDATED,
      (payload: unknown) => {
        const data = payload as MaintenanceUpdatedPayload;
        invalidate(data.ticketId);
      },
    );
    const unsubWsAssigned = subscribeWsEvent(
      WsServerEvents.MAINTENANCE_ASSIGNED,
      (payload: unknown) => {
        const data = payload as { ticketId?: string };
        invalidate(data.ticketId);
      },
    );

    let channel: BroadcastChannel | undefined;
    if (typeof BroadcastChannel !== 'undefined') {
      channel = new BroadcastChannel(CHANNEL_NAME);
      channel.onmessage = (ev: MessageEvent<{ type: string; ticketId?: string }>) => {
        if (ev.data?.type === 'ticket.updated') {
          invalidate(ev.data.ticketId);
        }
      };
    }

    const poll =
      process.env.NEXT_PUBLIC_WS_URL || process.env.NEXT_PUBLIC_API_URL
        ? undefined
        : setInterval(() => invalidate(), 20_000);

    return () => {
      unsubWsUpdated();
      unsubWsAssigned();
      channel?.close();
      if (poll) clearInterval(poll);
    };
  }, [qc, ticketId]);
}
