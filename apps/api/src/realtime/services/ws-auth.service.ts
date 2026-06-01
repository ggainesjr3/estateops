import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import type { JwtAccessPayload } from '@estateops/shared';
import { Repository } from 'typeorm';
import type { Socket } from 'socket.io';
import { OrganizationMembership } from '../../modules/organization-memberships/entities/organization-membership.entity';
import type { WsAuthenticatedUser } from '../types/ws-connection.types';

@Injectable()
export class WsAuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    @InjectRepository(OrganizationMembership)
    private readonly memberships: Repository<OrganizationMembership>,
  ) {}

  async authenticate(socket: Socket): Promise<WsAuthenticatedUser> {
    const token = this.extractToken(socket);
    if (!token) {
      throw new UnauthorizedException('Missing WebSocket auth token');
    }

    let payload: JwtAccessPayload;
    try {
      payload = this.jwtService.verify<JwtAccessPayload>(token, {
        secret: this.config.get<string>('jwt.secret'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired WebSocket token');
    }

    const userId = payload.sub;
    const orgId = payload.org_id;
    if (!userId || !orgId) {
      throw new UnauthorizedException('Token must include sub and org_id');
    }

    const membership = await this.memberships.findOne({
      where: { userId, orgId, isActive: true },
    });
    if (!membership) {
      throw new UnauthorizedException('No active organization membership');
    }

    return {
      userId,
      orgId,
      role: membership.role,
      email: payload.email,
    };
  }

  private extractToken(socket: Socket): string | undefined {
    const auth = socket.handshake.auth as Record<string, unknown> | undefined;
    const fromAuth = auth?.token;
    if (typeof fromAuth === 'string' && fromAuth.length > 0) {
      return fromAuth;
    }
    const header = socket.handshake.headers.authorization;
    if (typeof header === 'string' && header.startsWith('Bearer ')) {
      return header.slice(7).trim();
    }
    return undefined;
  }
}
