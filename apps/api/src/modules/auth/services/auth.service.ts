import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { AuditLogService } from '../../audit-logs/audit-log.service';
import { AuthProvider } from '../entities/auth-provider.entity';
import { RefreshToken } from '../entities/refresh-token.entity';
import { User } from '../../users/entities/user.entity';
import { OrganizationMembership } from '../../organization-memberships/entities/organization-membership.entity';
import { AuthProviderType, MembershipRole } from '@estateops/shared';
import { TokenService } from './token.service';
import type { GoogleProfileUser } from '../../../auth/strategies/google.strategy';
import type { AuthMembershipDto, AuthSuccessDto, AuthUserDto } from '../dto/auth.dto';

export interface AuthResult {
  user: AuthUserDto;
  membership: AuthMembershipDto;
  accessToken: string;
  refreshToken: string;
  csrfToken: string;
  refreshTokenId: string;
}

function normalizeRole(role: unknown): MembershipRole | undefined {
  if (typeof role !== 'string') return undefined;
  const v = role as MembershipRole;
  if (!Object.values(MembershipRole).includes(v)) return undefined;
  return v;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @InjectRepository(AuthProvider)
    private readonly providers: Repository<AuthProvider>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokens: Repository<RefreshToken>,
    @InjectRepository(OrganizationMembership)
    private readonly memberships: Repository<OrganizationMembership>,
    private readonly tokens: TokenService,
    private readonly config: ConfigService,
    private readonly auditLog: AuditLogService,
  ) {}

  async register(input: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    orgId?: string;
    role?: MembershipRole | string;
  }): Promise<AuthResult> {
    const existing = await this.users.findOne({ where: { email: input.email } });
    if (existing) throw new BadRequestException('Email already registered');

    const saltRounds = parseInt(
      this.config.get<string>('auth.bcryptSaltRounds') ?? '10',
      10,
    );
    const passwordHash = await bcrypt.hash(input.password, saltRounds);

    const user = await this.users.save(
      this.users.create({
        email: input.email,
        passwordHash,
        firstName: input.firstName.trim() || 'User',
        lastName: input.lastName.trim() || 'Account',
        avatarUrl: null,
        phone: null,
        zoomUserId: null,
        isActive: true,
        mfaEnabled: false,
      }),
    );

    return this.issueForUser(user.id, user.email, {
      orgId: input.orgId,
      role: normalizeRole(input.role) ?? this.defaultRole(),
      actionForAudit: { action: 'auth.login', provider: 'email' },
    });
  }

  async login(input: {
    email: string;
    password: string;
    orgId?: string;
  }): Promise<AuthResult> {
    const user = await this.users.findOne({ where: { email: input.email } });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const ok = await bcrypt.compare(input.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid email or password');

    return this.issueForUser(user.id, user.email, {
      orgId: input.orgId,
      role: undefined,
      actionForAudit: { action: 'auth.login', provider: 'password' },
    });
  }

  async refresh(input: {
    refreshToken: string;
    orgId?: string;
  }): Promise<AuthResult> {
    const tokenId = this.tokens.parseRefreshTokenId(input.refreshToken);
    if (!tokenId) throw new UnauthorizedException('Invalid refresh token');

    const row = await this.refreshTokens.findOne({
      where: { id: tokenId, revokedAt: IsNull() },
    });
    if (!row) throw new UnauthorizedException('Refresh token revoked');
    if (row.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    const valid = await this.tokens.verifyRefreshToken(
      input.refreshToken,
      row.tokenHash,
    );
    if (!valid) throw new UnauthorizedException('Invalid refresh token');

    const user = row.user;
    const userRow =
      user?.id === row.userId ? user : await this.users.findOneOrFail({ where: { id: row.userId } });

    const membership = await this.resolveMembershipForUser(
      userRow.id,
      input.orgId,
      { mustExist: true },
    );

    row.revokedAt = new Date();
    await this.refreshTokens.save(row);

    const refreshPair = await this.tokens.issueRefreshToken();
    await this.refreshTokens.save(
      this.refreshTokens.create({
        id: refreshPair.tokenId,
        userId: userRow.id,
        tokenHash: refreshPair.tokenHash,
        expiresAt: refreshPair.expiresAt,
        revokedAt: null,
      }),
    );

    const csrfToken = this.tokens.issueCsrfToken();
    const accessToken = this.tokens.signAccessToken({
      sub: userRow.id,
      email: userRow.email,
      org_id: membership.orgId,
      role: membership.role,
    });

    await this.auditLog.log({
      orgId: membership.orgId,
      userId: userRow.id,
      action: 'auth.refresh',
      entityType: 'auth_session',
      entityId: row.id,
      newValue: { refreshTokenId: refreshPair.tokenId },
    });

    return {
      user: this.toUserDto(userRow),
      membership: { orgId: membership.orgId, role: membership.role },
      accessToken,
      refreshToken: refreshPair.refreshToken,
      csrfToken,
      refreshTokenId: refreshPair.tokenId,
    };
  }

  async logout(input: { refreshToken: string; orgId?: string }): Promise<void> {
    const tokenId = this.tokens.parseRefreshTokenId(input.refreshToken);
    if (!tokenId) return;

    const row = await this.refreshTokens.findOne({
      where: { id: tokenId, revokedAt: IsNull() },
      relations: ['user'],
    });
    if (!row) return;

    const valid = await this.tokens.verifyRefreshToken(
      input.refreshToken,
      row.tokenHash,
    );
    if (!valid) return;

    row.revokedAt = new Date();
    await this.refreshTokens.save(row);

    const orgId =
      input.orgId ??
      (await this.memberships.findOne({
        where: { userId: row.userId, isActive: true },
      }))?.orgId ??
      undefined;

    await this.auditLog.log({
      orgId: orgId ?? this.config.get<string>('auth.defaultOrgId') ?? undefined,
      userId: row.userId,
      action: 'auth.logout',
      entityType: 'auth_session',
      entityId: row.id,
    });
  }

  async loginWithGoogle(
    input: GoogleProfileUser,
    orgId?: string,
  ): Promise<AuthResult> {
    if (!input.email) throw new BadRequestException('Google did not provide email');

    const [firstName, lastName] = [
      input.givenName ?? input.email.split('@')[0] ?? 'User',
      input.familyName ?? '',
    ];

    const user = (await this.users.findOne({ where: { email: input.email } })) ??
      (await this.users.save(
        this.users.create({
          email: input.email,
          passwordHash: null,
          firstName: firstName.trim() || 'User',
          lastName: lastName.trim() || 'Account',
          avatarUrl: null,
          phone: null,
          zoomUserId: null,
          isActive: true,
          mfaEnabled: false,
        }),
      ));

    const providerRow = await this.providers.findOne({
      where: {
        provider: AuthProviderType.GOOGLE,
        providerUserId: input.providerUserId,
      },
    });

    if (providerRow) {
      providerRow.userId = user.id;
      await this.providers.save(providerRow);
    } else {
      await this.providers.save(
        this.providers.create({
          userId: user.id,
          provider: AuthProviderType.GOOGLE,
          providerUserId: input.providerUserId,
          accessTokenHash: null,
        }),
      );
    }

    return this.issueForUser(user.id, user.email, {
      orgId,
      role: undefined,
      actionForAudit: { action: 'auth.login', provider: 'google' },
    });
  }

  private defaultRole(): MembershipRole {
    const role = this.config.get<string>('auth.defaultRole');
    return normalizeRole(role) ?? MembershipRole.TENANT;
  }

  private toUserDto(user: User): AuthUserDto {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl ?? null,
    };
  }

  private async resolveMembershipForUser(
    userId: string,
    preferredOrgId: string | undefined,
    opts: { mustExist: boolean },
  ): Promise<OrganizationMembership> {
    if (preferredOrgId) {
      const membership = await this.memberships.findOne({
        where: {
          userId,
          orgId: preferredOrgId,
          isActive: true,
        },
      });
      if (membership) return membership;
      if (!opts.mustExist) {
        return this.memberships.save(
          this.memberships.create({
            userId,
            orgId: preferredOrgId,
            role: this.defaultRole(),
            isActive: true,
          }),
        );
      }
      throw new ForbiddenException('User is not a member of this organization');
    }

    const defaultOrgId = this.config.get<string>('auth.defaultOrgId');
    if (defaultOrgId) {
      const membership = await this.memberships.findOne({
        where: { userId, orgId: defaultOrgId, isActive: true },
      });
      if (membership) return membership;
      if (!opts.mustExist) {
        return this.memberships.save(
          this.memberships.create({
            userId,
            orgId: defaultOrgId,
            role: this.defaultRole(),
            isActive: true,
          }),
        );
      }
    }

    const first = await this.memberships.findOne({
      where: { userId, isActive: true },
    });
    if (first) return first;

    if (opts.mustExist) {
      throw new ForbiddenException('User has no active organization memberships');
    }

    if (!defaultOrgId) throw new ForbiddenException('No default organization configured');
    return this.memberships.save(
      this.memberships.create({
        userId,
        orgId: defaultOrgId,
        role: this.defaultRole(),
        isActive: true,
      }),
    );
  }

  private async issueForUser(
    userId: string,
    email: string,
    input: {
      orgId?: string;
      role?: MembershipRole;
      actionForAudit: { action: string; provider: string };
    },
  ): Promise<AuthResult> {
    const userRow = await this.users.findOneOrFail({ where: { id: userId } });

    const membership = await this.resolveMembershipForUser(userRow.id, input.orgId, {
      mustExist: false,
    });

    const role = input.role ?? membership.role;
    if (!role) throw new ForbiddenException('No role resolved for membership');

    const accessToken = this.tokens.signAccessToken({
      sub: userRow.id,
      email,
      org_id: membership.orgId,
      role,
    });

    const refreshPair = await this.tokens.issueRefreshToken();
    await this.refreshTokens.save(
      this.refreshTokens.create({
        id: refreshPair.tokenId,
        userId: userRow.id,
        tokenHash: refreshPair.tokenHash,
        expiresAt: refreshPair.expiresAt,
        revokedAt: null,
      }),
    );

    const csrfToken = this.tokens.issueCsrfToken();

    await this.auditLog.log({
      orgId: membership.orgId,
      userId: userRow.id,
      action: input.actionForAudit.action,
      entityType: 'auth_session',
      entityId: refreshPair.tokenId,
      newValue: { provider: input.actionForAudit.provider },
    });

    return {
      user: this.toUserDto(userRow),
      membership: { orgId: membership.orgId, role: membership.role },
      accessToken,
      refreshToken: refreshPair.refreshToken,
      csrfToken,
      refreshTokenId: refreshPair.tokenId,
    };
  }
}
