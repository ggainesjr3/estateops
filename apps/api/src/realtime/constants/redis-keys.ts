export const wsRedisKeys = {
  socketMeta: (socketId: string) => `ws:socket:${socketId}`,
  userSockets: (userId: string) => `ws:user:${userId}:sockets`,
  presenceOrg: (orgId: string) => `presence:org:${orgId}`,
} as const;

export const WS_SOCKET_META_TTL_SEC = 86_400;
