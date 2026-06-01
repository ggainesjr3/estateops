import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { JwtAccessPayload } from '@estateops/shared';
import { JwtAccessPayload as JwtAccessPayloadType } from '@estateops/shared';
import type { MembershipRole } from '@estateops/shared';

export interface JwtAccessUser {
  userId: string;
  email?: string;
  orgId: string;
  role?: MembershipRole | string;
}

@Injectable()
export class JwtAccessStrategy extends PassportStrategy(Strategy, 'jwt-access') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.getOrThrow<string>('jwt.secret'),
      ignoreExpiration: false,
    });
  }

  async validate(payload: JwtAccessPayloadType & { role?: MembershipRole | string; orgId?: string }): Promise<JwtAccessUser> {
    const userId = payload.sub;
    const orgId = payload.orgId ?? payload.org_id;
    if (!userId || !orgId) {
      throw new UnauthorizedException('Invalid JWT payload');
    }
    return {
      userId,
      email: payload.email,
      orgId,
      role: payload.role,
    };
  }
}

