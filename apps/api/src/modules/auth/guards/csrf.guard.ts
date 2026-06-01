import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { AuthCookieNames } from '../constants/auth-cookies';
import type { Request } from 'express';

type CsrfReq = Request & {
  cookies?: Record<string, string | undefined>;
  headers: {
    [key: string]: unknown;
    'x-csrf-token'?: string;
  };
};

@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<CsrfReq>();
    const csrfCookie = req.cookies?.[AuthCookieNames.csrfToken];
    const csrfHeader = req.headers['x-csrf-token'];

    if (!csrfCookie || typeof csrfCookie !== 'string') {
      throw new ForbiddenException('Missing CSRF cookie');
    }
    if (!csrfHeader || typeof csrfHeader !== 'string') {
      throw new ForbiddenException('Missing CSRF header');
    }

    if (csrfCookie !== csrfHeader) {
      throw new ForbiddenException('Invalid CSRF token');
    }

    return true;
  }
}

