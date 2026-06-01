'use client';

import { useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { getApiBaseUrl } from '@web/lib/api/config';
import { useUiStore } from '@web/stores/ui-store';

const MAX_BACKOFF_MS = 30_000;
const INITIAL_BACKOFF_MS = 1_000;

function getWsUrl(): string {
  if (process.env.NEXT_PUBLIC_WS_URL) {
    return process.env.NEXT_PUBLIC_WS_URL;
  }
  const api = getApiBaseUrl();
  return api.replace(/\/api\/v1\/?$/, '');
}

type SocketListener = {
  event: string;
  handler: (...args: unknown[]) => void;
};

let sharedSocket: Socket | null = null;
let sharedToken: string | null = null;
let connectGeneration = 0;
const listeners = new Set<SocketListener>();

function attachListener(socket: Socket, listener: SocketListener): void {
  socket.on(listener.event, listener.handler);
}

function detachListener(socket: Socket, listener: SocketListener): void {
  socket.off(listener.event, listener.handler);
}

function ensureSocket(token: string): Socket {
  if (sharedSocket && sharedToken === token) {
    return sharedSocket;
  }

  sharedSocket?.disconnect();
  sharedSocket = io(getWsUrl(), {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: INITIAL_BACKOFF_MS,
    reconnectionDelayMax: MAX_BACKOFF_MS,
    randomizationFactor: 0.3,
  });
  sharedToken = token;

  for (const listener of listeners) {
    attachListener(sharedSocket, listener);
  }

  return sharedSocket;
}

export function subscribeWsEvent(
  event: string,
  handler: (...args: unknown[]) => void,
): () => void {
  const listener: SocketListener = { event, handler };
  listeners.add(listener);
  if (sharedSocket) {
    attachListener(sharedSocket, listener);
  }
  return () => {
    listeners.delete(listener);
    if (sharedSocket) {
      detachListener(sharedSocket, listener);
    }
  };
}

export function useWebSocket(): {
  socket: Socket | null;
  connected: boolean;
} {
  const token = useUiStore((s) => s.accessToken);
  const [connected, setConnected] = useState(false);
  const generationRef = useRef(0);

  useEffect(() => {
    if (!token) {
      sharedSocket?.disconnect();
      sharedSocket = null;
      sharedToken = null;
      setConnected(false);
      return;
    }

    const generation = ++connectGeneration;
    generationRef.current = generation;
    const socket = ensureSocket(token);

    const onConnect = () => {
      if (generationRef.current === generation) setConnected(true);
    };
    const onDisconnect = () => {
      if (generationRef.current === generation) setConnected(false);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    setConnected(socket.connected);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, [token]);

  return { socket: token ? sharedSocket : null, connected };
}
