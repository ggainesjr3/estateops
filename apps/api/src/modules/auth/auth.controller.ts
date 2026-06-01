import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { Public } from '../../auth/decorators/public.decorator';
import { CsrfGuard } from './guards/csrf.guard';
import { AuthCookieNames } from './constants/auth-cookies';
import { AuthService } from './services/auth.service';
import type { GoogleProfileUser } from '../../auth/strategies/google.strategy';
import {
  AuthSuccessDto,
  LoginDto,
  RefreshDto,
  RegisterDto,
} from './dto/auth.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  private refreshCookieOptions(expires?: Date) {
    return {
      httpOnly: true,
      secure: this.config.get<boolean>('auth.cookie.secure') ?? false,
      sameSite: (this.config.get<string>('auth.cookie.sameSite') ?? 'lax') as
        | 'lax'
        | 'strict'
        | 'none',
      path: '/',
      expires,
    };
  }

  private csrfCookieOptions(expires?: Date) {
    return {
      httpOnly: false,
      secure: this.config.get<boolean>('auth.cookie.secure') ?? false,
      sameSite: (this.config.get<string>('auth.cookie.sameSite') ?? 'lax') as
        | 'lax'
        | 'strict'
        | 'none',
      path: '/',
      expires,
    };
  }

  private refreshExpiresAt(): Date {
    const days = parseInt(this.config.get<string>('auth.refreshDays') ?? '7', 10);
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }

  @Get('google')
  @Public()
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google OAuth2 (Authorization Code) login' })
  @ApiOkResponse({ description: 'Redirecting to Google' })
  async google(): Promise<void> {
    // Passport handles the redirect.
  }

  @Get('google/callback')
  @Public()
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google OAuth2 callback' })
  @ApiOkResponse({ type: AuthSuccessDto })
  async googleCallback(
    @Req() req: Request & { user?: GoogleProfileUser },
    @Res({ passthrough: true }) res: Response,
    @Query('orgId') orgId?: string,
  ): Promise<AuthSuccessDto> {
    if (!req.user) throw new UnauthorizedException('Missing Google profile');

    const result = await this.auth.loginWithGoogle(req.user, orgId);
    const expires = this.refreshExpiresAt();

    res.cookie(AuthCookieNames.refreshToken, result.refreshToken, this.refreshCookieOptions(expires));
    res.cookie(AuthCookieNames.csrfToken, result.csrfToken, this.csrfCookieOptions(expires));

    return {
      user: result.user,
      membership: result.membership,
      accessToken: result.accessToken,
      csrfToken: result.csrfToken,
    };
  }

  @Post('register')
  @Public()
  @ApiOperation({ summary: 'Register with email/password' })
  @ApiOkResponse({ type: AuthSuccessDto })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthSuccessDto> {
    const result = await this.auth.register(dto);
    const expires = this.refreshExpiresAt();

    res.cookie(AuthCookieNames.refreshToken, result.refreshToken, this.refreshCookieOptions(expires));
    res.cookie(AuthCookieNames.csrfToken, result.csrfToken, this.csrfCookieOptions(expires));

    return {
      user: result.user,
      membership: result.membership,
      accessToken: result.accessToken,
      csrfToken: result.csrfToken,
    };
  }

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email/password' })
  @ApiOkResponse({ type: AuthSuccessDto })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthSuccessDto> {
    const result = await this.auth.login(dto);
    const expires = this.refreshExpiresAt();

    res.cookie(AuthCookieNames.refreshToken, result.refreshToken, this.refreshCookieOptions(expires));
    res.cookie(AuthCookieNames.csrfToken, result.csrfToken, this.csrfCookieOptions(expires));

    return {
      user: result.user,
      membership: result.membership,
      accessToken: result.accessToken,
      csrfToken: result.csrfToken,
    };
  }

  @Post('logout')
  @Public()
  @UseGuards(CsrfGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout (revoke refresh token)' })
  @ApiOkResponse({ description: 'Logged out' })
  async logout(
    @Body() dto: RefreshDto,
    @Req() req: Request & { cookies?: Record<string, string> },
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ ok: true }> {
    const refreshToken = req.cookies?.[AuthCookieNames.refreshToken];
    if (refreshToken) {
      await this.auth.logout({ refreshToken, orgId: dto.orgId });
    }

    res.clearCookie(AuthCookieNames.refreshToken, this.refreshCookieOptions(undefined));
    res.clearCookie(AuthCookieNames.csrfToken, this.csrfCookieOptions(undefined));

    return { ok: true };
  }

  @Post('refresh')
  @Public()
  @UseGuards(CsrfGuard)
  @ApiOperation({ summary: 'Rotate refresh token and issue a new access token' })
  @ApiOkResponse({ type: AuthSuccessDto })
  async refresh(
    @Body() dto: RefreshDto,
    @Req() req: Request & { cookies?: Record<string, string> },
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthSuccessDto> {
    const refreshToken = req.cookies?.[AuthCookieNames.refreshToken];
    if (!refreshToken) throw new UnauthorizedException('Missing refresh token');

    const result = await this.auth.refresh({ refreshToken, orgId: dto.orgId });
    const expires = this.refreshExpiresAt();

    res.cookie(AuthCookieNames.refreshToken, result.refreshToken, this.refreshCookieOptions(expires));
    res.cookie(AuthCookieNames.csrfToken, result.csrfToken, this.csrfCookieOptions(expires));

    return {
      user: result.user,
      membership: result.membership,
      accessToken: result.accessToken,
      csrfToken: result.csrfToken,
    };
  }
}

