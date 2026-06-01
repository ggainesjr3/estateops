import { registerAs } from '@nestjs/config';
import { AuthProviderType, MembershipRole } from '@estateops/shared';

export default registerAs('auth', () => ({
  defaultOrgId: process.env.AUTH_DEFAULT_ORG_ID ?? '',
  defaultRole: (process.env.AUTH_DEFAULT_ROLE ?? MembershipRole.TENANT) as MembershipRole,

  refreshDays: process.env.AUTH_REFRESH_DAYS ?? '7',
  bcryptSaltRounds: process.env.AUTH_BCRYPT_SALT_ROUNDS ?? '10',

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID ?? '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    callbackUrl: process.env.GOOGLE_CALLBACK_URL ?? '',
    scope: process.env.GOOGLE_OAUTH_SCOPE ?? 'profile email',
  },

  successRedirectUrl: process.env.AUTH_SUCCESS_REDIRECT_URL ?? '/',

  cookie: {
    secure: process.env.COOKIE_SECURE === 'true',
    sameSite: (process.env.COOKIE_SAMESITE ?? 'lax') as 'lax' | 'strict' | 'none',
  },

  googleProviderType: AuthProviderType.GOOGLE,
}));

