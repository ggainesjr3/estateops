import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MembershipRole } from '@estateops/shared';
import { Repository } from 'typeorm';
import type { Socket } from 'socket.io';
import { Property } from '../../modules/properties/entities/property.entity';
import { Tenant } from '../../modules/tenants/entities/tenant.entity';
import type { WsAuthenticatedUser } from '../types/ws-connection.types';

export function userRoom(userId: string): string {
  return `user:${userId}`;
}

export function orgRoom(orgId: string): string {
  return `org:${orgId}`;
}

export function propertyRoom(propertyId: string): string {
  return `property:${propertyId}`;
}

export function tenantRoom(tenantId: string): string {
  return `tenant:${tenantId}`;
}

@Injectable()
export class WsRoomService {
  constructor(
    @InjectRepository(Property)
    private readonly properties: Repository<Property>,
    @InjectRepository(Tenant)
    private readonly tenants: Repository<Tenant>,
  ) {}

  async resolveRooms(user: WsAuthenticatedUser): Promise<string[]> {
    const rooms = new Set<string>([userRoom(user.userId), orgRoom(user.orgId)]);

    if (user.role === MembershipRole.PROPERTY_MANAGER) {
      const propertyIds = await this.listManagedPropertyIds(user.orgId);
      for (const propertyId of propertyIds) {
        rooms.add(propertyRoom(propertyId));
      }
    }

    if (user.role === MembershipRole.TENANT) {
      const tenant = await this.tenants.findOne({
        where: { orgId: user.orgId, userId: user.userId },
      });
      if (tenant) {
        user.tenantId = tenant.id;
        rooms.add(tenantRoom(tenant.id));
      }
    }

    return [...rooms];
  }

  async joinRooms(socket: Socket, user: WsAuthenticatedUser): Promise<string[]> {
    const rooms = await this.resolveRooms(user);
    await socket.join(rooms);
    return rooms;
  }

  /** All org properties for PMs until per-manager assignment exists. */
  private async listManagedPropertyIds(orgId: string): Promise<string[]> {
    const rows = await this.properties.find({
      where: { orgId },
      select: ['id'],
    });
    return rows.map((p) => p.id);
  }
}
