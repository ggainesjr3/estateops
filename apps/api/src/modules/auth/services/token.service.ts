import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { randomBytes, randomUUID } from 'crypto';
import type { MembershipRole } from '@estateops/shared';

export interface AccessTokenPayload {
  sub: string;
  email?: string;
  org_id: string;
  orgId: string;
  role: MembershipRole;
}

export interface RefreshTokenPair {
  tokenId: string;
  refreshToken: string;
  tokenHash: string;
  expiresAt: Date;
}

@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  signAccessToken(payload: Omit<AccessTokenPayload, 'orgId'>): string {
    return this.jwt.sign({
      ...payload,
      orgId: payload.org_id,
    });
  }

  async issueRefreshToken(): Promise<RefreshTokenPair> {
    const days = parseInt(this.config.get<string>('auth.refreshDays') ?? '7', 10);
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    const tokenId = randomUUID();
    const randomPart = randomBytes(32).toString('base64url');
    const refreshToken = `${tokenId}.${randomPart}`;

    const saltRounds = parseInt(this.config.get<string>('auth.bcryptSaltRounds') ?? '10', 10);
    const tokenHash = await bcrypt.hash(refreshToken, saltRounds);

    return { tokenId, refreshToken, tokenHash, expiresAt };
  }

  async verifyRefreshToken(
    rawRefreshToken: string,
    tokenHash: string,
  ): Promise<boolean> {
    return bcrypt.compare(rawRefreshToken, tokenHash);
  }

  parseRefreshTokenId(rawRefreshToken: string): string | null {
    const [tokenId] = rawRefreshToken.split('.');
    if (!tokenId || tokenId.length < 10) return null;
    return tokenId;
  }

  issueCsrfToken(): string {
    return randomBytes(32).toString('base64url');
  }
}

