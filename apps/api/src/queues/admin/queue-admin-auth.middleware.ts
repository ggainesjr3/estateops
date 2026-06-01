import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import type { NextFunction, Request, Response } from 'express';
import { MembershipRole, type JwtAccessPayload } from '@estateops/shared';
import { Repository } from 'typeorm';
import { OrganizationMembership } from '../../modules/organization-memberships/entities/organization-membership.entity';

const BEARER_PREFIX = 'Bearer ';
const ADMIN_ROLES: MembershipRole[] = [
  MembershipRole.SUPER_ADMIN,
  MembershipRole.ORG_ADMIN,
];

@Injectable()
export class QueueAdminAuthMiddleware implements NestMiddleware {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(OrganizationMembership)
    private readonly memberships: Repository<OrganizationMembership>,
  ) {}

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const token = this.extractBearerToken(req);
      if (!token) {
        throw new UnauthorizedException('Admin authentication required');
      }

      const payload = this.jwtService.verify<JwtAccessPayload>(token, {
        secret: this.configService.get<string>('jwt.secret'),
      });
      if (!payload.org_id || !payload.sub) {
        throw new UnauthorizedException('Invalid token claims');
      }

      const membership = await this.memberships.findOne({
        where: {
          orgId: payload.org_id,
          userId: payload.sub,
          isActive: true,
        },
      });

      if (!membership || !ADMIN_ROLES.includes(membership.role)) {
        throw new ForbiddenException('Admin queue access denied');
      }

      next();
    } catch (err) {
      if (err instanceof UnauthorizedException || err instanceof ForbiddenException) {
        res.status(err.getStatus()).json({ message: err.message });
        return;
      }
      res.status(401).json({ message: 'Unauthorized' });
    }
  }

  private extractBearerToken(req: Request): string | undefined {
    const header = req.headers.authorization;
    if (!header?.startsWith(BEARER_PREFIX)) return undefined;
    const token = header.slice(BEARER_PREFIX.length).trim();
    return token.length > 0 ? token : undefined;
  }
}
