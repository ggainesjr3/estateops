'use client';

import { useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { WsClientEvents, WsServerEvents } from '@web/lib/realtime/ws-events';
import { subscribeWsEvent, useWebSocket } from '@web/lib/realtime/use-websocket';
import { queryKeys } from '@web/lib/queries/keys';

export interface NotificationRealtimePayload {
  id: string;
  channel: string;
  subject: string | null;
  body: string;
  status: string;
  priority: string;
  referenceType: string | null;
  referenceId: string | null;
  readAt: string | null;
  createdAt: string;
}

export function useNotifications(): {
  connected: boolean;
  markRead: (notificationId: string) => void;
} {
  const qc = useQueryClient();
  const { socket, connected } = useWebSocket();

  useEffect(() => {
    return subscribeWsEvent(WsServerEvents.NOTIFICATION_NEW, () => {
      qc.invalidateQueries({ queryKey: queryKeys.notifications.all });
    });
  }, [qc]);

  const markRead = useCallback(
    (notificationId: string) => {
      socket?.emit(WsClientEvents.NOTIFICATIONS_MARK_READ, { notificationId });
      qc.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
    [socket, qc],
  );

  return { connected, markRead };
}
