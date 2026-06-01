export interface CursorPayload {
  id: string;
  createdAt: string;
}

export function encodeCursor(id: string, createdAt: Date): string {
  const payload: CursorPayload = { id, createdAt: createdAt.toISOString() };
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

export function decodeCursor(cursor: string): CursorPayload {
  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as CursorPayload;
    if (!parsed.id || !parsed.createdAt) {
      throw new Error('Invalid cursor');
    }
    return parsed;
  } catch {
    throw new Error('Invalid cursor');
  }
}
