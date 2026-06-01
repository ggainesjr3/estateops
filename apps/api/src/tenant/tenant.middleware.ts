import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { NextFunction, Request, Response } from 'express';
import type { JwtAccessPayload } from '@estateops/shared';
import { TenantContext } from './tenant.context';

const BEARER_PREFIX = 'Bearer ';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  use(req: Request, _res: Response, next: NextFunction): void {
    const token = this.extractBearerToken(req);
    if (!token) {
      throw new UnauthorizedException('Missing or invalid authorization token');
    }

    let payload: JwtAccessPayload;
    try {
      payload = this.jwtService.verify<JwtAccessPayload>(token, {
        secret: this.configService.get<string>('jwt.secret'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const orgId = payload.org_id;
    const userId = payload.sub;
    if (!orgId || !userId) {
      throw new UnauthorizedException('Token must include org_id and sub claims');
    }

    this.assertOrgIdMatches(req, orgId);
    TenantContext.run({ orgId, userId }, () => next());
  }

  private extractBearerToken(req: Request): string | undefined {
    const header = req.headers.authorization;
    if (!header?.startsWith(BEARER_PREFIX)) {
      return undefined;
    }
    const token = header.slice(BEARER_PREFIX.length).trim();
    return token.length > 0 ? token : undefined;
  }

  private assertOrgIdMatches(req: Request, tokenOrgId: string): void {
    const candidates = [
      this.asString(req.headers['x-org-id']),
      this.asString(req.params?.orgId),
      this.asString(req.params?.org_id),
      this.asString(req.query?.orgId),
      this.asString(req.query?.org_id),
    ];

    for (const value of candidates) {
      if (value !== undefined && value !== tokenOrgId) {
        throw new UnauthorizedException('Organization context mismatch');
      }
    }
  }

  private asString(value: unknown): string | undefined {
    if (typeof value === 'string') {
      return value;
    }
    if (Array.isArray(value) && typeof value[0] === 'string') {
      return value[0];
    }
    return undefined;
  }
}
