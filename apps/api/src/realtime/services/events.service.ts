import { Injectable, Logger } from '@nestjs/common';
import type { Server } from 'socket.io';
import {
  orgRoom,
  propertyRoom,
  userRoom,
} from './ws-room.service';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);
  private server: Server | null = null;

  setServer(server: Server): void {
    this.server = server;
  }

  emit(room: string, event: string, data: unknown): void {
    if (!this.server) {
      this.logger.warn(`WS server not ready; dropped ${event} → ${room}`);
      return;
    }
    this.server.to(room).emit(event, data);
  }

  emitToUser(userId: string, event: string, data: unknown): void {
    this.emit(userRoom(userId), event, data);
  }

  emitToOrg(orgId: string, event: string, data: unknown): void {
    this.emit(orgRoom(orgId), event, data);
  }

  emitToProperty(propertyId: string, event: string, data: unknown): void {
    this.emit(propertyRoom(propertyId), event, data);
  }

  emitToTenant(tenantId: string, event: string, data: unknown): void {
    this.emit(`tenant:${tenantId}`, event, data);
  }
}
