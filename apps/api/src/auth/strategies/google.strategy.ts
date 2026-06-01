import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Strategy, Profile } from 'passport-google-oauth20';

export interface GoogleProfileUser {
  provider: 'google';
  providerUserId: string;
  email: string;
  emailVerified?: boolean;
  givenName?: string;
  familyName?: string;
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(config: ConfigService) {
    super({
      clientID: config.getOrThrow<string>('auth.google.clientId'),
      clientSecret: config.getOrThrow<string>('auth.google.clientSecret'),
      callbackURL: config.getOrThrow<string>('auth.google.callbackUrl'),
      scope: (config.get<string>('auth.google.scope') ?? 'profile email').split(' '),
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: (err: unknown, user?: GoogleProfileUser) => void,
  ): Promise<void> {
    const email = profile.emails?.[0]?.value;
    if (!email) {
      return done(new Error('Google profile did not include an email'));
    }

    const emailVerified =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (profile as any)?._json?.email_verified ?? undefined;

    const givenName =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (profile as any)?._json?.given_name ?? profile.name?.givenName ?? undefined;
    const familyName =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (profile as any)?._json?.family_name ?? profile.name?.familyName ?? undefined;

    done(null, {
      provider: 'google',
      providerUserId: profile.id,
      email,
      emailVerified,
      givenName,
      familyName,
    });
  }
}

